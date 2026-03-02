
'use server';

import { query } from '@/lib/mysql';
import type { User, CashClosure } from '@/lib/types';
import { createLog } from '@/services/audit-log-service';
import { revalidatePath } from 'next/cache';

export async function saveClosure(closureData: Omit<CashClosure, 'id' | 'closureDate'>, actor: User): Promise<{ success: boolean; error?: string; closureId?: string }> {
  try {
    const newClosureId = `cls_${Date.now()}`;
    const { userId, userName, sucursalId, systemBalance, physicalBalance, difference, denominationsNIO, denominationsUSD, exchangeRate, clientDeposits, manualTransfers, closedByUserId, closedByUserName } = closureData;

    const sql = `
        INSERT INTO closures (
            id, userId, userName, sucursalId, closureDate, systemBalance, physicalBalance, difference, 
            denominationsNIO, denominationsUSD, exchangeRate, clientDeposits, manualTransfers, 
            closedByUserId, closedByUserName
        ) VALUES (?, ?, ?, ?, NOW(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    await query(sql, [
        newClosureId, userId, userName, sucursalId, systemBalance, physicalBalance, difference,
        JSON.stringify(denominationsNIO || {}), JSON.stringify(denominationsUSD || {}), exchangeRate,
        clientDeposits || 0, manualTransfers || 0, closedByUserId, closedByUserName
    ]);
    
    await createLog(actor, 'audit:closure', `Realizó un arqueo de caja para ${userName} con una diferencia de C$${difference.toFixed(2)}.`, { targetId: newClosureId });
    
    revalidatePath('/reports/closures-history');
    return { success: true, closureId: newClosureId };
  } catch (error: any) {
    console.error("Error al guardar el arqueo de caja en MySQL:", error);
    return { success: false, error: error.message || 'No se pudo guardar el arqueo de caja.' };
  }
}
