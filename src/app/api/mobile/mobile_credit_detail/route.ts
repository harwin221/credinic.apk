import { NextResponse } from 'next/server';
import { getCredit } from '@/services/credit-service-server';
import { calculateCreditStatusDetails } from '@/lib/utils';
import { nowInNicaragua } from '@/lib/date-utils';

export const dynamic = 'force-dynamic';

/**
 * Endpoint para obtener el detalle completo de un crédito
 * Usado cuando el gestor selecciona un crédito de búsqueda global
 */
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const creditId = searchParams.get('creditId');

        if (!creditId) {
            return NextResponse.json({ success: false, message: 'Falta creditId' }, { status: 400 });
        }

        // Obtener el crédito completo con todos sus detalles
        const credit = await getCredit(creditId);
        
        if (!credit) {
            return NextResponse.json({ success: false, message: 'Crédito no encontrado' }, { status: 404 });
        }

        // Calcular los detalles del estado del crédito
        const details = calculateCreditStatusDetails(credit, nowInNicaragua());

        // Formatear la respuesta para la app móvil
        const response = {
            id: credit.id,
            creditNumber: credit.creditNumber,
            clientName: credit.clientName,
            clientCode: credit.clientDetails?.clientNumber || 'N/A',
            collectionsManager: credit.collectionsManager,
            totalAmount: credit.totalAmount,
            status: credit.status,
            details: {
                remainingBalance: details.remainingBalance,
                overdueAmount: details.overdueAmount,
                dueTodayAmount: details.dueTodayAmount,
                lateDays: details.lateDays,
                isDueToday: details.isDueToday,
                isExpired: details.isExpired,
                paidToday: details.paidToday,
            },
            paymentPlan: credit.paymentPlan || [],
            registeredPayments: credit.registeredPayments || [],
            clientDetails: credit.clientDetails,
        };

        return NextResponse.json({ success: true, data: response });

    } catch (error: any) {
        console.error('Error mobile_credit_detail:', error);
        return NextResponse.json({ success: false, message: error?.message }, { status: 500 });
    }
}
