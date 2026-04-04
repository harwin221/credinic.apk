import { NextResponse } from 'next/server';
import { query } from '@/lib/mysql';
import { nowInNicaragua } from '@/lib/date-utils';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { creditId, userId } = body;

        console.log('[APPROVE_CREDIT] creditId:', creditId, 'userId:', userId);

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

        // Solo gerentes, admins, finanzas y operativos pueden aprobar
        if (!['GERENTE', 'ADMINISTRADOR', 'FINANZAS', 'OPERATIVO'].includes(userRole)) {
            return NextResponse.json({ success: false, message: 'No tienes permisos para aprobar' }, { status: 403 });
        }

        // Actualizar el crédito a estado Approved
        const approvalDate = nowInNicaragua();
        await query(`
            UPDATE credits 
            SET status = 'Approved',
                approvalDate = ?,
                approvedBy = ?
            WHERE id = ?
        `, [approvalDate, user.fullName, creditId]);

        console.log('[APPROVE_CREDIT] Crédito aprobado exitosamente');

        return NextResponse.json({
            success: true,
            message: 'Crédito aprobado exitosamente'
        });

    } catch (error: any) {
        console.error('Error in approve credit API:', error);
        return NextResponse.json({ success: false, message: `Error: ${error?.message}` }, { status: 500 });
    }
}
