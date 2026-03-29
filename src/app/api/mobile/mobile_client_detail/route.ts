import { NextResponse } from 'next/server';
import { query } from '@/lib/mysql';
import { toISOString, nowInNicaragua } from '@/lib/date-utils';

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
            `SELECT c.*, 
                    b.name as branchName,
                    cl.address as clientAddress,
                    cl.workAddress as clientWorkAddress
             FROM credits c
             LEFT JOIN branches b ON c.branchId = b.id
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

            // Promedio de días de atraso del CRÉDITO ACTUAL
            let currentCreditLateDaysSum = 0;
            let currentCreditPaymentCount = 0;
            payments.forEach((p: any, i: number) => {
                const plan = plans[i];
                if (!plan) return;
                const payDate = toISOString(p.paymentDate);
                const planDate = toISOString(plan.paymentDate);
                if (payDate && planDate) {
                    const diff = Math.floor((new Date(payDate.substring(0, 10)).getTime() - new Date(planDate.substring(0, 10)).getTime()) / 86400000);
                    if (diff > 0) { 
                        currentCreditLateDaysSum += diff; 
                        currentCreditPaymentCount++; 
                    }
                }
            });
            const avgLateDaysCurrentCredit = currentCreditPaymentCount > 0 
                ? (currentCreditLateDaysSum / currentCreditPaymentCount).toFixed(1) 
                : '0.0';

            // Promedio GLOBAL de días de atraso (histórico de TODOS los créditos del cliente)
            const allCredits: any[] = await query(
                "SELECT id FROM credits WHERE clientId = ?",
                [clientId]
            );
            let totalLateDaysSum = 0;
            let paymentCount = 0;
            for (const c of allCredits) {
                const cPayments: any[] = await query(
                    "SELECT paymentDate FROM payments_registered WHERE creditId = ? AND status != 'ANULADO'",
                    [c.id]
                );
                const cPlans: any[] = await query(
                    'SELECT paymentDate FROM payment_plan WHERE creditId = ? ORDER BY paymentNumber',
                    [c.id]
                );
                cPayments.forEach((p: any, i: number) => {
                    const plan = cPlans[i];
                    if (!plan) return;
                    const payDate = toISOString(p.paymentDate);
                    const planDate = toISOString(plan.paymentDate);
                    if (payDate && planDate) {
                        const diff = Math.floor((new Date(payDate.substring(0, 10)).getTime() - new Date(planDate.substring(0, 10)).getTime()) / 86400000);
                        if (diff > 0) { totalLateDaysSum += diff; paymentCount++; }
                    }
                });
            }
            const avgLateDaysGlobal = paymentCount > 0 ? (totalLateDaysSum / paymentCount).toFixed(1) : '0.0';

            creditDetails.push({
                id: credit.id,
                creditNumber: credit.creditNumber,
                
                // Configuración del Préstamo
                productType: credit.productType,
                subProduct: credit.subProduct,
                productDestination: credit.productDestination,
                
                // Intereses y plazos
                interestRate: credit.interestRate,
                currency: credit.currency || 'Córdobas',
                paymentFrequency: credit.paymentFrequency,
                termMonths: credit.termMonths,
                
                // Datos del Préstamo
                amount: credit.amount, // Monto Principal
                totalAmount: credit.totalAmount, // Monto Total del Crédito
                installmentAmount: credit.installmentAmount, // Cuota a Pagar
                disbursementDate: credit.disbursementDate, // Fecha de Entrega
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
                avgLateDaysCurrentCredit, // Promedio del crédito actual
                avgLateDaysGlobal, // Promedio global de todos los créditos
                
                // Direcciones del cliente
                clientAddress: credit.clientAddress,
                clientWorkAddress: credit.clientWorkAddress,
            });
        }

        return NextResponse.json({ success: true, data: { client, credits: creditDetails } });

    } catch (error: any) {
        console.error('Error mobile_client_detail:', error);
        return NextResponse.json({ success: false, message: error?.message }, { status: 500 });
    }
}
