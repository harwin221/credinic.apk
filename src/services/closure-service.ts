
'use server';

import { query } from '@/lib/mysql';
import type { AppUser } from '@/lib/types';
import { startOfDay, endOfDay } from 'date-fns';
import { fromZonedTime } from 'date-fns-tz';
import { toISOString, nowInNicaragua, toNicaraguaTime } from '@/lib/date-utils';

export interface DailyTransaction {
    id: string;
    type: 'Payment' | 'Disbursement';
    amount: number;
    description: string;
    timestamp: string; // ISO string
}

export interface DailyActivitySummary {
    totalActivityAmount: number;
    transactions: DailyTransaction[];
}

export interface DailyActivityReport {
    collections: DailyActivitySummary;
    disbursements: DailyActivitySummary;
}

export async function generateDailyActivityReport(userId: string): Promise<DailyActivityReport> {
    const userResult: any = await query('SELECT fullName FROM users WHERE id = ?', [userId]);
    if (userResult.length === 0) {
        throw new Error('Usuario no encontrado para generar el reporte de actividad.');
    }
    const userName = userResult[0].fullName;

    const timeZone = 'America/Managua';
    const nowInManagua = toNicaraguaTime(nowInNicaragua());
    const startOfDayInManagua = startOfDay(nowInManagua);
    const endOfDayInManagua = endOfDay(nowInManagua);

    // Convertir a UTC para la consulta a la base de datos (MySQL suele trabajar mejor con UTC)
    const startOfDayUTC = fromZonedTime(startOfDayInManagua, timeZone);
    const endOfDayUTC = fromZonedTime(endOfDayInManagua, timeZone);

    const collections: DailyActivitySummary = { totalActivityAmount: 0, transactions: [] };
    const disbursements: DailyActivitySummary = { totalActivityAmount: 0, transactions: [] };

    // Obtener pagos (collections)
    const paymentsSql = `
        SELECT rp.id, rp.amount, c.clientName, rp.paymentDate 
        FROM payments_registered rp
        JOIN credits c ON rp.creditId = c.id
        WHERE rp.managedBy = ? AND rp.paymentDate >= ? AND rp.paymentDate <= ? AND rp.status != 'ANULADO'
    `;
    const paymentRows: any = await query(paymentsSql, [userName, startOfDayUTC, endOfDayUTC]);

    paymentRows.forEach((p: any) => {
        collections.totalActivityAmount += p.amount;
        collections.transactions.push({
            id: p.id,
            type: 'Payment',
            amount: p.amount,
            description: p.clientName,
            timestamp: toISOString(p.paymentDate) || nowInNicaragua(),
        });
    });

    // Obtener desembolsos (disbursements) - CORREGIDO
    // Se usa 'userName' (fullName) para buscar en la columna `disbursedBy`.
    const disbursementsSql = `
        SELECT id, creditNumber, clientName, disbursedAmount, deliveryDate 
        FROM credits 
        WHERE disbursedBy = ? AND deliveryDate >= ? AND deliveryDate <= ? AND status = 'Active'
    `;
    const disbursementRows: any = await query(disbursementsSql, [userName, startOfDayUTC, endOfDayUTC]);

    disbursementRows.forEach((d: any) => {
        disbursements.totalActivityAmount += d.disbursedAmount || 0;
        disbursements.transactions.push({
            id: d.creditNumber,
            type: 'Disbursement',
            amount: d.disbursedAmount || 0,
            description: d.clientName,
            timestamp: toISOString(d.deliveryDate) || nowInNicaragua(),
        });
    });

    return {
        collections,
        disbursements,
    };
}

import { getSession } from '@/app/(auth)/login/actions';

export async function deleteClosure(id: string): Promise<{ success: boolean; error?: string }> {
    try {
        const session = await getSession();
        if (!session || session.role !== 'ADMINISTRADOR') {
            return { success: false, error: 'No tiene permisos para eliminar arqueos.' };
        }
        await query('DELETE FROM closures WHERE id = ?', [id]);
        return { success: true };
    } catch (error) {
        console.error('Error deleting closure:', error);
        return { success: false, error: 'Ocurrió un error al eliminar el arqueo.' };
    }
}

export async function hasUserClosedDay(userId: string, date: Date = new Date()): Promise<boolean> {
    try {
        const timeZone = 'America/Managua';
        const dateInManagua = toNicaraguaTime(date);
        const start = fromZonedTime(startOfDay(dateInManagua), timeZone);
        const end = fromZonedTime(endOfDay(dateInManagua), timeZone);

        const rows: any = await query(
            'SELECT id FROM closures WHERE userId = ? AND closureDate >= ? AND closureDate <= ? LIMIT 1',
            [userId, start, end]
        );

        return rows.length > 0;
    } catch (error) {
        console.error('Error checking for user closure:', error);
        // En caso de error, asumimos false para no bloquear operaciones, pero logueamos el error
        return false;
    }
}
