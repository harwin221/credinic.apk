import { NextResponse } from 'next/server';
import { query } from '@/lib/mysql';
import { nowInNicaragua, isoToMySQLDateTimeNoon } from '@/lib/date-utils';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { creditId, userId, reason } = body;

        console.log('[REJECT_CREDIT] creditId:', creditId, 'userId:', userId);

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

        // Solo gerentes, admins, finanzas y operativos pueden rechazar
        if (!['GERENTE', 'ADMINISTRADOR', 'FINANZAS', 'OPERATIVO'].includes(userRole)) {
            return NextResponse.json({ success: false, message: 'No tienes permisos para rechazar' }, { status: 403 });
        }

        console.log('[REJECT_CREDIT] Actualizando crédito');

        // Usar la misma lógica que la web: nowInNicaragua() + isoToMySQLDateTimeNoon()
        const approvalDateISO = nowInNicaragua();
        const approvalDateMySQL = isoToMySQLDateTimeNoon(approvalDateISO);

        // Actualizar el crédito a estado Rejected
        await query(`
            UPDATE credits 
            SET status = 'Rejected',
                approvalDate = ?,
                rejectionReason = ?,
                rejectedBy = ?
            WHERE id = ?
        `, [approvalDateMySQL, reason || 'Sin motivo especificado', user.fullName, creditId]);

        console.log('[REJECT_CREDIT] Crédito rechazado exitosamente');

        return NextResponse.json({
            success: true,
            message: 'Crédito rechazado exitosamente'
        });

    } catch (error: any) {
        console.error('Error in reject credit API:', error);
        return NextResponse.json({ success: false, message: `Error: ${error?.message}` }, { status: 500 });
    }
}
