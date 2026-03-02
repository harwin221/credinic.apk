
'use server';

import { query } from '@/lib/mysql';
import type { Holiday, AppUser as User } from '@/lib/types';
import { createLog } from './audit-log-service';
import { revalidatePath } from 'next/cache';
import { formatDateForUser, isoToMySQLDateTimeNoon } from '@/lib/date-utils';
import { generatePaymentSchedule } from '@/lib/utils';

export const getHolidays = async (): Promise<Holiday[]> => {
    const rows: any = await query('SELECT * FROM holidays ORDER BY date ASC');
    // Convertir fechas de MySQL a formato YYYY-MM-DD sin conversión de zona horaria
    return rows.map((row: any) => {
        const date = new Date(row.date);
        // Extraer año, mes y día directamente del objeto Date
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');

        return {
            ...row,
            date: `${year}-${month}-${day}`
        };
    });
};

export const addHoliday = async (holidayData: Omit<Holiday, 'id'>, actor: User): Promise<{ success: boolean, id?: string, error?: string }> => {
    try {
        const newId = `hol_${Date.now()}`;
        const formattedDate = isoToMySQLDateTimeNoon(holidayData.date);
        await query('INSERT INTO holidays (id, name, date) VALUES (?, ?, ?)', [newId, holidayData.name, formattedDate]);
        await createLog(actor, 'settings:holiday_add', `Agregó el feriado ${holidayData.name} para la fecha ${formattedDate}.`, { targetId: newId });
        revalidatePath('/settings/holidays');
        return { success: true, id: newId };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

export const deleteHoliday = async (id: string, actor: User): Promise<{ success: boolean, error?: string }> => {
    try {
        await query('DELETE FROM holidays WHERE id = ?', [id]);
        await createLog(actor, 'settings:holiday_delete', `Eliminó el feriado con ID ${id}.`, { targetId: id });
        revalidatePath('/settings/holidays');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

export const ensurePaymentPlanExists = async (creditId: string, actor: User): Promise<{ success: boolean; message?: string; error?: string }> => {
    try {
        // 1. Check if plan exists
        const planResult: any = await query('SELECT COUNT(*) as count FROM payment_plan WHERE creditId = ?', [creditId]);
        if (planResult[0].count > 0) {
            return { success: true, message: 'El plan de pagos ya existe.' };
        }

        // 2. Fetch credit details
        const creditResult: any = await query('SELECT * FROM credits WHERE id = ?', [creditId]);
        if (creditResult.length === 0) {
            return { success: false, error: 'Crédito no encontrado.' };
        }
        const credit = creditResult[0];

        // 3. Fetch holidays
        const holidays = await getHolidays();
        const holidayDates = holidays.map(h => h.date);

        // 4. Generate schedule
        const scheduleData = generatePaymentSchedule({
            loanAmount: credit.principalAmount, // Use principalAmount
            monthlyInterestRate: credit.interestRate,
            termMonths: credit.termMonths,
            paymentFrequency: credit.paymentFrequency,
            startDate: formatDateForUser(credit.firstPaymentDate, 'yyyy-MM-dd'),
            holidays: holidayDates
        });

        if (!scheduleData) {
            return { success: false, error: 'No se pudo generar el plan de pagos.' };
        }

        // 5. Insert into DB
        const newDueDate = scheduleData.schedule[scheduleData.schedule.length - 1].paymentDate;

        // Update credit dueDate just in case
        await query('UPDATE credits SET dueDate = ? WHERE id = ?', [`${newDueDate} 12:00:00`, creditId]);

        for (const p of scheduleData.schedule) {
            // Using noon time for dates to avoid timezone issues
            await query('INSERT INTO payment_plan (creditId, paymentNumber, paymentDate, amount, principal, interest, balance) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [creditId, p.paymentNumber, `${p.paymentDate} 12:00:00`, p.amount, p.principal, p.interest, p.balance]);
        }

        await createLog(actor, 'credit:update', `Se generó automáticamente el plan de pagos para ${credit.creditNumber}.`, { targetId: creditId });

        return { success: true, message: 'Plan de pagos generado exitosamente.' };

    } catch (error: any) {
        console.error('Error ensuring payment plan:', error);
        return { success: false, error: error.message };
    }
};
