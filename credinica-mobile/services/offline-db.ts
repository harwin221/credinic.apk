import * as SQLite from 'expo-sqlite';

// Abrir/crear base de datos
const db = SQLite.openDatabaseSync('credinica_offline.db');

// Inicializar tablas
export const initDatabase = () => {
    try {
        // Tabla de clientes offline
        db.execSync(`
            CREATE TABLE IF NOT EXISTS offline_clients (
                id TEXT PRIMARY KEY,
                data TEXT NOT NULL,
                lastSync INTEGER
            );
        `);

        // Tabla de créditos offline
        db.execSync(`
            CREATE TABLE IF NOT EXISTS offline_credits (
                id TEXT PRIMARY KEY,
                clientId TEXT NOT NULL,
                data TEXT NOT NULL,
                lastSync INTEGER
            );
        `);

        // Tabla de pagos pendientes de sincronización
        db.execSync(`
            CREATE TABLE IF NOT EXISTS pending_payments (
                id TEXT PRIMARY KEY,
                creditId TEXT NOT NULL,
                amount REAL NOT NULL,
                paymentDate TEXT NOT NULL,
                notes TEXT,
                managedBy TEXT NOT NULL,
                createdAt INTEGER NOT NULL,
                synced INTEGER DEFAULT 0
            );
        `);

        // Tabla de solicitudes de crédito pendientes
        db.execSync(`
            CREATE TABLE IF NOT EXISTS pending_credits (
                id TEXT PRIMARY KEY,
                clientId TEXT NOT NULL,
                data TEXT NOT NULL,
                createdAt INTEGER NOT NULL,
                synced INTEGER DEFAULT 0
            );
        `);

        // Tabla de configuración
        db.execSync(`
            CREATE TABLE IF NOT EXISTS config (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            );
        `);
        
        console.log('✅ Base de datos inicializada correctamente');
    } catch (error) {
        console.error('❌ Error inicializando base de datos:', error);
        throw error;
    }
};

