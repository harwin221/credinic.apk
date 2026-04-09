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
            try {
                const [payments, plans]: [any[], any[]] = await Promise.all([
                    query('SELECT * FROM payments_registered WHERE creditId = ? AND status != ?', [credit.id, 'ANULADO']),
                    query('SELECT * FROM payment_plan WHERE creditId = ? ORDER BY paymentNumber', [credit.id]),
                ]);

                // Calcular estado actual manualmente (más seguro que usar calculateCreditStatusDetails)
                const totalPaid = payments.reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
                const remainingBalance = Math.max(0, Number(credit.totalAmount || 0) - totalPaid);

                // Calcular días de atraso actuales
                const today = nowInNicaragua().substring(0, 10);
                const overdueInstallments = plans.filter((p: any) => {
                    const d = toISOString(p.paymentDate);
                    return d && d.substring(0, 10) < today;
                });
                const amountDue = overdueInstallments.reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
                const overdueAmount = Math.max(0, amountDue - totalPaid);

                // Días de atraso: desde la primera cuota impaga
                let lateDays = 0;
                if (overdueAmount > 0.01) {
                    let cumDue = 0;
                    for (const inst of overdueInstallments) {
                        cumDue += Number(inst.amount || 0);
                        if (totalPaid < cumDue - 0.01) {
                            const instDate = toISOString(inst.paymentDate);
                            if (instDate) {
                                const diff = Math.floor((new Date(today).getTime() - new Date(instDate.substring(0, 10)).getTime()) / 86400000);
                                lateDays = Math.max(0, diff);
                            }
                            break;
                        }
                    }
                }

                // Calcular promedio de atraso usando la función correcta
                let avgLateDaysCurrentCredit = '0.0';
                let avgLateDaysGlobal = '0.0';
                
                try {
                    // Construir el objeto CreditDetail completo
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

                    // Calcular promedio del crédito actual
                    const { avgLateDaysForCredit } = calculateAveragePaymentDelay(creditFull);
                    avgLateDaysCurrentCredit = avgLateDaysForCredit.toFixed(1);

                    // Calcular promedio GLOBAL (solo si hay plan de pagos)
                    if (plans.length > 0) {
                        const allCredits: any[] = await query(
                            "SELECT * FROM credits WHERE clientId = ?",
                            [clientId]
                        );
                        
                        let totalAvgAcrossCredits = 0;
                        let validCreditsCount = 0;
                        
                        for (const c of allCredits) {
                            try {
                                const cPayments: any[] = await query(
                                    "SELECT * FROM payments_registered WHERE creditId = ? AND status != 'ANULADO'",
                                    [c.id]
                                );
                                const cPlans: any[] = await query(
                                    'SELECT * FROM payment_plan WHERE creditId = ? ORDER BY paymentNumber',
                                    [c.id]
                                );
                                
                                if (cPlans.length > 0) {
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
                                    
                                    const { avgLateDaysForCredit: avgForThisCredit } = calculateAveragePaymentDelay(historicCredit);
                                    totalAvgAcrossCredits += avgForThisCredit;
                                    validCreditsCount++;
                                }
                            } catch (err) {
                                console.error(`Error calculando promedio para crédito ${c.id}:`, err);
                            }
                        }
                        
                        avgLateDaysGlobal = validCreditsCount > 0 
                            ? (totalAvgAcrossCredits / validCreditsCount).toFixed(1) 
                            : '0.0';
                    }
                } catch (err) {
                    console.error('Error calculando promedios de atraso:', err);
                    // Mantener valores por defecto '0.0'
                }

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
                    
                    // Estado actual del crédito
                    totalPaid,
                    remainingBalance,
                    overdueAmount,
                    lateDays,
                    avgLateDaysCurrentCredit, // Promedio del crédito actual (CORRECTO)
                    avgLateDaysGlobal, // Promedio global de todos los créditos (CORRECTO)
                    
                    // Plan de pago y historial
                    paymentPlan,
                    paymentHistory,
                });
            } catch (creditError: any) {
                console.error(`Error procesando crédito ${credit.id}:`, creditError);
                // Continuar con el siguiente crédito
            }
        }

        return NextResponse.json({ success: true, data: { client, credits: creditDetails } });

    } catch (error: any) {
        console.error('Error mobile_client_detail:', error);
        return NextResponse.json({ success: false, message: error?.message }, { status: 500 });
    }
}
