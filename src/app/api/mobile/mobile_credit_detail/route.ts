import { NextResponse } from 'next/server';
import { getCredit, getClientCredits } from '@/services/credit-service-server';
import { calculateCreditStatusDetails, generateFullStatement, calculateAveragePaymentDelay } from '@/lib/utils';
import { nowInNicaragua } from '@/lib/date-utils';

export const dynamic = 'force-dynamic';

/**
 * Endpoint para obtener el detalle completo de un crédito con promedios corregidos
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

        // --- LÓGICA DE PROMEDIOS (PARIDAD WEB) ---
        
        // 1. Promedio del crédito actual
        const { avgLateDaysForCredit } = calculateAveragePaymentDelay(credit);

        // 2. Promedio GLOBAL (Histórico de todos los créditos del cliente)
        const allCredits = await getClientCredits(credit.clientId);
        let totalAvgAcrossCredits = 0;
        
        if (allCredits.length > 0) {
            // Calculamos el promedio de cada crédito para sacar el promedio de promedios
            for (const c of allCredits) {
                // Necesitamos el crédito completo con su plan para calcular su promedio
                const fullC = await getCredit(c.id);
                if (fullC) {
                    const { avgLateDaysForCredit: avgC } = calculateAveragePaymentDelay(fullC);
                    totalAvgAcrossCredits += avgC;
                }
            }
        }
        const avgLateDaysGlobal = allCredits.length > 0 ? totalAvgAcrossCredits / allCredits.length : avgLateDaysForCredit;

        const response = {
            id: credit.id,
            creditNumber: credit.creditNumber,
            clientName: credit.clientName,
            clientCode: credit.clientDetails?.clientNumber || 'N/A',
            collectionsManager: credit.collectionsManager,
            totalAmount: credit.amount || credit.principalAmount,
            totalToPay: credit.totalAmount,
            status: credit.status,
            interestRate: credit.interestRate || 5,
            deliveryDate: credit.deliveryDate,
            dueDate: credit.dueDate,
            details: {
                remainingBalance: details.remainingBalance,
                overdueAmount: details.overdueAmount,
                dueTodayAmount: details.dueTodayAmount,
                lateDays: details.lateDays,
                isDueToday: details.isDueToday,
                isExpired: details.isExpired,
                paidToday: details.paidToday,
                avgLateDaysCredit: avgLateDaysForCredit, // Promedio de este crédito
                avgLateDaysGlobal: avgLateDaysGlobal,   // Promedio global del cliente
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
