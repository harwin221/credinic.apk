import { NextResponse } from 'next/server';
import { query } from '@/lib/mysql';
import { toISOString, nowInNicaragua } from '@/lib/date-utils';
import { calculateCreditStatusDetails, calculateAveragePaymentDelay } from '@/lib/utils';
import type { CreditDetail } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const clientId = searchParams.get('clientId');

        if (!clientId) {
            return NextResponse.json({ success: false, message: 'Falta clientId' }, { status: 400 });
        }

        // Info del cliente
        const clientRows: any = await query(
            'SELECT id, clientNumber, name, cedula, phone, address, neighborhood, municipality, department FROM clients WHERE id = ? LIMIT 1',
            [clientId]
        );
        if (!clientRows || clientRows.length === 0) {
            return NextResponse.json({ success: false, message: 'Cliente no encontrado' }, { status: 404 });
        }
        const client = clientRows[0];

        // Créditos activos del cliente con toda la información
        const credits: any[] = await query(
            `SELECT c.*
             FROM credits c
             LEFT JOIN clients cl ON c.clientId = cl.id
             WHERE c.clientId = ? AND c.status = 'Active' 
             ORDER BY c.applicationDate DESC`,
            [clientId]
        );

        const creditDetails = [];

        for (const credit of credits) {
            const [payments, plans]: [any[], any[]] = await Promise.all([
                query('SELECT * FROM payments_registered WHERE creditId = ? AND status != ?', [credit.id, 'ANULADO']),
                query('SELECT * FROM payment_plan WHERE creditId = ? ORDER BY paymentNumber', [credit.id]),
            ]);

            // Construir el objeto CreditDetail completo para usar las funciones de utils
            const creditFull: CreditDetail = {
                ...credit,
                registeredPayments: payments.map((p: any) => ({
                    ...p,
                    paymentDate: toISOString(p.paymentDate)
                })),
                paymentPlan: plans.map((p: any) => ({
                    ...p,
                    paymentDate: toISOString(p.paymentDate)
                }))
            } as CreditDetail;

            // Usar las mismas funciones que la web para calcular el estado del crédito
            const currentDetails = calculateCreditStatusDetails(creditFull, nowInNicaragua());
            
            // Calcular promedio de atraso del crédito actual usando la función correcta
            const { avgLateDaysForCredit } = calculateAveragePaymentDelay(creditFull);

            // Calcular promedio GLOBAL de días de atraso (histórico de TODOS los créditos del cliente)
            const allCredits: any[] = await query(
                "SELECT * FROM credits WHERE clientId = ?",
                [clientId]
            );
            
            let totalAvgAcrossCredits = 0;
            let validCreditsCount = 0;
            
            for (const c of allCredits) {
                const cPayments: any[] = await query(
                    "SELECT * FROM payments_registered WHERE creditId = ? AND status != 'ANULADO'",
                    [c.id]
                );
                const cPlans: any[] = await query(
                    'SELECT * FROM payment_plan WHERE creditId = ? ORDER BY paymentNumber',
                    [c.id]
                );
                
                // Construir CreditDetail para cada crédito histórico
                const historicCredit: CreditDetail = {
                    ...c,
                    registeredPayments: cPayments.map((p: any) => ({
                        ...p,
                        paymentDate: toISOString(p.paymentDate)
                    })),
                    paymentPlan: cPlans.map((p: any) => ({
                        ...p,
                        paymentDate: toISOString(p.paymentDate)
                    }))
                } as CreditDetail;
                
                // Calcular promedio de este crédito usando la función correcta
                const { avgLateDaysForCredit: avgForThisCredit } = calculateAveragePaymentDelay(historicCredit);
                
                if (cPlans.length > 0) {
                    totalAvgAcrossCredits += avgForThisCredit;
                    validCreditsCount++;
                }
            }
            
            const avgLateDaysGlobal = validCreditsCount > 0 
                ? (totalAvgAcrossCredits / validCreditsCount).toFixed(1) 
                : '0.0';

            // Formatear plan de pago para el móvil
            const paymentPlan = plans.map((p: any) => ({
                paymentNumber: p.paymentNumber,
                paymentDate: toISOString(p.paymentDate),
                amount: p.amount,
                principal: p.principal,
                interest: p.interest,
                balance: p.balance,
            }));

            // Formatear historial de pagos para el móvil
            const paymentHistory = payments.map((p: any) => ({
                id: p.id,
                paymentDate: toISOString(p.paymentDate),
                amount: p.amount,
                managedBy: p.managedBy,
                transactionNumber: p.transactionNumber,
                status: p.status,
                paymentType: p.paymentType,
                notes: p.notes,
            }));

            creditDetails.push({
                id: credit.id,
                creditNumber: credit.creditNumber,
                
                // Configuración del Préstamo
                productType: credit.productType,
                subProduct: credit.subProduct,
                productDestination: credit.productDestination,
                
                // Intereses y plazos
                interestRate: credit.interestRate,
                currency: credit.currencyType || 'Córdobas',
                paymentFrequency: credit.paymentFrequency,
                termMonths: credit.termMonths,
                
                // Datos del Préstamo
                amount: credit.amount, // Monto Principal
                totalAmount: credit.totalAmount, // Monto Total del Crédito
                installmentAmount: credit.totalInstallmentAmount, // Cuota a Pagar
                disbursementDate: credit.deliveryDate, // Fecha de Entrega
                firstPaymentDate: credit.firstPaymentDate, // Fecha de Primera Cuota
                dueDate: credit.dueDate, // Fecha de Vencimiento
                applicationDate: credit.applicationDate,
                
                // Información de Gestión
                collectionsManager: credit.collectionsManager,
                branchName: credit.branchName,
                
                // Estado actual del crédito (calculado con las funciones correctas)
                totalPaid: currentDetails.totalPaid,
                remainingBalance: currentDetails.remainingBalance,
                overdueAmount: currentDetails.overdueAmount,
                lateDays: currentDetails.lateDays,
                avgLateDaysCurrentCredit: avgLateDaysForCredit.toFixed(1), // Promedio del crédito actual (CORRECTO)
                avgLateDaysGlobal, // Promedio global de todos los créditos (CORRECTO)
                
                // Plan de pago y historial
                paymentPlan,
                paymentHistory,
            });
        }

        return NextResponse.json({ success: true, data: { client, credits: creditDetails } });

    } catch (error: any) {
        console.error('Error mobile_client_detail:', error);
        return NextResponse.json({ success: false, message: error?.message }, { status: 500 });
    }
}
