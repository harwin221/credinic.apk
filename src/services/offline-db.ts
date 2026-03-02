
'use client';

import { openDB, type IDBPDatabase, type DBSchema } from 'idb';
import type { RegisteredPayment } from '@/lib/types';

const DB_NAME = 'CrediNicaDB';
const DB_VERSION = 3; // Increment version to add new stores
const PENDING_PAYMENTS_STORE = 'pending_payments';
const CLIENTS_STORE = 'clients';
const CREDITS_STORE = 'credits';
const PAYMENT_PLANS_STORE = 'payment_plans';
const SYNC_INFO_STORE = 'sync_info';

interface CrediNicaDBSchema extends DBSchema {
  [PENDING_PAYMENTS_STORE]: {
    key: number;
    value: {
      creditId: string;
      paymentData: Omit<RegisteredPayment, 'id'>;
      actorId: string;
      timestamp: number;
    };
    indexes: { 'by-timestamp': number };
  };
  [CLIENTS_STORE]: {
    key: string;
    value: any;
    indexes: { 'by-name': string; 'by-cedula': string };
  };
  [CREDITS_STORE]: {
    key: string;
    value: any;
    indexes: { 'by-client': string; 'by-number': string };
  };
  [PAYMENT_PLANS_STORE]: {
    key: string; // creditId
    value: any[];
  };
  [SYNC_INFO_STORE]: {
    key: string;
    value: {
      id: string;
      lastSync: string;
      totalCredits: number;
      totalClients: number;
      gestorId: string;
    };
  };
}

let dbPromise: Promise<IDBPDatabase<CrediNicaDBSchema>> | null = null;

const getDb = (): Promise<IDBPDatabase<CrediNicaDBSchema>> => {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('IndexedDB can only be used in the browser.'));
  }
  if (!dbPromise) {
    dbPromise = openDB<CrediNicaDBSchema>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, newVersion, transaction) {
        if (!db.objectStoreNames.contains(PENDING_PAYMENTS_STORE)) {
          const store = db.createObjectStore(PENDING_PAYMENTS_STORE, {
            keyPath: 'timestamp',
          });
          store.createIndex('by-timestamp', 'timestamp');
        }
        if (!db.objectStoreNames.contains(CLIENTS_STORE)) {
          const store = db.createObjectStore(CLIENTS_STORE, { keyPath: 'id' });
          store.createIndex('by-name', 'name', { unique: false });
          store.createIndex('by-cedula', 'cedula', { unique: false });
        }
        if (!db.objectStoreNames.contains(CREDITS_STORE)) {
          const store = db.createObjectStore(CREDITS_STORE, { keyPath: 'id' });
          store.createIndex('by-client', 'clientId', { unique: false });
          store.createIndex('by-number', 'creditNumber', { unique: false });
        }
        if (!db.objectStoreNames.contains(PAYMENT_PLANS_STORE)) {
          db.createObjectStore(PAYMENT_PLANS_STORE);
        }
        if (!db.objectStoreNames.contains(SYNC_INFO_STORE)) {
          db.createObjectStore(SYNC_INFO_STORE, { keyPath: 'id' });
        }
      },
    });
  }
  return dbPromise;
};

export async function savePendingPayment(
  creditId: string,
  paymentData: Omit<RegisteredPayment, 'id'>,
  actorId: string
): Promise<void> {
  const db = await getDb();
  const tx = db.transaction(PENDING_PAYMENTS_STORE, 'readwrite');
  await tx.store.add({
    creditId,
    paymentData,
    actorId,
    timestamp: Date.now(),
  });
  await tx.done;
}

export async function getPendingPayments(): Promise<{
  creditId: string;
  paymentData: Omit<RegisteredPayment, 'id'>;
  actorId: string;
  timestamp: number;
}[]> {
  const db = await getDb();
  return db.getAll(PENDING_PAYMENTS_STORE);
}

export async function deletePendingPayment(timestamp: number): Promise<void> {
  const db = await getDb();
  await db.delete(PENDING_PAYMENTS_STORE, timestamp);
}

// Función para limpiar la base de datos en caso de conflictos de versión
export async function clearDatabase(): Promise<void> {
  if (typeof window === 'undefined') return;

  try {
    // Cerrar conexiones existentes
    if (dbPromise) {
      const db = await dbPromise;
      db.close();
      dbPromise = null;
    }

    // Eliminar la base de datos completamente
    await new Promise<void>((resolve, reject) => {
      const deleteReq = indexedDB.deleteDatabase(DB_NAME);
      deleteReq.onsuccess = () => resolve();
      deleteReq.onerror = () => reject(deleteReq.error);
      deleteReq.onblocked = () => {
        console.warn('Database deletion blocked. Please close all tabs and try again.');
        resolve(); // Continuar de todos modos
      };
    });

    console.log('Database cleared successfully');
  } catch (error) {
    console.error('Error clearing database:', error);
  }
}

// Portfolio Sync Functions
export async function saveOfflineClients(clients: any[]): Promise<void> {
  const db = await getDb();
  const tx = db.transaction(CLIENTS_STORE, 'readwrite');
  await tx.store.clear();
  for (const client of clients) {
    await tx.store.put(client);
  }
  await tx.done;
}

