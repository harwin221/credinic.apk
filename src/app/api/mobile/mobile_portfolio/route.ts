import { NextResponse } from 'next/server';
import { getPortfolioForGestor } from '@/services/portfolio-service';
import { query } from '@/lib/mysql';
import { calculateCreditStatusDetails } from '@/lib/utils';
import { nowInNicaragua, toISOString } from '@/lib/date-utils';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');

        if (!userId) {
            return NextResponse.json({ success: false, message: 'Falta userId' }, { status: 400 });
        }

        // Obtener el nombre del gestor
        const userRows: any = await query('SELECT fullName FROM users WHERE id = ? LIMIT 1', [userId]);
        if (!userRows || userRows.length === 0) {
            return NextResponse.json({ success: false, message: 'Usuario no existe' }, { status: 404 });
        }
        const gestorName = userRows[0].fullName;

        // Obtener la cartera del gestor
        const { portfolio } = await getPortfolioForGestor(userId);

        // Obtener créditos donde el gestor aplicó pagos HOY (aunque no sean de su cartera)
        // INCLUIR tanto créditos activos como los que se cancelaron hoy
        const todayPaymentsRows: any[] = await query(`
            SELECT DISTINCT pr.creditId
            FROM payments_registered pr
            WHERE pr.managedBy = ? 
            AND pr.status != 'ANULADO'
            AND DATE(DATE_SUB(pr.paymentDate, INTERVAL 6 HOUR)) = CURDATE()
        `, [gestorName]);

        console.log('🔍 [mobile_portfolio] Gestor:', gestorName);
        console.log('🔍 [mobile_portfolio] Créditos cobrados hoy:', todayPaymentsRows.length);
        console.log('🔍 [mobile_portfolio] IDs:', todayPaymentsRows.map(r => r.creditId));

        const todayPaymentCreditIds = new Set(todayPaymentsRows.map((r: any) => r.creditId));
        const portfolioCreditIds = new Set(portfolio.map((c: any) => c.id));

        // Créditos que el gestor cobró hoy pero no están en su cartera activa
        // Esto incluye créditos de otros gestores Y créditos que se cancelaron hoy
        const externalCreditIds = [...todayPaymentCreditIds].filter(id => !portfolioCreditIds.has(id));

        let externalCredits: any[] = [];
        if (externalCreditIds.length > 0) {
            const placeholders = externalCreditIds.map(() => '?').join(',');
            
            // Obtener los créditos externos (pueden estar Active o Paid)
            const externalCreditsRows: any[] = await query(`
                SELECT c.*, cl.clientNumber as clientCode
                FROM credits c
                LEFT JOIN clients cl ON c.clientId = cl.id
                WHERE c.id IN (${placeholders})
                AND c.status IN ('Active', 'Paid')
            `, externalCreditIds);

            console.log('🔍 [mobile_portfolio] Créditos externos encontrados:', externalCreditsRows.length);
            console.log('🔍 [mobile_portfolio] Estados:', externalCreditsRows.map(c => ({ id: c.id, status: c.status })));

            // Obtener pagos y planes de estos créditos
            const [externalPayments, externalPlans]: [any[], any[]] = await Promise.all([
                query(`SELECT * FROM payments_registered WHERE creditId IN (${placeholders})`, externalCreditIds),
                query(`SELECT * FROM payment_plan WHERE creditId IN (${placeholders})`, externalCreditIds),
            ]);

            const paymentsByCreditId = new Map<string, any[]>();
            externalPayments.forEach((p: any) => {
                if (!paymentsByCreditId.has(p.creditId)) paymentsByCreditId.set(p.creditId, []);
                paymentsByCreditId.get(p.creditId)!.push({ ...p, paymentDate: toISOString(p.paymentDate) });
            });

            const plansByCreditId = new Map<string, any[]>();
            externalPlans.forEach((p: any) => {
                if (!plansByCreditId.has(p.creditId)) plansByCreditId.set(p.creditId, []);
                plansByCreditId.get(p.creditId)!.push({ ...p, paymentDate: toISOString(p.paymentDate) });
            });

            const asOfDate = nowInNicaragua();
            externalCredits = externalCreditsRows.map((credit: any) => {
                const creditFull = {
                    ...credit,
                    registeredPayments: paymentsByCreditId.get(credit.id) || [],
                    paymentPlan: plansByCreditId.get(credit.id) || [],
                };
                const details = calculateCreditStatusDetails(creditFull as any, asOfDate);
                return {
                    ...creditFull,
                    details,
                };
            });
        }

        // Combinar la cartera del gestor con los créditos externos que cobró hoy
        const allCredits = [...portfolio, ...externalCredits];

        // Categorizar según la lógica de negocio oficial (utils.ts / GestorDashboard.tsx)
        const categorized = {
            paidToday: [] as any[],
            dueToday: [] as any[],
            overdue: [] as any[],
            expired: [] as any[],
            upToDate: [] as any[], // Clientes al día (sin mora, no vencen hoy, no vencidos, no pagaron hoy)
            all: allCredits
        };

        allCredits.forEach(credit => {
            if (!credit.details) return;

            // Categorización en orden de prioridad
            if (credit.details.paidToday > 0) {
                categorized.paidToday.push(credit);
            } else if (credit.details.isDueToday) {
                categorized.dueToday.push(credit);
            } else if (credit.details.isExpired) {
                categorized.expired.push(credit);
            } else if (credit.details.overdueAmount > 0) {
                categorized.overdue.push(credit);
            } else {
                // Si no está en ninguna categoría anterior, está al día
                categorized.upToDate.push(credit);
            }
        });

        console.log('📊 [mobile_portfolio] Categorizado:');
        console.log('   - Cobrado Hoy:', categorized.paidToday.length);
        console.log('   - Cobro Día:', categorized.dueToday.length);
        console.log('   - Mora:', categorized.overdue.length);
        console.log('   - Vencido:', categorized.expired.length);

        return NextResponse.json({
            success: true,
            data: categorized
        });

    } catch (error) {
        console.error('Error en API Portfolio Mobile:', error);
        return NextResponse.json({ success: false, message: 'Error al obtener la cartera' }, { status: 500 });
    }
}
