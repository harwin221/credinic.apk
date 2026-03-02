
'use server';

import { query } from '@/lib/mysql';
import type { User, CreditDetail } from '@/lib/types';
import { format, isValid, parseISO, startOfDay, endOfDay } from 'date-fns';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';

export interface DisburserDashboardData {
  disbursedToday: number;
  rejectedToday: number;
  pendingDisbursementsCount: number;
}

import { todayInNicaragua } from '@/lib/date-utils';

export async function getDisburserDashboardData(disburserName: string): Promise<DisburserDashboardData> {
  const todayNicaragua = todayInNicaragua();
  const startOfDayUTC = fromZonedTime(startOfDay(parseISO(todayNicaragua)), 'America/Managua');
  const endOfDayUTC = fromZonedTime(endOfDay(parseISO(todayNicaragua)), 'America/Managua');

  const disbursedSql = `SELECT SUM(disbursedAmount) as total FROM credits WHERE disbursedBy = ? AND deliveryDate BETWEEN ? AND ? AND status = 'Active'`;
  const rejectedSql = `SELECT COUNT(*) as total FROM credits WHERE rejectedBy = ? AND status = 'Rejected' AND approvalDate BETWEEN ? AND ?`;
  const pendingSql = `SELECT COUNT(*) as total FROM credits WHERE status = 'Approved'`;

  const [disbursedResult, rejectedResult, pendingResult]: [any, any, any] = await Promise.all([
      query(disbursedSql, [disburserName, startOfDayUTC, endOfDayUTC]),
      query(rejectedSql, [disburserName, startOfDayUTC, endOfDayUTC]),
      query(pendingSql)
  ]);

  return {
    disbursedToday: disbursedResult[0]?.total || 0,
    rejectedToday: rejectedResult[0]?.total || 0,
    pendingDisbursementsCount: pendingResult[0]?.total || 0,
  };
}

export async function getDisbursementOrigin(actor: User): Promise<{ id: string, name: string}[]> {
    // Por ahora, solo la caja "propia" del usuario es una opción.
    // En el futuro, esto podría expandirse para incluir bóvedas de la oficina principal, etc.
    return [{
        id: `caja_usuario_${actor.id}`,
        name: `Caja de ${actor.fullName}`
    }];
}