// Verificar conexión a internet
export const checkConnection = async (): Promise<boolean> => {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        // Verificar contra el servidor de la app (endpoint sin autenticación)
        const response = await fetch('https://credinic-apk.vercel.app/api/mobile/ping', {
            method: 'HEAD',
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        return response.ok;
    } catch (error) {
        console.log('Sin conexión:', error);
        return false;
    }
};

// ============================================================================
// CLIENTES OFFLINE
// ============================================================================

export const saveClientsOffline = async (clients: any[]) => {
    try {
        for (const client of clients) {
            db.runSync(
                'INSERT OR REPLACE INTO offline_clients (id, data, lastSync) VALUES (?, ?, ?)',
                [client.id, JSON.stringify(client), Date.now()]
            );
        }
    } catch (error) {
        console.error('Error guardando clientes offline:', error);
        throw error;
    }
};

export const getOfflineClients = async (): Promise<any[]> => {
    try {
        const rows = db.getAllSync('SELECT * FROM offline_clients');
        return rows.map((row: any) => JSON.parse(row.data));
    } catch (error) {
        console.error('Error obteniendo clientes offline:', error);
        return [];
    }
};

// ============================================================================
// CRÉDITOS OFFLINE
// ============================================================================

export const saveCreditsOffline = async (credits: any[]) => {
    try {
        for (const credit of credits) {
            db.runSync(
                'INSERT OR REPLACE INTO offline_credits (id, clientId, data, lastSync) VALUES (?, ?, ?, ?)',
                [credit.id, credit.clientId, JSON.stringify(credit), Date.now()]
            );
        }
    } catch (error) {
        console.error('Error guardando créditos offline:', error);
        throw error;
    }
};

export const getOfflineCredits = async (): Promise<any[]> => {
    try {
        const rows = db.getAllSync('SELECT * FROM offline_credits');
        return rows.map((row: any) => JSON.parse(row.data));
    } catch (error) {
        console.error('Error obteniendo créditos offline:', error);
        return [];
    }
};

// ============================================================================
// PAGOS PENDIENTES
// ============================================================================

export const savePendingPayment = async (payment: {
    id: string;
    creditId: string;
    amount: number;
    paymentDate: string;
    notes?: string;
    managedBy: string;
}) => {
    try {
        db.runSync(
            `INSERT INTO pending_payments (id, creditId, amount, paymentDate, notes, managedBy, createdAt, synced)
             VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
            [
                payment.id,
                payment.creditId,
                payment.amount,
                payment.paymentDate,
                payment.notes || '',
                payment.managedBy,
                Date.now()
            ]
        );
    } catch (error) {
        console.error('Error guardando pago pendiente:', error);
        throw error;
    }
};

export const getPendingPayments = async (): Promise<any[]> => {
    try {
        const result = db.getAllSync('SELECT * FROM pending_payments WHERE synced = 0 ORDER BY createdAt ASC');
        return result || [];
    } catch (error) {
        console.error('Error obteniendo pagos pendientes:', error);
        return [];
    }
};

export const markPaymentAsSynced = async (paymentId: string) => {
    try {
        db.runSync('UPDATE pending_payments SET synced = 1 WHERE id = ?', [paymentId]);
    } catch (error) {
        console.error('Error marcando pago como sincronizado:', error);
        throw error;
    }
};

// ============================================================================
// SOLICITUDES DE CRÉDITO PENDIENTES
// ============================================================================

export const savePendingCredit = async (credit: {
    id: string;
    clientId: string;
    data: any;
}) => {
    try {
        db.runSync(
            `INSERT INTO pending_credits (id, clientId, data, createdAt, synced)
             VALUES (?, ?, ?, ?, 0)`,
            [credit.id, credit.clientId, JSON.stringify(credit.data), Date.now()]
        );
    } catch (error) {
        console.error('Error guardando crédito pendiente:', error);
        throw error;
    }
};

export const getPendingCredits = async (): Promise<any[]> => {
    try {
        const rows = db.getAllSync('SELECT * FROM pending_credits WHERE synced = 0 ORDER BY createdAt ASC');
        return rows.map((row: any) => ({
            ...row,
            data: JSON.parse(row.data)
        }));
    } catch (error) {
        console.error('Error obteniendo créditos pendientes:', error);
        return [];
    }
};

export const markCreditAsSynced = async (creditId: string) => {
    try {
        db.runSync('UPDATE pending_credits SET synced = 1 WHERE id = ?', [creditId]);
    } catch (error) {
        console.error('Error marcando crédito como sincronizado:', error);
        throw error;
    }
};

// ============================================================================
// CONFIGURACIÓN
// ============================================================================

export const setConfig = async (key: string, value: string) => {
    try {
        db.runSync(
            'INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)',
            [key, value]
        );
    } catch (error) {
        console.error('Error guardando configuración:', error);
        throw error;
    }
};

export const getConfig = async (key: string): Promise<string | null> => {
    try {
        const result: any = db.getFirstSync('SELECT value FROM config WHERE key = ?', [key]);
        return result?.value || null;
    } catch (error) {
        console.error('Error obteniendo configuración:', error);
        return null;
    }
};

// ============================================================================
// UTILIDADES
// ============================================================================

export const clearAllOfflineData = async () => {
    try {
        db.runSync('DELETE FROM offline_clients');
        db.runSync('DELETE FROM offline_credits');
        db.runSync('DELETE FROM pending_payments WHERE synced = 1');
        db.runSync('DELETE FROM pending_credits WHERE synced = 1');
    } catch (error) {
        console.error('Error limpiando datos offline:', error);
        throw error;
    }
};

export const getOfflineStats = async () => {
    try {
        const result: any = db.getFirstSync(`
            SELECT 
                (SELECT COUNT(*) FROM offline_clients) as clients,
                (SELECT COUNT(*) FROM offline_credits) as credits,
                (SELECT COUNT(*) FROM pending_payments WHERE synced = 0) as pendingPayments,
                (SELECT COUNT(*) FROM pending_credits WHERE synced = 0) as pendingCredits
        `);
        return result || { clients: 0, credits: 0, pendingPayments: 0, pendingCredits: 0 };
    } catch (error) {
        console.error('Error obteniendo estadísticas offline:', error);
        return { clients: 0, credits: 0, pendingPayments: 0, pendingCredits: 0 };
    }
};
