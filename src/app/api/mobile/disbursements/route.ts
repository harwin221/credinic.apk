import { NextResponse } from 'next/server';
import { query } from '@/lib/mysql';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');

        console.log('[DISBURSEMENTS] userId:', userId);

        if (!userId) {
            return NextResponse.json({ success: false, message: 'Falta userId' }, { status: 400 });
        }

        // Obtener información del usuario
        const userRows: any = await query('SELECT fullName, role, sucursal_id FROM users WHERE id = ? LIMIT 1', [userId]);
        console.log('[DISBURSEMENTS] userRows:', userRows);
        
        if (!userRows || userRows.length === 0) {
            return NextResponse.json({ success: false, message: 'Usuario no existe' }, { status: 404 });
        }

        const user = userRows[0];
        const userRole = user.role.toUpperCase();
        const sucursalId = user.sucursal_id;

        console.log('[DISBURSEMENTS] user:', user);
        console.log('[DISBURSEMENTS] userRole:', userRole);
        console.log('[DISBURSEMENTS] sucursalId:', sucursalId);

        // Solo gerentes, admins y operativos pueden ver desembolsos
        if (!['GERENTE', 'ADMINISTRADOR', 'OPERATIVO'].includes(userRole)) {
            return NextResponse.json({ success: false, message: 'No tienes permisos' }, { status: 403 });
        }

        let whereClause = "WHERE c.status = 'Approved'";
        const params: any[] = [];

        // Filtrar por sucursal si es gerente u operativo
        if (userRole === 'GERENTE' || userRole === 'OPERATIVO') {
            whereClause += " AND c.branch COLLATE utf8mb4_unicode_ci = CAST(? AS CHAR) COLLATE utf8mb4_unicode_ci";
            params.push(sucursalId);
        }

        console.log('[DISBURSEMENTS] whereClause:', whereClause);
        console.log('[DISBURSEMENTS] params:', params);

        // Obtener desembolsos pendientes (créditos aprobados)
        const credits: any[] = await query(`
            SELECT 
                c.id,
                c.creditNumber,
                c.clientName,
                c.clientId,
                c.amount,
                c.totalAmount,
                c.totalInstallmentAmount,
                c.termMonths,
                c.paymentFrequency,
                c.collectionsManager,
                c.branchName,
                c.approvalDate,
                c.approvedBy,
                c.status
            FROM credits c
            ${whereClause}
            ORDER BY c.approvalDate DESC
        `, params);

        console.log('[DISBURSEMENTS] credits found:', credits.length);
        console.log('[DISBURSEMENTS] credits:', JSON.stringify(credits, null, 2));

        return NextResponse.json({
            success: true,
            disbursements: credits
        });

    } catch (error: any) {
        console.error('Error in mobile disbursements API:', error);
        return NextResponse.json({ success: false, message: `Error: ${error?.message}` }, { status: 500 });
    }
}
