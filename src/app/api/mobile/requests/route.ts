import { NextResponse } from 'next/server';
import { query } from '@/lib/mysql';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');

        console.log('[REQUESTS] userId:', userId);

        if (!userId) {
            return NextResponse.json({ success: false, message: 'Falta userId' }, { status: 400 });
        }

        // Obtener información del usuario
        const userRows: any = await query('SELECT fullName, role, sucursal_id FROM users WHERE id = ? LIMIT 1', [userId]);
        console.log('[REQUESTS] userRows:', userRows);
        
        if (!userRows || userRows.length === 0) {
            return NextResponse.json({ success: false, message: 'Usuario no existe' }, { status: 404 });
        }

        const user = userRows[0];
        const userRole = user.role.toUpperCase();
        const sucursalId = user.sucursal_id;

        console.log('[REQUESTS] user:', user);
        console.log('[REQUESTS] userRole:', userRole);
        console.log('[REQUESTS] sucursalId:', sucursalId);

        // Solo gerentes, admins y finanzas pueden ver solicitudes
        if (!['GERENTE', 'ADMINISTRADOR', 'FINANZAS', 'OPERATIVO'].includes(userRole)) {
            return NextResponse.json({ success: false, message: 'No tienes permisos' }, { status: 403 });
        }

        let whereClause = "WHERE c.status = 'Pending'";
        const params: any[] = [];

        // Filtrar por sucursal si es gerente u operativo
        if (userRole === 'GERENTE' || userRole === 'OPERATIVO') {
            whereClause += " AND c.branch COLLATE utf8mb4_unicode_ci = CAST(? AS CHAR) COLLATE utf8mb4_unicode_ci";
            params.push(sucursalId);
        }

        console.log('[REQUESTS] whereClause:', whereClause);
        console.log('[REQUESTS] params:', params);

        // Obtener solicitudes pendientes con información completa
        const credits: any[] = await query(`
            SELECT 
                c.id,
                c.creditNumber,
                c.clientName,
                c.clientId,
                c.amount,
                c.termMonths,
                c.totalAmount,
                c.totalInstallmentAmount,
                c.interestRate,
                c.paymentFrequency,
                c.collectionsManager,
                c.branchName,
                c.applicationDate,
                c.status
            FROM credits c
            ${whereClause}
            ORDER BY c.applicationDate DESC
        `, params);

        console.log('[REQUESTS] credits found:', credits.length);
        console.log('[REQUESTS] credits:', JSON.stringify(credits, null, 2));

        return NextResponse.json({
            success: true,
            requests: credits
        });

    } catch (error: any) {
        console.error('Error in mobile requests API:', error);
        return NextResponse.json({ success: false, message: `Error: ${error?.message}` }, { status: 500 });
    }
}
