import { NextResponse } from 'next/server';
import { query } from '@/lib/mysql';
import { calculateCreditStatusDetails } from '@/lib/utils';
import { toISOString } from '@/lib/date-utils';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');

        if (!userId) {
            return NextResponse.json({ success: false, message: 'Falta userId' }, { status: 400 });
        }

        const userRows: any = await query('SELECT fullName, sucursal_name FROM users WHERE id = ? LIMIT 1', [userId]);
        if (!userRows || userRows.length === 0) {
            return NextResponse.json({ success: false, message: 'Usuario no existe' }, { status: 404 });
        }

        const user = userRows[0];
        const gestorName = user.fullName;

        // Pagos del día del gestor (hora Nicaragua UTC-6)
        const todayPayments: any[] = await query(`
            SELECT pr.*, c.id as cId
            FROM payments_registered pr
            JOIN credits c ON pr.creditId = c.id
            WHERE pr.managedBy = ?
              AND pr.status != 'ANULADO'
              AND DATE(CONVERT_TZ(pr.paymentDate, '+00:00', '-06:00')) = DATE(CONVERT_TZ(NOW(), '+00:00', '-06:00'))
        `, [gestorName]);

        if (todayPayments.length === 0) {
            return NextResponse.json({
                success: true,
                data: {
                    gestorName,
                    totalRecuperacion: 0,
                    diaRecaudado: 0,
                    moraRecaudada: 0,
                    vencidoRecaudado: 0,
                    proximoRecaudado: 0,
                    totalClientesCobrados: 0
                }
            });
        }

        // Obtener créditos únicos involucrados
        const creditIds = [...new Set(todayPayments.map((p: any) => p.creditId))];
        const placeholders = creditIds.map(() => '?').join(',');

        const [allPayments, paymentPlans]: [any[], any[]] = await Promise.all([
            query(`SELECT * FROM payments_registered WHERE creditId IN (${placeholders})`, creditIds),
            query(`SELECT * FROM payment_plan WHERE creditId IN (${placeholders})`, creditIds),
        ]);

        const paymentsByCreditId = new Map<string, any[]>();
        allPayments.forEach((p: any) => {
            if (!paymentsByCreditId.has(p.creditId)) paymentsByCreditId.set(p.creditId, []);
            paymentsByCreditId.get(p.creditId)!.push({ ...p, paymentDate: toISOString(p.paymentDate) });
        });

        const plansByCreditId = new Map<string, any[]>();
        paymentPlans.forEach((p: any) => {
            if (!plansByCreditId.has(p.creditId)) plansByCreditId.set(p.creditId, []);
            plansByCreditId.get(p.creditId)!.push({ ...p, paymentDate: toISOString(p.paymentDate) });
        });

        const creditRows: any[] = await query(`SELECT * FROM credits WHERE id IN (${placeholders})`, creditIds);

        let totalRecuperacion = 0;
        let diaRecaudado = 0;
        let moraRecaudada = 0;
        let vencidoRecaudado = 0;
        let proximoRecaudado = 0;
        const clientesCobrados = new Set<string>();

        for (const payment of todayPayments) {
            const amount = Number(payment.amount || 0);
            totalRecuperacion += amount;
            clientesCobrados.add(payment.creditId);

            const credit = creditRows.find((c: any) => c.id === payment.creditId);
            if (!credit) { diaRecaudado += amount; continue; }

            // Estado del crédito ANTES de este pago
            const paymentsBeforeThis = (paymentsByCreditId.get(payment.creditId) || [])
                .filter((p: any) => {
                    const pDate = toISOString(p.paymentDate);
                    const thisDate = toISOString(payment.paymentDate);
                    return pDate && thisDate && pDate < thisDate && p.status !== 'ANULADO';
                });

            const creditBefore = {
                ...credit,
                registeredPayments: paymentsBeforeThis,
                paymentPlan: plansByCreditId.get(payment.creditId) || [],
            };

            const status = calculateCreditStatusDetails(creditBefore as any, toISOString(payment.paymentDate));

            if (status.isExpired) {
                vencidoRecaudado += amount;
            } else if (status.overdueAmount > 0) {
                moraRecaudada += amount;
            } else if (!status.isDueToday) {
                // Pago adelantado (no hay cuota hoy ni mora)
                proximoRecaudado += amount;
            } else {
                diaRecaudado += amount;
            }
        }

        return NextResponse.json({
            success: true,
            data: {
                gestorName,
                totalRecuperacion,
                diaRecaudado,
                moraRecaudada,
                vencidoRecaudado,
                proximoRecaudado,
                totalClientesCobrados: clientesCobrados.size
            }
        });

    } catch (error) {
        console.error('Error mobile_dashboard API:', error);
        return NextResponse.json({ success: false, message: 'Error interno del servidor' }, { status: 500 });
    }
}
