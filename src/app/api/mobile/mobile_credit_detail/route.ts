import { NextResponse } from 'next/server';
import { getCredit, getClientCredits } from '@/services/credit-service-server';
import { calculateCreditStatusDetails, generateFullStatement, calculateAveragePaymentDelay } from '@/lib/utils';
import { nowInNicaragua } from '@/lib/date-utils';

export const dynamic = 'force-dynamic';

/**
 * Endpoint para obtener el detalle con historial completo de créditos
 */
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const creditId = searchParams.get('creditId');

        if (!creditId) {
            return NextResponse.json({ success: false, message: 'Falta creditId' }, { status: 400 });
        }

        const currentCredit = await getCredit(creditId);
        if (!currentCredit) {
            return NextResponse.json({ success: false, message: 'Crédito no encontrado' }, { status: 404 });
        }

        const now = nowInNicaragua();
        const currentDetails = calculateCreditStatusDetails(currentCredit, now);
        const fullStatement = generateFullStatement(currentCredit);

        // --- HISTORIAL COMPLETO DE CRÉDITOS (Para el Consolidado) ---
        const allCreditsSummary = await getClientCredits(currentCredit.clientId);
        const detailedHistory = [];
        let totalAvgAcrossCredits = 0;
        let totalDisbursed = 0;

        for (const c of allCreditsSummary) {
            const fullC = await getCredit(c.id);
            if (fullC) {
                const { avgLateDaysForCredit } = calculateAveragePaymentDelay(fullC);
                totalAvgAcrossCredits += avgLateDaysForCredit;
                totalDisbursed += (fullC.amount || fullC.principalAmount || 0);

                detailedHistory.push({
                    id: fullC.id,
                    creditNumber: fullC.creditNumber,
                    amount: fullC.amount || fullC.principalAmount,
                    status: fullC.status,
                    interestRate: fullC.interestRate,
                    termMonths: fullC.termMonths,
                    deliveryDate: fullC.deliveryDate,
                    dueDate: fullC.dueDate,
                    avgLateDays: avgLateDaysForCredit
                });
            }
        }

        const globalAverage = detailedHistory.length > 0 ? totalAvgAcrossCredits / detailedHistory.length : 0;
        const averageAmount = detailedHistory.length > 0 ? totalDisbursed / detailedHistory.length : 0;

        // Obtener actividad económica (como en la web)
        const { query } = await import('@/lib/mysql');
        const comercianteInfo: any[] = await query('SELECT economicActivity FROM comerciante_info WHERE clientId = ?', [currentCredit.clientId]);
        const economicActivity = comercianteInfo.length > 0 ? comercianteInfo[0].economicActivity : 'No especificada';

        const response = {
            id: currentCredit.id,
            creditNumber: currentCredit.creditNumber,
            clientName: currentCredit.clientName,
            clientCode: currentCredit.clientDetails?.clientNumber || 'N/A',
            collectionsManager: currentCredit.collectionsManager,
            totalAmount: currentCredit.amount || currentCredit.principalAmount,
            interestRate: currentCredit.interestRate || 5,
            deliveryDate: currentCredit.deliveryDate,
            dueDate: currentCredit.dueDate,
            status: currentCredit.status,
            // Datos del consolidado (Historial completo)
            history: detailedHistory,
            summary: {
                totalCredits: detailedHistory.length,
                averageAmount: averageAmount,
                globalAverageLateDays: globalAverage,
                economicActivity: economicActivity
            },
            // Detalle del crédito actual
            details: {
                ...currentDetails,
                avgLateDaysCredit: calculateAveragePaymentDelay(currentCredit).avgLateDaysForCredit
            },
            fullStatement: fullStatement,
            clientDetails: currentCredit.clientDetails,
        };

        return NextResponse.json({ success: true, data: response });

    } catch (error: any) {
        console.error('Error mobile_credit_detail history:', error);
        return NextResponse.json({ success: false, message: error?.message }, { status: 500 });
    }
}
