import { API_ENDPOINTS } from '../config/api';
import { 
    getPendingPayments, 
    markPaymentAsSynced, 
    getPendingCredits, 
    markCreditAsSynced,
    saveClientsOffline,
    saveCreditsOffline,
    setConfig,
    getConfig
} from './offline-db';
import { sessionService } from './session';

// Verificar si hay conexión a internet
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
        console.log('Sin conexión al servidor:', error);
        return false;
    }
};

// Sincronizar pagos pendientes
export const syncPendingPayments = async (): Promise<{
    success: boolean;
    synced: number;
    failed: number;
    errors: string[];
}> => {
    const pendingPayments = await getPendingPayments();
    let synced = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const payment of pendingPayments) {
        try {
            const response = await fetch(API_ENDPOINTS.mobile_payments, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    creditId: payment.creditId,
                    amount: payment.amount,
                    paymentDate: payment.paymentDate,
                    notes: payment.notes,
                    userId: payment.managedBy,
                })
            });

            const result = await response.json();

            if (result.success) {
                await markPaymentAsSynced(payment.id);
                synced++;
            } else {
                failed++;
                errors.push(`Pago ${payment.id}: ${result.message}`);
            }
        } catch (error: any) {
            failed++;
            errors.push(`Pago ${payment.id}: ${error.message}`);
        }
    }

    return { success: failed === 0, synced, failed, errors };
};

// Sincronizar solicitudes de crédito pendientes
export const syncPendingCredits = async (): Promise<{
    success: boolean;
    synced: number;
    failed: number;
    errors: string[];
}> => {
    const pendingCredits = await getPendingCredits();
    let synced = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const credit of pendingCredits) {
        try {
            const response = await fetch(API_ENDPOINTS.mobile_create_credit, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(credit.data)
            });

            const result = await response.json();

            if (result.success) {
                await markCreditAsSynced(credit.id);
                synced++;
            } else {
                failed++;
                errors.push(`Crédito ${credit.id}: ${result.message}`);
            }
        } catch (error: any) {
            failed++;
            errors.push(`Crédito ${credit.id}: ${error.message}`);
        }
    }

    return { success: failed === 0, synced, failed, errors };
};

// Descargar datos para modo offline
export const downloadOfflineData = async (): Promise<{
    success: boolean;
    message: string;
}> => {
    try {
        const session = await sessionService.getSession();
        if (!session?.id) {
            return { success: false, message: 'No hay sesión activa' };
        }

        // Descargar clientes
        const clientsResp = await fetch(`${API_ENDPOINTS.mobile_clients}?userId=${session.id}`);
        const clientsResult = await clientsResp.json();
        
        if (!clientsResult.success) {
            return { success: false, message: 'Error al descargar clientes' };
        }

        // Descargar cartera (créditos)
        const portfolioResp = await fetch(`${API_ENDPOINTS.mobile_portfolio}?userId=${session.id}`);
        const portfolioResult = await portfolioResp.json();
        
        if (!portfolioResult.success) {
            return { success: false, message: 'Error al descargar cartera' };
        }

        // Guardar en base de datos local
        const allClients = [
            ...clientsResult.data.all,
            ...clientsResult.data.reloan,
            ...clientsResult.data.renewal
        ];
        
        const allCredits = [
            ...portfolioResult.data.dueToday,
            ...portfolioResult.data.overdue,
            ...portfolioResult.data.expired,
            ...portfolioResult.data.paidToday,
            ...portfolioResult.data.upToDate
        ];

        await saveClientsOffline(allClients);
        await saveCreditsOffline(allCredits);
        await setConfig('lastSync', Date.now().toString());

        return { 
            success: true, 
            message: `Descargados ${allClients.length} clientes y ${allCredits.length} créditos` 
        };
    } catch (error: any) {
        return { success: false, message: error.message };
    }
};

// Sincronización completa
export const fullSync = async (): Promise<{
    success: boolean;
    message: string;
    details: {
        payments: { synced: number; failed: number };
        credits: { synced: number; failed: number };
        download: boolean;
    };
}> => {
    const hasConnection = await checkConnection();
    
    if (!hasConnection) {
        return {
            success: false,
            message: 'Sin conexión a internet',
            details: {
                payments: { synced: 0, failed: 0 },
                credits: { synced: 0, failed: 0 },
                download: false
            }
        };
    }

    // Sincronizar pagos pendientes
    const paymentsResult = await syncPendingPayments();
    
    // Sincronizar créditos pendientes
    const creditsResult = await syncPendingCredits();
    
    // Descargar datos actualizados
    const downloadResult = await downloadOfflineData();

    const allSuccess = paymentsResult.success && creditsResult.success && downloadResult.success;

    return {
        success: allSuccess,
        message: allSuccess 
            ? 'Sincronización completada exitosamente' 
            : 'Sincronización completada con errores',
        details: {
            payments: { synced: paymentsResult.synced, failed: paymentsResult.failed },
            credits: { synced: creditsResult.synced, failed: creditsResult.failed },
            download: downloadResult.success
        }
    };
};

// Obtener última fecha de sincronización
export const getLastSyncDate = async (): Promise<Date | null> => {
    const lastSync = await getConfig('lastSync');
    return lastSync ? new Date(parseInt(lastSync)) : null;
};
