import { NextResponse } from 'next/server';
import { query } from '@/lib/mysql';
import { calculateCreditStatusDetails } from '@/lib/utils';
import { toISOString, nowInNicaragua } from '@/lib/date-utils';

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

        // Obtener créditos activos del gestor
        const activeCredits: any[] = await query(
            "SELECT id, clientId, totalAmount FROM credits WHERE collectionsManager = ? AND status = 'Active'",
            [gestorName]
        );

        if (activeCredits.length === 0) {
            return NextResponse.json({ success: true, data: { all: [], reloan: [], renewal: [] } });
        }

        const clientIds = [...new Set(activeCredits.map((c: any) => c.clientId))];
        const creditIds = activeCredits.map((c: any) => c.id);
        const placeholders = clientIds.map(() => '?').join(',');
        const creditPlaceholders = creditIds.map(() => '?').join(',');

        // Obtener clientes con búsqueda opcional
        let clientSql = `SELECT id, clientNumber, name, cedula, phone, address, neighborhood, municipality FROM clients WHERE id IN (${placeholders})`;
        const clientParams: any[] = [...clientIds];
        if (search) {
            clientSql += ` AND (name LIKE ? OR cedula LIKE ? OR clientNumber LIKE ?)`;
            clientParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }
        clientSql += ' ORDER BY name ASC';
        const clients: any[] = await query(clientSql, clientParams);

        // Obtener pagos y planes para calcular elegibilidad
        const [allPayments, allPlans]: [any[], any[]] = await Promise.all([
            query(`SELECT * FROM payments_registered WHERE creditId IN (${creditPlaceholders})`, creditIds),
            query(`SELECT * FROM payment_plan WHERE creditId IN (${creditPlaceholders})`, creditIds),
        ]);

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
        const clientLateDaysMap = new Map<string, number[]>();

        for (const credit of activeCredits) {
            const creditFull = {
                ...credit,
                registeredPayments: paymentsByCreditId.get(credit.id) || [],
                paymentPlan: plansByCreditId.get(credit.id) || [],
            };
            const details = calculateCreditStatusDetails(creditFull as any, asOfDate);
            const paidPct = credit.totalAmount > 0 ? ((credit.totalAmount - details.remainingBalance) / credit.totalAmount) * 100 : 0;

            if (!clientLateDaysMap.has(credit.clientId)) clientLateDaysMap.set(credit.clientId, []);
            clientLateDaysMap.get(credit.clientId)!.push(details.lateDays);

            if (paidPct >= 75) reloanClientIds.add(credit.clientId);
        }

        // Créditos pagados recientes para renovación
        const paidCredits: any[] = await query(
            "SELECT DISTINCT clientId FROM credits WHERE collectionsManager = ? AND status = 'Paid'",
            [gestorName]
        );
        const paidClientIds = new Set(paidCredits.map((c: any) => c.clientId));
        const activeClientIds = new Set(activeCredits.map((c: any) => c.clientId));

        const renewalClientIds = new Set(
            [...paidClientIds].filter(id => !activeClientIds.has(id))
        );

        const reloan: any[] = [];
        const renewal: any[] = [];

        // Obtener clientes de renovación
        if (renewalClientIds.size > 0) {
            const renewalIds = [...renewalClientIds];
            const rPlaceholders = renewalIds.map(() => '?').join(',');
            let renewalSql = `SELECT id, clientNumber, name, cedula, phone FROM clients WHERE id IN (${rPlaceholders})`;
            const renewalParams: any[] = [...renewalIds];
            if (search) {
                renewalSql += ` AND (name LIKE ? OR cedula LIKE ? OR clientNumber LIKE ?)`;
                renewalParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
            }
            const renewalClients: any[] = await query(renewalSql, renewalParams);
            renewal.push(...renewalClients);
        }

        clients.forEach((c: any) => {
            const avgLateDays = clientLateDaysMap.has(c.id)
                ? clientLateDaysMap.get(c.id)!.reduce((a, b) => a + b, 0) / clientLateDaysMap.get(c.id)!.length
                : 0;
            if (reloanClientIds.has(c.id) && avgLateDays <= 2.5) {
                reloan.push(c);
            }
        });

        return NextResponse.json({ success: true, data: { all: clients, reloan, renewal } });

    } catch (error: any) {
        console.error('Error mobile_clients:', error);
        return NextResponse.json({ success: false, message: `Error: ${error?.message}` }, { status: 500 });
    }
}
