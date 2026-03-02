'use client';

import { 
  getOfflineCredits, 
  getOfflineCredit, 
  getOfflineClients, 
  getOfflineClient,
  getOfflinePaymentPlan,
  searchOfflineCredits,
  searchOfflineClients,
  isDataAvailableOffline 
} from './offline-db';
import type { CreditDetail, Client, Payment } from '@/lib/types';

/**
 * Servicio híbrido que funciona online y offline
 * Prioriza datos online, fallback a offline
 */
class HybridDataService {
  private isOnline(): boolean {
    return typeof window !== 'undefined' ? navigator.onLine : true;
  }

  // ============================================================================
  // CRÉDITOS
  // ============================================================================

  async getCredits(): Promise<CreditDetail[]> {
    if (this.isOnline()) {
      try {
        const response = await fetch('/api/credits', {
          credentials: 'include',
        });
        if (response.ok) {
          const data = await response.json();
          return data.credits || [];
        }
      } catch (error) {
        console.warn('Error fetching online credits, using offline data:', error);
      }
    }

    // Fallback a datos offline
    const hasOfflineData = await isDataAvailableOffline();
    if (hasOfflineData) {
      return await getOfflineCredits();
    }

    return [];
  }

  async getCredit(creditId: string): Promise<CreditDetail | null> {
    if (this.isOnline()) {
      try {
        const response = await fetch(`/api/credits/${creditId}`, {
          credentials: 'include',
        });
        if (response.ok) {
          const data = await response.json();
          return data.credit || null;
        }
      } catch (error) {
        console.warn('Error fetching online credit, using offline data:', error);
      }
    }

    // Fallback a datos offline
    const offlineCredit = await getOfflineCredit(creditId);
    if (offlineCredit) {
      // Agregar plan de pagos offline
      const paymentPlan = await getOfflinePaymentPlan(creditId);
      return {
        ...offlineCredit,
        paymentPlan,
      };
    }

    return null;
  }

  async searchCredits(query: string): Promise<CreditDetail[]> {
    if (this.isOnline()) {
      try {
        const response = await fetch(`/api/credits?search=${encodeURIComponent(query)}`, {
          credentials: 'include',
        });
        if (response.ok) {
          const data = await response.json();
          return data.credits || [];
        }
      } catch (error) {
        console.warn('Error searching online credits, using offline data:', error);
      }
    }

    // Fallback a búsqueda offline
    return await searchOfflineCredits(query);
  }

  // ============================================================================
  // CLIENTES
  // ============================================================================

  async getClients(): Promise<Client[]> {
    if (this.isOnline()) {
      try {
        const response = await fetch('/api/clients', {
          credentials: 'include',
        });
        if (response.ok) {
          const data = await response.json();
          return data.clients || [];
        }
      } catch (error) {
        console.warn('Error fetching online clients, using offline data:', error);
      }
    }

    // Fallback a datos offline
    const hasOfflineData = await isDataAvailableOffline();
    if (hasOfflineData) {
      return await getOfflineClients();
    }

    return [];
  }

  async getClient(clientId: string): Promise<Client | null> {
    if (this.isOnline()) {
      try {
        const response = await fetch(`/api/clients/${clientId}`, {
          credentials: 'include',
        });
        if (response.ok) {
          const data = await response.json();
          return data.client || null;
        }
      } catch (error) {
        console.warn('Error fetching online client, using offline data:', error);
      }
    }

    // Fallback a datos offline
    const offlineClient = await getOfflineClient(clientId);
    return offlineClient || null;
  }

  async searchClients(query: string): Promise<Client[]> {
    if (this.isOnline()) {
      try {
        const response = await fetch(`/api/clients?search=${encodeURIComponent(query)}`, {
          credentials: 'include',
        });
        if (response.ok) {
          const data = await response.json();
          return data.clients || [];
        }
      } catch (error) {
        console.warn('Error searching online clients, using offline data:', error);
      }
    }

    // Fallback a búsqueda offline
    return await searchOfflineClients(query);
  }

  // ============================================================================
  // UTILIDADES
  // ============================================================================

  async getDataSource(): Promise<'online' | 'offline' | 'none'> {
    if (this.isOnline()) {
      try {
        const response = await fetch('/api/health', {
          credentials: 'include',
        });
        if (response.ok) {
          return 'online';
        }
      } catch (error) {
        // Continuar a verificar offline
      }
    }

    const hasOfflineData = await isDataAvailableOffline();
    return hasOfflineData ? 'offline' : 'none';
  }

  isOfflineMode(): boolean {
    return !this.isOnline();
  }
}

// Instancia singleton
export const hybridDataService = new HybridDataService();

// Hook para usar en componentes React
export function useHybridData() {
  return {
    getCredits: () => hybridDataService.getCredits(),
    getCredit: (id: string) => hybridDataService.getCredit(id),
    searchCredits: (query: string) => hybridDataService.searchCredits(query),
    getClients: () => hybridDataService.getClients(),
    getClient: (id: string) => hybridDataService.getClient(id),
    searchClients: (query: string) => hybridDataService.searchClients(query),
    getDataSource: () => hybridDataService.getDataSource(),
    isOfflineMode: () => hybridDataService.isOfflineMode(),
  };
}