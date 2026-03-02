
import type { CreditDetail, AppUser as User, CreditStatus } from '@/lib/types';
import { getCredit as getCreditServer, updateCredit as updateCreditServer, getClientCredits as getClientCreditsServer, getCreditsAdmin } from '@/services/credit-service-server';
import { getOfflineCredit, getOfflineCredits, getOfflinePaymentPlan, getPendingPayments, searchOfflineCredits } from './offline-db';

/**
 * Wrapper cliente para obtener créditos con soporte offline.
 */
export const getCredits = async (params: {
    user: User,
    status?: CreditStatus | 'all',
    sucursales?: string[],
    gestorName?: string,
    searchTerm?: string
}): Promise<CreditDetail[]> => {
    try {
        if (typeof window !== 'undefined' && navigator.onLine) {
            const result = await getCreditsAdmin({
                user: params.user,
                status: params.status === 'all' ? undefined : params.status,
                sucursales: params.sucursales,
                gestorName: params.gestorName,
                searchTerm: params.searchTerm
            });
            return result.credits;
        }

        // Modo Offline
        let credits = await getOfflineCredits();

        // Aplicar filtros básicos offline
        if (params.searchTerm) {
            credits = await searchOfflineCredits(params.searchTerm);
        }

        if (params.status && params.status !== 'all') {
            credits = credits.filter(c => c.status === params.status);
        }

        if (params.sucursales && params.sucursales.length > 0) {
            credits = credits.filter(c => params.sucursales!.includes(c.sucursal));
        }

        if (params.gestorName) {
            credits = credits.filter(c => c.collectionsManager === params.gestorName);
        }

        return credits;
    } catch (error) {
        console.error("Error fetching credits list offline:", error);
        return await searchOfflineCredits(params.searchTerm || '');
    }
};

/**
 * Obtiene los detalles completos de un crédito, incluyendo los del cliente.
 * Llama a una Server Action que consulta la base de datos.
 */
export const getCredit = async (id: string): Promise<CreditDetail | null> => {
    try {
        let credit: CreditDetail | null = null;

        // Primero intentar servidor si hay internet
        if (typeof window !== 'undefined' && navigator.onLine) {
            credit = await getCreditServer(id);
        }

        // Si no hay internet o falló el servidor, usar local
        if (!credit) {
            const offlineCredit = await getOfflineCredit(id);
            if (offlineCredit) {
                const offlinePlan = await getOfflinePaymentPlan(id);
                credit = {
                    ...offlineCredit,
                    paymentPlan: offlinePlan || offlineCredit.paymentPlan || []
                };
            }
        }

        if (credit) {
            // SIEMPRE añadir pagos pendientes (offline) que aún no se han sincronizado
            const pendingPayments = await getPendingPayments();
            const thisCreditPending = pendingPayments
                .filter(p => p.creditId === id)
                .map(p => ({
                    ...p.paymentData,
                    id: `pending-${p.timestamp}`, // ID temporal
                    status: 'VALIDO' as const
                }));

            if (thisCreditPending.length > 0) {
                // Deduplicar por transactionNumber para evitar mostrar pagos duplicados
                const existingTransactionNumbers = new Set(
                    (credit.registeredPayments || []).map(p => p.transactionNumber)
                );
                
                const uniquePendingPayments = thisCreditPending.filter(
                    p => !existingTransactionNumbers.has(p.transactionNumber)
                );

                if (uniquePendingPayments.length > 0) {
                    credit.registeredPayments = [
                        ...(credit.registeredPayments || []),
                        ...uniquePendingPayments
                    ];
                }
            }
            return credit;
        }

        return null;
    } catch (error) {
        console.error("Error fetching credit (client-side service):", error);
        // Fallback a IndexedDB en caso de cualquier error de red
        const offlineCredit = await getOfflineCredit(id);
        if (offlineCredit) {
            const offlinePlan = await getOfflinePaymentPlan(id);
            const credit: CreditDetail = {
                ...offlineCredit,
                paymentPlan: offlinePlan || offlineCredit.paymentPlan || []
            };

            // Añadir pagos pendientes
            const pendingPayments = await getPendingPayments();
            const thisCreditPending = pendingPayments
                .filter(p => p.creditId === id)
                .map(p => ({
                    ...p.paymentData,
                    id: `pending-${p.timestamp}`,
                    status: 'VALIDO' as const
                }));

            // Deduplicar por transactionNumber
            const existingTransactionNumbers = new Set(
                (credit.registeredPayments || []).map(p => p.transactionNumber)
            );
            
            const uniquePendingPayments = thisCreditPending.filter(
                p => !existingTransactionNumbers.has(p.transactionNumber)
            );

            credit.registeredPayments = [
                ...(credit.registeredPayments || []),
                ...uniquePendingPayments
            ];
            return credit;
        }
        return null;
    }
};

/**
 * Obtiene todos los créditos asociados a un ID de cliente.
 */
export async function getClientCredits(clientId: string): Promise<CreditDetail[]> {
    try {
        if (typeof window !== 'undefined' && navigator.onLine) {
            return await getClientCreditsServer(clientId);
        }

        // Modo Offline: Buscar créditos del cliente en el almacén local
        const allOfflineCredits = await getOfflineCredits();
        const clientCredits = allOfflineCredits.filter(c => c.clientId === clientId);

        // Para cada crédito, intentar cargar su plan y pagos pendientes
        const enrichedCredits = await Promise.all(clientCredits.map(async (c) => {
            const plan = await getOfflinePaymentPlan(c.id);
            const pending = await getPendingPayments();
            const thisPending = pending
                .filter(p => p.creditId === c.id)
                .map(p => ({ ...p.paymentData, id: `pending-${p.timestamp}`, status: 'VALIDO' as const }));

            return {
                ...c,
                paymentPlan: plan || c.paymentPlan || [],
                registeredPayments: [...(c.registeredPayments || []), ...thisPending]
            };
        }));

        return enrichedCredits;
    } catch (error) {
        console.error(`Error fetching credits for client ${clientId}:`, error);
        return [];
    }
}

/**
 * Actualiza un crédito. Llama a una Server Action.
 */
export async function updateCredit(id: string, creditData: Partial<CreditDetail>, actor: User): Promise<{ success: boolean; error?: string }> {
    return updateCreditServer(id, creditData, actor);
}