export async function getOfflineClients(): Promise<any[]> {
  const db = await getDb();
  return db.getAll(CLIENTS_STORE);
}

export async function getOfflineClient(id: string): Promise<any | undefined> {
  const db = await getDb();
  return db.get(CLIENTS_STORE, id);
}

export async function searchOfflineClients(query: string): Promise<any[]> {
  const db = await getDb();
  const clients = await db.getAll(CLIENTS_STORE);
  const lowerQuery = query.toLowerCase();
  return clients.filter(c =>
    c.name.toLowerCase().includes(lowerQuery) ||
    c.cedula?.toLowerCase().includes(lowerQuery) ||
    c.clientNumber?.toLowerCase().includes(lowerQuery)
  );
}

export async function saveOfflineCredits(credits: any[]): Promise<void> {
  const db = await getDb();
  const tx = db.transaction(CREDITS_STORE, 'readwrite');
  await tx.store.clear();
  for (const credit of credits) {
    await tx.store.put(credit);
  }
  await tx.done;
}

export async function getOfflineCredit(id: string): Promise<any | undefined> {
  const db = await getDb();
  return db.get(CREDITS_STORE, id);
}

export async function getOfflineCredits(): Promise<any[]> {
  const db = await getDb();
  return db.getAll(CREDITS_STORE);
}

export async function searchOfflineCredits(query: string): Promise<any[]> {
  const db = await getDb();
  const credits = await db.getAll(CREDITS_STORE);
  const lowerQuery = query.toLowerCase();
  return credits.filter(c =>
    c.creditNumber.toLowerCase().includes(lowerQuery) ||
    c.clientName?.toLowerCase().includes(lowerQuery)
  );
}

export async function saveOfflinePaymentPlans(plans: { creditId: string, plans: any[] }[]): Promise<void> {
  const db = await getDb();
  const tx = db.transaction(PAYMENT_PLANS_STORE, 'readwrite');
  await tx.store.clear();
  for (const item of plans) {
    await tx.store.put(item.plans, item.creditId);
  }
  await tx.done;
}

export async function getOfflinePaymentPlan(creditId: string): Promise<any[] | undefined> {
  const db = await getDb();
  return db.get(PAYMENT_PLANS_STORE, creditId);
}

// Sync Status & Bulk Save
export async function getSyncStatus() {
  const db = await getDb();
  return db.get(SYNC_INFO_STORE, 'sync_status');
}

export async function isDataAvailableOffline(): Promise<boolean> {
  const status = await getSyncStatus();
  return !!status;
}

export async function saveOfflineData(data: {
  credits: any[];
  clients: any[];
  paymentPlans: any[];
  payments?: any[]; // Añadido soporte para pagos planos
  gestorId: string;
}): Promise<void> {
  const db = await getDb();

  // 1. Agrupar planes de pago por creditId (vienen planos de la API)
  const plansByCredit = new Map<string, any[]>();
  if (Array.isArray(data.paymentPlans)) {
    data.paymentPlans.forEach(plan => {
      const cid = plan.creditId;
      if (!plansByCredit.has(cid)) plansByCredit.set(cid, []);
      plansByCredit.get(cid)!.push(plan);
    });
  }

  // 2. Agrupar pagos registrados por creditId
  const paymentsByCredit = new Map<string, any[]>();
  if (Array.isArray(data.payments)) {
    data.payments.forEach(p => {
      const cid = p.creditId;
      if (!paymentsByCredit.has(cid)) paymentsByCredit.set(cid, []);
      paymentsByCredit.get(cid)!.push(p);
    });
  }

  // 3. Preparar créditos con sus pagos inyectados para el almacén
  const enrichedCredits = data.credits.map(credit => ({
    ...credit,
    registeredPayments: paymentsByCredit.get(credit.id) || credit.registeredPayments || []
  }));

  // Iniciar transacción
  const tx = db.transaction([CLIENTS_STORE, CREDITS_STORE, PAYMENT_PLANS_STORE, SYNC_INFO_STORE], 'readwrite');

  // Guardar clientes
  const clientStore = tx.objectStore(CLIENTS_STORE);
  await clientStore.clear();
  for (const client of data.clients) {
    await clientStore.put(client);
  }

  // Guardar créditos enriquecidos
  const creditStore = tx.objectStore(CREDITS_STORE);
  await creditStore.clear();
  for (const credit of enrichedCredits) {
    await creditStore.put(credit);
  }

  // Guardar planes de pago agrupados
  const planStore = tx.objectStore(PAYMENT_PLANS_STORE);
  await planStore.clear();
  for (const [creditId, plans] of plansByCredit.entries()) {
    await planStore.put(plans, creditId);
  }

  // Guardar estado de sincronización
  const syncStore = tx.objectStore(SYNC_INFO_STORE);
  await syncStore.put({
    id: 'sync_status',
    lastSync: new Date().toISOString(),
    totalCredits: data.credits.length,
    totalClients: data.clients.length,
    gestorId: data.gestorId
  });

  await tx.done;
  console.log(`💾 Datos guardados en IndexedDB: ${data.credits.length} créditos y sus planes.`);
}

