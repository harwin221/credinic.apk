
'use server';

import { query } from '@/lib/mysql';
import type { CreditDetail, PortfolioCredit, User, Client, RegisteredPayment } from '@/lib/types';
import { calculateCreditStatusDetails, type CreditStatusDetails } from '@/lib/utils';
import { isToday, parseISO, differenceInDays, subDays, startOfDay, endOfDay } from 'date-fns';
import { toNicaraguaTime, nowInNicaragua } from '@/lib/date-utils';
import { getCreditsAdmin as getCreditsAdminServerSide } from './credit-service-server';
import { getUser as getUserServerSide } from './user-service-server';
import { generateDailyActivityReport } from './closure-service';


export interface GestorDashboardData {
  recuperacionTotal: number;
  metaDeCobro: number;
  totalClientesCobrados: number;
  pendingRenewals: number;
}

/**
 * Obtiene y procesa la cartera de créditos para un gestor específico.
 * Esta función está optimizada para la vista de cartera móvil y ahora usa MySQL.
 */
export async function getPortfolioForGestor(gestorId: string): Promise<{
    portfolio: PortfolioCredit[],
    dailySummary: GestorDashboardData,
}> {
    const gestor = await getUserServerSide(gestorId);
    if (!gestor) {
        console.warn(`Gestor with ID ${gestorId} not found.`);
        return { portfolio: [], dailySummary: {} as GestorDashboardData };
    }
    const gestorName = gestor.fullName;

    // 1. Obtener todos los créditos activos del gestor.
    const { credits: activeCredits } = await getCreditsAdminServerSide({ 
        gestorName: gestorName, 
        status: 'Active',
        user: gestor,
    });

    if (!Array.isArray(activeCredits) || activeCredits.length === 0) {
        const dailySummary = await getGestorDashboardData(gestor, []);
        return { portfolio: [], dailySummary: dailySummary };
    }
    
    // 2. Obtener TODOS los pagos y planes de pago para esos créditos en consultas optimizadas.
    const creditIds = activeCredits.map(c => c.id);

    const placeholders = creditIds.map(() => '?').join(',');
    const [paymentRows, paymentPlanRows] = await Promise.all([
        query(`SELECT * FROM payments_registered WHERE creditId IN (${placeholders})`, creditIds),
        query(`SELECT * FROM payment_plan WHERE creditId IN (${placeholders})`, creditIds)
    ]);


    // 3. Agrupar los datos por creditId para fácil acceso.
    const paymentsByCreditId = new Map<string, RegisteredPayment[]>();
    for (const payment of paymentRows) {
        if (!paymentsByCreditId.has(payment.creditId)) {
            paymentsByCreditId.set(payment.creditId, []);
        }
        paymentsByCreditId.get(payment.creditId)!.push(payment);
    }
    const paymentPlansByCreditId = new Map<string, any[]>();
    for (const plan of paymentPlanRows) {
        if (!paymentPlansByCreditId.has(plan.creditId)) {
            paymentPlansByCreditId.set(plan.creditId, []);
        }
        paymentPlansByCreditId.get(plan.creditId)!.push(plan);
    }
    
    const asOfDate = toNicaraguaTime(nowInNicaragua());

    // 4. Procesar cada crédito usando los datos ya obtenidos en memoria.
    const portfolioCredits = activeCredits.map(credit => {
        const creditWithDetails = { 
            ...credit, 
            registeredPayments: paymentsByCreditId.get(credit.id) || [],
            paymentPlan: paymentPlansByCreditId.get(credit.id) || []
        };
        const details = calculateCreditStatusDetails(creditWithDetails as CreditDetail, asOfDate);
        return {
            ...creditWithDetails,
            details,
        };
    });
    
    const statusOrder: Record<string, number> = {
        'dueToday': 1,
        'overdue': 2,
        'expired': 3, 
        'upToDate': 4
    };
    
    const getSortKey = (details: CreditStatusDetails): string => {
        if(details.isDueToday) return 'dueToday';
        if(details.overdueAmount > 0) return 'overdue';
        if(details.isExpired) return 'expired';
        return 'upToDate';
    }
    
    const paidTodayCredits = portfolioCredits.filter(c => c.details.paidToday > 0);
    const notPaidTodayCredits = portfolioCredits.filter(c => c.details.paidToday === 0);

    const sortedNotPaidCredits = notPaidTodayCredits.sort((a, b) => {
        const keyA = getSortKey(a.details);
        const keyB = getSortKey(b.details);
        
        if (statusOrder[keyA] !== statusOrder[keyB]) {
            return statusOrder[keyA] - statusOrder[keyB];
        }
        if (keyA === 'overdue') {
            return b.details.lateDays - a.details.lateDays;
        }
        return 0;
    });

    const dailySummary = await getGestorDashboardData(gestor, activeCredits);

    return {
        portfolio: [...paidTodayCredits, ...sortedNotPaidCredits],
        dailySummary: dailySummary
    };
}


