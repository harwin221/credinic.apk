
'use server';

import type { CreditApplication, CreditDetail, AppUser as User, RegisteredPayment } from '@/lib/types';
import {
    addCredit as addCreditService,
    updateCredit as updateCreditService,
    revertDisbursement as revertDisbursementService,
    addPayment as addPaymentService,
    voidPayment as voidPaymentService,
    requestVoidPayment as requestVoidPaymentService,
    getClientCredits as getClientCreditsService
} from '@/services/credit-service-server';
// Importaciones limpias - solo las necesarias


// Esta es una acción de servidor para añadir un crédito
export async function addCredit(creditData: Partial<CreditApplication>, creator: User): Promise<{ success: boolean; creditId?: string; error?: string }> {
    return addCreditService(creditData, creator);
}

// Esta es una acción de servidor para actualizar un crédito
export async function updateCredit(id: string, creditData: Partial<CreditDetail>, actor: User): Promise<{ success: boolean; error?: string }> {
    return updateCreditService(id, creditData, actor);
}

export async function revertDisbursement(revertedCreditId: string, actor: User): Promise<{ success: boolean; error?: string }> {
    return revertDisbursementService(revertedCreditId, actor);
}

export async function requestVoidPayment(creditId: string, paymentId: string, reason: string, actor: User): Promise<{ success: boolean; error?: string }> {
    return requestVoidPaymentService(creditId, paymentId, reason, actor);
}

export async function voidPayment(creditId: string, paymentId: string, actor: User): Promise<{ success: boolean; error?: string }> {
    return voidPaymentService(creditId, paymentId, actor);
}

export async function addPayment(creditId: string, paymentData: Omit<RegisteredPayment, 'id'>, actor: User): Promise<{ success: boolean; error?: string, paymentId?: string, transactionNumber?: string }> {
    try {
        // Usar directamente el objeto usuario que se pasa, evitando la consulta adicional
        if (!actor || !actor.id) {
            return { success: false, error: 'Información de usuario inválida.' };
        }

        return addPaymentService(creditId, paymentData, actor);
    } catch (error) {
        console.error('Error in addPayment:', error);
        return { success: false, error: 'Error al procesar el pago.' };
    }
}
