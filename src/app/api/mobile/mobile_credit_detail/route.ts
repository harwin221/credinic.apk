import { NextResponse } from 'next/server';
import { getCredit } from '@/services/credit-service-server';
import { calculateCreditStatusDetails, generateFullStatement } from '@/lib/utils';
import { nowInNicaragua } from '@/lib/date-utils';

export const dynamic = 'force-dynamic';

/**
 * Endpoint para obtener el detalle completo de un crédito
 */
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const creditId = searchParams.get('creditId');

        if (!creditId) {
            return NextResponse.json({ success: false, message: 'Falta creditId' }, { status: 400 });
        }

        const credit = await getCredit(creditId);
        
        if (!credit) {
            return NextResponse.json({ success: false, message: 'Crédito no encontrado' }, { status: 404 });
        }

        const now = nowInNicaragua();
        const details = calculateCreditStatusDetails(credit, now);
        const fullStatement = generateFullStatement(credit);

        const response = {
            id: credit.id,
            creditNumber: credit.creditNumber,
            clientName: credit.clientName,
            clientCode: credit.clientDetails?.clientNumber || 'N/A',
            collectionsManager: credit.collectionsManager,
            totalAmount: credit.amount || credit.principalAmount, // Monto entregado (Capital)
            totalToPay: credit.totalAmount, // Total con intereses
            status: credit.status,
            interestRate: credit.interestRate || 5,
            deliveryDate: credit.deliveryDate, // Fecha de entrega
            dueDate: credit.dueDate, // Fecha vencimiento
            details: {
                remainingBalance: details.remainingBalance,
                overdueAmount: details.overdueAmount,
                dueTodayAmount: details.dueTodayAmount,
                lateDays: details.lateDays,
                isDueToday: details.isDueToday,
                isExpired: details.isExpired,
                paidToday: details.paidToday,
            },
            fullStatement: fullStatement,
            clientDetails: credit.clientDetails,
        };

        return NextResponse.json({ success: true, data: response });

    } catch (error: any) {
        console.error('Error mobile_credit_detail:', error);
        return NextResponse.json({ success: false, message: error?.message }, { status: 500 });
    }
}
