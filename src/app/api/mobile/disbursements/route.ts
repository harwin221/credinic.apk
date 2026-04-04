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

        // Obtener todos los créditos relevantes: Approved, Active (desembolsados hoy), Rejected (denegados hoy)
        let allWhereClause = "WHERE c.status IN ('Approved', 'Active', 'Rejected')";
        const allParams: any[] = [];

        // Filtrar por sucursal si es gerente u operativo
        if (userRole === 'GERENTE' || userRole === 'OPERATIVO') {
            allWhereClause += " AND c.branch COLLATE utf8mb4_unicode_ci = CAST(? AS CHAR) COLLATE utf8mb4_unicode_ci";
            allParams.push(sucursalId);
        }

        console.log('[DISBURSEMENTS] allWhereClause:', allWhereClause);
        console.log('[DISBURSEMENTS] allParams:', allParams);

        // Obtener desembolsos pendientes (créditos aprobados) con información completa
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
                c.interestRate,
                c.collectionsManager,
                c.branchName,
                c.approvalDate,
                c.approvedBy,
                c.firstPaymentDate,
                c.deliveryDate,
                c.disbursedBy,
                c.status,
                c.rejectionReason,
                c.rejectedBy,
                cl.address,
                cl.department,
                cl.municipality,
                cl.neighborhood
            FROM credits c
            LEFT JOIN clients cl ON c.clientId = cl.id
            ${allWhereClause}
            ORDER BY 
                CASE 
                    WHEN c.status = 'Approved' THEN 1
                    WHEN c.status = 'Active' THEN 2
                    WHEN c.status = 'Rejected' THEN 3
                END,
                c.approvalDate DESC
        `, allParams);

        console.log('[DISBURSEMENTS] credits found:', credits.length);
        console.log('[DISBURSEMENTS] Rejected credits:', credits.filter(c => c.status === 'Rejected').map(c => ({
            id: c.id,
            creditNumber: c.creditNumber,
            clientName: c.clientName,
            amount: c.amount,
            status: c.status,
            approvalDate: c.approvalDate
        })));

        // Para cada crédito, calcular el saldo pendiente anterior y monto neto
        for (const credit of credits) {
            // Buscar si el cliente tiene créditos activos (saldo pendiente)
            const activeCredits: any[] = await query(`
                SELECT 
                    c.id, 
                    c.totalAmount,
                    COALESCE((
                        SELECT SUM(pr.amount) 
                        FROM payments_registered pr 
                        WHERE pr.creditId = c.id AND pr.status != 'ANULADO'
                    ), 0) as totalPaid
                FROM credits c
                WHERE c.clientId = ? AND c.status = 'Active'
                LIMIT 1
            `, [credit.clientId]);

            if (activeCredits.length > 0) {
                const activeCredit = activeCredits[0];
                
                // Calcular saldo pendiente del crédito activo (igual que calculateCreditStatusDetails)
                const totalPaid = Number(activeCredit.totalPaid || 0);
                const totalAmount = Number(activeCredit.totalAmount || 0);
                const outstandingBalance = Math.max(0, totalAmount - totalPaid);
                
                credit.outstandingBalance = outstandingBalance;
                credit.netDisbursementAmount = Math.max(0, credit.amount - outstandingBalance);
            } else {
                credit.outstandingBalance = 0;
                credit.netDisbursementAmount = credit.amount;
            }
        }

        console.log('[DISBURSEMENTS] credits with balances:', JSON.stringify(credits, null, 2));

        return NextResponse.json({
            success: true,
            disbursements: credits
        });

    } catch (error: any) {
        console.error('Error in mobile disbursements API:', error);
        return NextResponse.json({ success: false, message: `Error: ${error?.message}` }, { status: 500 });
    }
}
