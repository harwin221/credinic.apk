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

        const userRows: any = await query('SELECT fullName, sucursal_name FROM users WHERE id = ? LIMIT 1', [userId]);
        if (!userRows || userRows.length === 0) {
            return NextResponse.json({ success: false, message: 'Usuario no existe' }, { status: 404 });
        }

        const gestorName = userRows[0].fullName;

        // Igual que el reporte de recuperación web: suma total de pagos del día
        const todaySql = `
            SELECT 
                SUM(amount) as totalRecuperacion,
                COUNT(DISTINCT creditId) as totalClientesCobrados
            FROM payments_registered 
            WHERE managedBy = ? 
              AND status != 'ANULADO'
              AND DATE(CONVERT_TZ(paymentDate, '+00:00', '-06:00')) = DATE(CONVERT_TZ(NOW(), '+00:00', '-06:00'))
        `;
        const todayRows: any = await query(todaySql, [gestorName]);
        const totalRecuperacion = Number(todayRows[0]?.totalRecuperacion || 0);
        const totalClientesCobrados = Number(todayRows[0]?.totalClientesCobrados || 0);

        if (totalRecuperacion === 0) {
            return NextResponse.json({
                success: true,
                data: { gestorName, totalRecuperacion: 0, diaRecaudado: 0, moraRecaudada: 0, vencidoRecaudado: 0, proximoRecaudado: 0, totalClientesCobrados: 0 }
            });
        }

        // Obtener pagos del día con info del crédito para clasificar
        const paymentRows: any[] = await query(`
            SELECT pr.creditId, pr.amount, pr.paymentDate,
                   c.dueDate,
                   (SELECT SUM(pp.amount) FROM payment_plan pp 
                    WHERE pp.creditId = pr.creditId 
                    AND DATE(CONVERT_TZ(pp.paymentDate, '+00:00', '-06:00')) < DATE(CONVERT_TZ(pr.paymentDate, '+00:00', '-06:00'))) as amountDueBefore,
                   (SELECT SUM(pr2.amount) FROM payments_registered pr2 
                    WHERE pr2.creditId = pr.creditId AND pr2.status != 'ANULADO'
                    AND pr2.paymentDate < pr.paymentDate) as paidBefore,
                   (SELECT COUNT(*) FROM payment_plan pp2 
                    WHERE pp2.creditId = pr.creditId 
                    AND DATE(CONVERT_TZ(pp2.paymentDate, '+00:00', '-06:00')) = DATE(CONVERT_TZ(pr.paymentDate, '+00:00', '-06:00'))) as hasDueToday
            FROM payments_registered pr
            JOIN credits c ON pr.creditId = c.id
            WHERE pr.managedBy = ?
              AND pr.status != 'ANULADO'
              AND DATE(CONVERT_TZ(pr.paymentDate, '+00:00', '-06:00')) = DATE(CONVERT_TZ(NOW(), '+00:00', '-06:00'))
        `, [gestorName]);

        let diaRecaudado = 0;
        let moraRecaudada = 0;
        let vencidoRecaudado = 0;
        let proximoRecaudado = 0;

        for (const p of paymentRows) {
            const amount = Number(p.amount || 0);
            const amountDueBefore = Number(p.amountDueBefore || 0);
            const paidBefore = Number(p.paidBefore || 0);
            const overdueAmount = Math.max(0, amountDueBefore - paidBefore);
            const hasDueToday = Number(p.hasDueToday || 0) > 0;

            const dueDate = p.dueDate ? new Date(p.dueDate) : null;
            const paymentDate = new Date(p.paymentDate);
            const isExpired = dueDate ? dueDate < paymentDate : false;

            if (isExpired) {
                vencidoRecaudado += amount;
            } else if (overdueAmount > 0) {
                moraRecaudada += amount;
            } else if (!hasDueToday) {
                proximoRecaudado += amount;
            } else {
                diaRecaudado += amount;
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