/**
 * Calcula los indicadores clave de rendimiento para el panel de un Gestor usando MySQL.
 * Optimizado para rendimiento al aceptar datos pre-cargados.
 */
export async function getGestorDashboardData(gestor: User, activeCredits: CreditDetail[]): Promise<GestorDashboardData> {
    const gestorName = gestor.fullName;

    const { collections } = await generateDailyActivityReport(gestor.id);
    
    let metaDeCobro = 0;
    const clientsPaidToday = new Set<string>();

    const asOfDate = toNicaraguaTime(nowInNicaragua());

    if (activeCredits.length > 0) {
        const creditIds = activeCredits.map(c => c.id);
        const placeholders = creditIds.map(() => '?').join(',');
        
        const [paymentPlans, paymentRows]: [any[], any[]] = await Promise.all([
             query(`SELECT * FROM payment_plan WHERE creditId IN (${placeholders})`, creditIds),
             query(`SELECT * FROM payments_registered WHERE creditId IN (${placeholders})`, creditIds)
        ]);

        const paymentsByCreditId = new Map<string, any[]>();
        paymentRows.forEach(p => {
            if (!paymentsByCreditId.has(p.creditId)) paymentsByCreditId.set(p.creditId, []);
            paymentsByCreditId.get(p.creditId)!.push(p);
        });

        const paymentPlansByCreditId = new Map<string, any[]>();
        paymentPlans.forEach(p => {
            if (!paymentPlansByCreditId.has(p.creditId)) paymentPlansByCreditId.set(p.creditId, []);
            paymentPlansByCreditId.get(p.creditId)!.push(p);
        });

        for (const credit of activeCredits) {
            const creditWithPayments = { 
                ...credit, 
                registeredPayments: paymentsByCreditId.get(credit.id) || [],
                paymentPlan: paymentPlansByCreditId.get(credit.id) || []
            };
            const details = calculateCreditStatusDetails(creditWithPayments as CreditDetail, asOfDate);
            if (details.isDueToday || details.overdueAmount > 0) {
                metaDeCobro += (details.dueTodayAmount || 0) + details.overdueAmount;
            }
        }
    }


    collections.transactions.forEach(tx => {
        clientsPaidToday.add(tx.description);
    });

    let reloanEligibleCount = 0;
    for(const c of activeCredits) {
        const { remainingBalance } = calculateCreditStatusDetails(c, asOfDate);
        const paidPercentage = c.totalAmount > 0 ? ((c.totalAmount - remainingBalance) / c.totalAmount) * 100 : 0;
        if (paidPercentage >= 75) {
            reloanEligibleCount++;
        }
    }

    const paidCredits = await getPaidCreditsForGestor(gestorName, 30);
    const activeClientIds = new Set(activeCredits.map(c => c.clientId));
    const renewalCount = paidCredits.filter(c => !activeClientIds.has(c.clientId)).length;

    return {
        recuperacionTotal: collections.totalActivityAmount,
        metaDeCobro: metaDeCobro,
        totalClientesCobrados: clientsPaidToday.size,
        pendingRenewals: reloanEligibleCount + renewalCount,
    };
}

export async function getPaidCreditsForGestor(gestorName: string, daysAgo: number): Promise<CreditDetail[]> {
    const today = endOfDay(toNicaraguaTime(nowInNicaragua()));
    const dateLimit = startOfDay(subDays(today, daysAgo));
    
    // 1. Encontrar los últimos pagos de cada crédito para determinar la fecha de cancelación
    const lastPaymentsSql = `
        SELECT creditId, MAX(paymentDate) as cancellationDate
        FROM payments_registered
        WHERE status != 'ANULADO'
        GROUP BY creditId
        HAVING cancellationDate >= ?
    `;

    const lastPayments = await query(lastPaymentsSql, [dateLimit]) as { creditId: string, cancellationDate: Date }[];

    if (lastPayments.length === 0) {
        return [];
    }

    const eligibleCreditIds = lastPayments.map(p => p.creditId);

    // 2. Obtener los créditos que son 'Paid' y están asignados al gestor
    const placeholders = eligibleCreditIds.map(() => '?').join(',');
    const creditsSql = `
        SELECT * FROM credits 
        WHERE collectionsManager = ? 
        AND status = 'Paid' 
        AND id IN (${placeholders})
    `;
    
    const credits: any = await query(creditsSql, [gestorName, ...eligibleCreditIds]);
    return credits as CreditDetail[];
}
    
