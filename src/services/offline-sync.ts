'use client';

import { saveOfflineData, getSyncStatus, isDataAvailableOffline } from './offline-db';
import type { AppUser } from '@/lib/types';

const SYNC_INTERVAL = 30 * 1000; // 30 segundos (mejorado para más tiempo real)
const FORCE_SYNC_INTERVAL = 5 * 60 * 1000; // 5 minutos (reducido)

class OfflineSyncManager {
  private syncInterval: NodeJS.Timeout | null = null;
  private forceSyncInterval: NodeJS.Timeout | null = null;
  private isOnline = true;
  private user: AppUser | null = null;

  // Store bound event handlers to allow proper removal
  private boundHandleOnline: () => void;
  private boundHandleOffline: () => void;

  constructor() {
    this.boundHandleOnline = this.handleOnline.bind(this);
    this.boundHandleOffline = this.handleOffline.bind(this);

    if (typeof window !== 'undefined') {
      this.isOnline = navigator.onLine;
      window.addEventListener('online', this.boundHandleOnline);
      window.addEventListener('offline', this.boundHandleOffline);
    }
  }

  private handleOnline() {
    this.isOnline = true;
    console.log('🌐 Conexión restaurada - iniciando sincronización');
    this.syncNow();
  }

  private handleOffline() {
    this.isOnline = false;
    console.log('📱 Modo offline activado');
  }

  private startSyncIntervals() {
    this.stopSyncIntervals();

    // Sincronización regular cada 30 segundos
    this.syncInterval = setInterval(() => {
      this.syncNow();
    }, SYNC_INTERVAL);

    // Sincronización forzada cada 5 minutos
    this.forceSyncInterval = setInterval(() => {
      this.syncNow(true);
    }, FORCE_SYNC_INTERVAL);

    // Sincronización inicial
    setTimeout(() => this.syncNow(), 1000);
  }

  private stopSyncIntervals() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    if (this.forceSyncInterval) {
      clearInterval(this.forceSyncInterval);
      this.forceSyncInterval = null;
    }
  }

  setUser(user: AppUser | null) {
    this.user = user;
    if (user && ['GESTOR', 'ADMINISTRADOR', 'GERENTE', 'FINANZAS', 'OPERATIVO'].includes(user.role)) {
      this.startSyncIntervals();
    } else {
      this.stopSyncIntervals();
    }
  }

  async syncNow(force = false): Promise<{ success: boolean; error?: string }> {
    // Verificar conexión usando múltiples fuentes
    const navigatorOnline = typeof window !== 'undefined' ? navigator.onLine : true;
    const isOnlineNow = navigatorOnline && this.isOnline;

    if (!isOnlineNow) {
      console.log('📱 Sin conexión - sincronización cancelada');
      return { success: false, error: "Sin conexión a internet. Los datos se sincronizarán automáticamente cuando vuelvas a estar en línea." };
    }

    if (!this.user || !['GESTOR', 'ADMINISTRADOR', 'GERENTE', 'FINANZAS', 'OPERATIVO'].includes(this.user.role)) {
      return { success: false, error: "Tu usuario no tiene permisos para sincronizar." };
    }

    try {
      // Verificar si necesita sincronización
      if (!force) {
        const status = await getSyncStatus();
        if (status) {
          const lastSync = new Date(status.lastSync);
          const now = new Date();
          const timeDiff = now.getTime() - lastSync.getTime();

          // Si la última sincronización fue hace menos de 20 segundos, saltar
          if (timeDiff < 20 * 1000) {
            return { success: true };
          }
        }
      }

      console.log('🔄 Iniciando sincronización de datos...');

      // PASO 1: Sincronizar pagos pendientes primero
      await this.syncPendingPayments();

      // PASO 2: Descargar datos actualizados del servidor
      const response = await fetch('/api/mobile/sync', {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Servidor respondió: ${response.status} - ${errorText}`);
      }

      const syncData = await response.json();

      if (syncData.error) {
        throw new Error(syncData.error);
      }

      // Guardar datos offline
      await saveOfflineData({
        credits: syncData.credits || [],
        clients: syncData.clients || [],
        paymentPlans: syncData.paymentPlans || [],
        payments: syncData.payments || [], // Añadido historial de abonos
        gestorId: this.user.id,
      });

      console.log(`✅ Sincronización completa: ${syncData.stats?.totalCredits || 0} créditos, ${syncData.stats?.totalClients || 0} clientes`);

      return { success: true };
    } catch (error: any) {
      console.error('❌ Error en sincronización:', error);
      return { success: false, error: error.message || "Error desconocido durante la sincronización." };
    }
  }

  private async syncPendingPayments(): Promise<void> {
    const { getPendingPayments, deletePendingPayment } = await import('./offline-db');
    const pendingPayments = await getPendingPayments();

    if (pendingPayments.length === 0) {
      return;
    }

    console.log(`📤 Sincronizando ${pendingPayments.length} pagos pendientes...`);

    // Preparar pagos para envío en batch
    const paymentsToSync = pendingPayments.map(p => ({
      creditId: p.creditId,
      amount: p.paymentData.amount,
      paymentDate: p.paymentData.paymentDate,
      managedBy: p.paymentData.managedBy,
      transactionNumber: p.paymentData.transactionNumber,
      offlineId: p.timestamp, // Usar timestamp como ID único
    }));

    try {
      // Enviar pagos al servidor
      const response = await fetch('/api/mobile/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          payments: paymentsToSync,
          isBatch: true,
        }),
      });

      if (!response.ok) {
        throw new Error(`Error al sincronizar pagos: ${response.status}`);
      }

      const result = await response.json();

      // Eliminar pagos sincronizados exitosamente
      if (result.results && Array.isArray(result.results)) {
        for (const paymentResult of result.results) {
          if (paymentResult.success && paymentResult.offlineId) {
            await deletePendingPayment(paymentResult.offlineId);
            console.log(`✅ Pago sincronizado y eliminado: ${paymentResult.transactionNumber}`);
          } else if (!paymentResult.success) {
            console.warn(`⚠️ Error sincronizando pago: ${paymentResult.error}`);
          }
        }
      }

      console.log(`✅ Sincronización de pagos completa: ${result.successful}/${result.processed} exitosos`);
    } catch (error) {
      console.error('❌ Error sincronizando pagos pendientes:', error);
      // No lanzar error para no interrumpir la sincronización general
    }
  }

  async getOfflineStatus(): Promise<{
    hasData: boolean;
    lastSync: string | null;
    totalCredits: number;
    totalClients: number;
  }> {
    const hasData = await isDataAvailableOffline();
    const status = await getSyncStatus();

    return {
      hasData,
      lastSync: status?.lastSync || null,
      totalCredits: status?.totalCredits || 0,
      totalClients: status?.totalClients || 0,
    };
  }

  destroy() {
    this.stopSyncIntervals();
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.handleOnline.bind(this));
      window.removeEventListener('offline', this.handleOffline.bind(this));
    }
  }
}

// Instancia singleton
export const offlineSyncManager = new OfflineSyncManager();

// Hook para usar en componentes
export function useOfflineSync() {
  return {
    syncNow: () => offlineSyncManager.syncNow(true),
    getStatus: () => offlineSyncManager.getOfflineStatus(),
  };
}