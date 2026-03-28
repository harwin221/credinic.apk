import { NextResponse } from 'next/server';
import { query } from '@/lib/mysql';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');

        if (!userId) {
            return NextResponse.json({ success: false, message: 'Falta userId' }, { status: 400 });
        }

        const userRows: any = await query('SELECT fullName FROM users WHERE id = ? LIMIT 1', [userId]);
        if (!userRows || userRows.length === 0) {
            return NextResponse.json({ success: false, message: 'Usuario no existe' }, { status: 404 });
        }

        const gestorName = userRows[0].fullName;

        // Total del día
        const todayRows: any = await query(`
            SELECT SUM(amount) as totalRecuperacion, COUNT(DISTINCT creditId) as totalClientesCobrados
            FROM payments_registered 
            WHERE managedBy = ? AND status != 'ANULADO'
              AND DATE(CONVERT_TZ(paymentDate, '+00:00', '-06:00')) = DATE(CONVERT_TZ(NOW(), '+00:00', '-06:00'))
        `, [gestorName]);

        const totalRecuperacion = Number(todayRows[0]?.totalRecuperacion || 0);
        const totalClientesCobrados = Number(todayRows[0]?.totalClientesCobrados || 0);

        if (totalRecuperacion === 0) {
            return NextResponse.json({
                success: true,
                data: { gestorName, totalRecuperacion: 0, diaRecaudado: 0, moraRecaudada: 0, vencidoRecaudado: 0, proximoRecaudado: 0, totalClientesCobrados: 0 }
            });
        }

        // Pagos del día con contexto del crédito para clasificar proporcionalmente
        const paymentRows: any[] = await query(`
            SELECT 
                pr.creditId, pr.amount, pr.paymentDate,
                c.dueDate,
                COALESCE((
                    SELECT SUM(pp.amount) FROM payment_plan pp 
                    WHERE pp.creditId = pr.creditId 
                    AND DATE(CONVERT_TZ(pp.paymentDate, '+00:00', '-06:00')) < DATE(CONVERT_TZ(pr.paymentDate, '+00:00', '-06:00'))
                ), 0) as amountDueBefore,
                COALESCE((
                    SELECT SUM(pr2.amount) FROM payments_registered pr2 
                    WHERE pr2.creditId = pr.creditId AND pr2.status != 'ANULADO'
                    AND pr2.paymentDate < pr.paymentDate
                ), 0) as paidBefore,
                COALESCE((
                    SELECT SUM(pp3.amount) FROM payment_plan pp3 
                    WHERE pp3.creditId = pr.creditId 
                    AND DATE(CONVERT_TZ(pp3.paymentDate, '+00:00', '-06:00')) = DATE(CONVERT_TZ(pr.paymentDate, '+00:00', '-06:00'))
                ), 0) as dueTodayAmount
            FROM payments_registered pr
            JOIN credits c ON pr.creditId = c.id
            WHERE pr.managedBy = ? AND pr.status != 'ANULADO'
              AND DATE(CONVERT_TZ(pr.paymentDate, '+00:00', '-06:00')) = DATE(CONVERT_TZ(NOW(), '+00:00', '-06:00'))
        `, [gestorName]);

        let diaRecaudado = 0;
        let moraRecaudada = 0;
        let vencidoRecaudado = 0;
        let proximoRecaudado = 0;

        for (const p of paymentRows) {
            let amount = Number(p.amount || 0);
            const overdueAmount = Math.max(0, Number(p.amountDueBefore || 0) - Number(p.paidBefore || 0));
            const dueTodayAmount = Number(p.dueTodayAmount || 0);
            const dueDate = p.dueDate ? new Date(p.dueDate) : null;
            const isExpired = dueDate ? dueDate < new Date(p.paymentDate) : false;

            if (isExpired) {
                vencidoRecaudado += amount;
            } else {
                // 1. Cubre mora primero
                const moraAplicada = Math.min(amount, overdueAmount);
                moraRecaudada += moraAplicada;
                amount -= moraAplicada;

                // 2. Cubre cuota del día
                if (amount > 0 && dueTodayAmount > 0) {
                    const diaAplicado = Math.min(amount, dueTodayAmount);
                    diaRecaudado += diaAplicado;
                    amount -= diaAplicado;
                }

                // 3. Sobrante es adelanto
                if (amount > 0) {
                    proximoRecaudado += amount;
                }
            }
        }

        return NextResponse.json({
            success: true,
            data: { gestorName, totalRecuperacion, diaRecaudado, moraRecaudada, vencidoRecaudado, proximoRecaudado, totalClientesCobrados }
        });

    } catch (error: any) {
        console.error('Error mobile_dashboard API:', error);
        return NextResponse.json({ success: false, message: `Error: ${error?.message}` }, { status: 500 });
    }
}
