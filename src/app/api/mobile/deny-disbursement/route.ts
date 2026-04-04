import { NextResponse } from 'next/server';
import { query } from '@/lib/mysql';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { creditId, userId, reason } = body;

        console.log('[DENY_DISBURSEMENT] creditId:', creditId, 'userId:', userId);

        if (!creditId || !userId) {
            return NextResponse.json({ success: false, message: 'Faltan parámetros' }, { status: 400 });
        }

        // Obtener información del usuario
        const userRows: any = await query('SELECT fullName, role FROM users WHERE id = ? LIMIT 1', [userId]);
        if (!userRows || userRows.length === 0) {
            return NextResponse.json({ success: false, message: 'Usuario no existe' }, { status: 404 });
        }

        const user = userRows[0];
        const userRole = user.role.toUpperCase();

        // Solo gerentes, admins y operativos pueden denegar desembolsos
        if (!['GERENTE', 'ADMINISTRADOR', 'OPERATIVO'].includes(userRole)) {
            return NextResponse.json({ success: false, message: 'No tienes permisos para denegar' }, { status: 403 });
        }

        // Obtener el crédito
        const creditRows: any = await query('SELECT * FROM credits WHERE id = ? LIMIT 1', [creditId]);
        if (!creditRows || creditRows.length === 0) {
            return NextResponse.json({ success: false, message: 'Crédito no encontrado' }, { status: 404 });
        }

        const credit = creditRows[0];

        // Verificar que el crédito esté en estado Approved
        if (credit.status !== 'Approved') {
            return NextResponse.json({ success: false, message: 'El crédito no está aprobado' }, { status: 400 });
        }

        console.log('[DENY_DISBURSEMENT] Denegando desembolso');

        // Cambiar el estado a Rejected (denegar desembolso)
        await query(`
            UPDATE credits 
            SET status = 'Rejected',
                rejectionReason = ?,
                rejectedBy = ?
            WHERE id = ?
        `, [reason || 'Desembolso denegado desde app móvil', user.fullName, creditId]);

        console.log('[DENY_DISBURSEMENT] Desembolso denegado exitosamente');

        return NextResponse.json({
            success: true,
            message: 'Desembolso denegado exitosamente'
        });

    } catch (error: any) {
        console.error('Error in deny disbursement API:', error);
        return NextResponse.json({ success: false, message: `Error: ${error?.message}` }, { status: 500 });
    }
}
