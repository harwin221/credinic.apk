import { NextResponse } from 'next/server';
import { query } from '@/lib/mysql';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');

        if (!userId) {
            return NextResponse.json({ success: false, message: 'Falta userId' }, { status: 400 });
        }

        // Obtener datos del usuario logueado en el móvil
        const userRows: any = await query('SELECT fullName, sucursal_name FROM users WHERE id = ? LIMIT 1', [userId]);

        if (!userRows || userRows.length === 0) {
            return NextResponse.json({ success: false, message: 'Usuario no existe' }, { status: 404 });
        }

        const user = userRows[0];

        // Consulta directa para obtener métricas del día (Hora Nicaragua UTC-6)
        const statsSql = `
            SELECT 
                SUM(amount) as totalRecuperacion,
                COUNT(DISTINCT creditId) as totalClientesCobrados,
                SUM(CASE WHEN paymentType = 'NORMAL' OR paymentType = 'CUOTA' THEN amount ELSE 0 END) as diaRecaudado,
                SUM(CASE WHEN paymentType = 'MORA' THEN amount ELSE 0 END) as moraRecaudada,
                SUM(CASE WHEN paymentType = 'VENCIDO' THEN amount ELSE 0 END) as vencidoRecaudada,
                SUM(CASE WHEN paymentType = 'ADELANTO' THEN amount ELSE 0 END) as proximoRecaudado
            FROM payments_registered 
            WHERE managedBy = ? 
            AND status != 'ANULADO'
            AND DATE(CONVERT_TZ(paymentDate, '+00:00', '-06:00')) = DATE(CONVERT_TZ(NOW(), '+00:00', '-06:00'))
        `;

        const statsRows: any = await query(statsSql, [user.fullName]);
        const stats = statsRows[0] || {};

        return NextResponse.json({
            success: true,
            data: {
                gestorName: user.fullName,
                totalRecuperacion: Number(stats.totalRecuperacion || 0),
                diaRecaudado: Number(stats.diaRecaudado || 0),
                moraRecaudada: Number(stats.moraRecaudada || 0),
                vencidoRecaudado: Number(stats.vencidoRecaudada || 0),
                proximoRecaudado: Number(stats.proximoRecaudado || 0),
                totalClientesCobrados: Number(stats.totalClientesCobrados || 0)
            }
        });

    } catch (error) {
        console.error('Error dashboard mobile:', error);
        return NextResponse.json({ success: false, message: 'Error interno del servidor' }, { status: 500 });
    }
}
