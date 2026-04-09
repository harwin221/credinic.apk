import { NextResponse } from 'next/server';
import { query } from '@/lib/mysql';
import { calculateCreditStatusDetails, calculateAveragePaymentDelay } from '@/lib/utils';
import { toISOString, nowInNicaragua } from '@/lib/date-utils';
import type { CreditDetail } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');
        const search = searchParams.get('search') || '';

        if (!userId) {
            return NextResponse.json({ success: false, message: 'Falta userId' }, { status: 400 });
        }

        const userRows: any = await query('SELECT fullName FROM users WHERE id = ? LIMIT 1', [userId]);
        if (!userRows || userRows.length === 0) {
            return NextResponse.json({ success: false, message: 'Usuario no existe' }, { status: 404 });
        }

        const gestorName = userRows[0].fullName;

        // Obtener TODOS los clientes que alguna vez tuvieron crédito con el gestor (igual que la web)
        const gestorCredits: any[] = await query(
            'SELECT DISTINCT clientId FROM credits WHERE collectionsManager = ?',
            [gestorName]
        );

        if (gestorCredits.length === 0) {
            return NextResponse.json({ success: true, data: { all: [], reloan: [], renewal: [] } });
        }

        const allGestorClientIds = gestorCredits.map((c: any) => c.clientId);
        const placeholders = allGestorClientIds.map(() => '?').join(',');

        // Obtener clientes con búsqueda opcional
        let clientSql = `SELECT id, clientNumber, name, cedula, phone, address, neighborhood, municipality FROM clients WHERE id IN (${placeholders})`;
        const clientParams: any[] = [...allGestorClientIds];
        if (search) {
            clientSql += ` AND (name LIKE ? OR cedula LIKE ? OR clientNumber LIKE ?)`;
            clientParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }
        clientSql += ' ORDER BY name ASC';
        const clients: any[] = await query(clientSql, clientParams);

        // Obtener créditos activos del gestor
        const activeCredits: any[] = await query(
            "SELECT id, clientId, totalAmount FROM credits WHERE collectionsManager = ? AND status = 'Active'",
            [gestorName]
        );

        // Obtener clientes que ya tienen créditos pendientes o aprobados (no deberían aparecer en représtamo/renovación)
        const pendingOrApprovedCredits: any[] = await query(
            "SELECT DISTINCT clientId FROM credits WHERE collectionsManager = ? AND status IN ('Pending', 'Approved')",
            [gestorName]
        );
        const clientsWithPendingCredits = new Set(pendingOrApprovedCredits.map((c: any) => c.clientId));

        const creditIds = activeCredits.map((c: any) => c.id);
        const creditPlaceholders = creditIds.length > 0 ? creditIds.map(() => '?').join(',') : "''";

        // Obtener pagos y planes para calcular elegibilidad (solo si hay créditos activos)
        let allPayments: any[] = [];
        let allPlans: any[] = [];
        
        if (creditIds.length > 0) {
            [allPayments, allPlans] = await Promise.all([
                query(`SELECT * FROM payments_registered WHERE creditId IN (${creditPlaceholders})`, creditIds),
                query(`SELECT * FROM payment_plan WHERE creditId IN (${creditPlaceholders})`, creditIds),
            ]);
        }

        const paymentsByCreditId = new Map<string, any[]>();
        allPayments.forEach((p: any) => {
            if (!paymentsByCreditId.has(p.creditId)) paymentsByCreditId.set(p.creditId, []);
            paymentsByCreditId.get(p.creditId)!.push({ ...p, paymentDate: toISOString(p.paymentDate) });
        });
        const plansByCreditId = new Map<string, any[]>();
        allPlans.forEach((p: any) => {
            if (!plansByCreditId.has(p.creditId)) plansByCreditId.set(p.creditId, []);
            plansByCreditId.get(p.creditId)!.push({ ...p, paymentDate: toISOString(p.paymentDate) });
        });

        const asOfDate = nowInNicaragua();
        const reloanClientIds = new Set<string>();

        // Lógica de Représtamo: >= 75% pagado Y promedio de atraso <= 2.5 días
        for (const credit of activeCredits) {
            const creditFull: CreditDetail = {
                ...credit,
                registeredPayments: paymentsByCreditId.get(credit.id) || [],
                paymentPlan: plansByCreditId.get(credit.id) || [],
            } as CreditDetail;
            
            const details = calculateCreditStatusDetails(creditFull, asOfDate);
            const paidPct = credit.totalAmount > 0 ? ((credit.totalAmount - details.remainingBalance) / credit.totalAmount) * 100 : 0;

            if (paidPct >= 75) {
                const { avgLateDaysForCredit } = calculateAveragePaymentDelay(creditFull);
                if (avgLateDaysForCredit <= 2.5) {
                    reloanClientIds.add(credit.clientId);
                }
            }
        }

        // Lógica de Renovación: Créditos pagados con promedio de atraso <= 2.5 días Y sin crédito activo
        const paidCredits: any[] = await query(
            "SELECT id, clientId, totalAmount FROM credits WHERE collectionsManager = ? AND status = 'Paid'",
            [gestorName]
        );
        
        const activeClientIds = new Set(activeCredits.map((c: any) => c.clientId));
        const renewalClientIds = new Set<string>();

        if (paidCredits.length > 0) {
            const paidCreditIds = paidCredits.map(c => c.id);
            const paidPlaceholders = paidCreditIds.map(() => '?').join(',');

            // Obtener pagos y planes de créditos pagados
            const [paidPayments, paidPlans]: [any[], any[]] = await Promise.all([
                query(`SELECT * FROM payments_registered WHERE creditId IN (${paidPlaceholders})`, paidCreditIds),
                query(`SELECT * FROM payment_plan WHERE creditId IN (${paidPlaceholders})`, paidCreditIds),
            ]);

            const paidPaymentsByCreditId = new Map<string, any[]>();
            paidPayments.forEach((p: any) => {
                if (!paidPaymentsByCreditId.has(p.creditId)) paidPaymentsByCreditId.set(p.creditId, []);
                paidPaymentsByCreditId.get(p.creditId)!.push({ ...p, paymentDate: toISOString(p.paymentDate) });
            });

            const paidPlansByCreditId = new Map<string, any[]>();
            paidPlans.forEach((p: any) => {
                if (!paidPlansByCreditId.has(p.creditId)) paidPlansByCreditId.set(p.creditId, []);
                paidPlansByCreditId.get(p.creditId)!.push({ ...p, paymentDate: toISOString(p.paymentDate) });
            });

            for (const credit of paidCredits) {
                // Solo clientes sin crédito activo
                if (activeClientIds.has(credit.clientId)) continue;

                const creditFull: CreditDetail = {
                    ...credit,
                    registeredPayments: paidPaymentsByCreditId.get(credit.id) || [],
                    paymentPlan: paidPlansByCreditId.get(credit.id) || [],
                } as CreditDetail;

                const { avgLateDaysForCredit } = calculateAveragePaymentDelay(creditFull);
                if (avgLateDaysForCredit <= 2.5) {
                    renewalClientIds.add(credit.clientId);
                }
            }
        }

        const reloan: any[] = [];
        const renewal: any[] = [];

        // Filtrar clientes de représtamo del array de clientes del gestor (excluir los que tienen créditos pendientes/aprobados)
        const reloanFiltered = clients.filter((c: any) => 
            reloanClientIds.has(c.id) && !clientsWithPendingCredits.has(c.id)
        );
        reloan.push(...reloanFiltered);

        // Filtrar clientes de renovación del array de clientes del gestor (igual que la web)
        // Esto asegura que solo se muestren clientes que pertenecen a la cartera del gestor
        const renewalFiltered = clients.filter((c: any) => 
            renewalClientIds.has(c.id) && !clientsWithPendingCredits.has(c.id)
        );
        renewal.push(...renewalFiltered);

        return NextResponse.json({ success: true, data: { all: clients, reloan, renewal } });

    } catch (error: any) {
        console.error('Error mobile_clients:', error);
        return NextResponse.json({ success: false, message: `Error: ${error?.message}` }, { status: 500 });
    }
}
