
'use server';

import { query } from '@/lib/mysql';
import type { AppUser } from '@/lib/types';
import { createLog } from '@/services/audit-log-service';
import { revalidatePath } from 'next/cache';

/**
 * Elimina todos los documentos de la tabla de registros de auditoría en MySQL.
 * @param actor - El usuario que realiza la acción.
 */
export async function purgeAuditLogs(actor: AppUser): Promise<{ success: boolean; error?: string }> {
  if (actor.role !== 'ADMINISTRADOR') {
    return { success: false, error: 'Acción no autorizada.' };
  }

  try {
    await query('DELETE FROM audit_logs');

    await createLog(actor, 'system:purge', 'Purgó todos los registros de auditoría del sistema.', { targetId: 'system' });

    revalidatePath('/audit');

    return { success: true };
  } catch (error: any) {
    console.error("Error al purgar los registros de auditoría en MySQL:", error);
    return { success: false, error: 'No se pudieron eliminar los registros.' };
  }
}

export async function getAuditLogs(): Promise<any[]> {
  try {
    const logs = await query("SELECT * FROM audit_logs ORDER BY timestamp DESC");
    return logs as any[];
  } catch (error) {
    console.error("Error fetching audit logs:", error);
    throw new Error('Failed to fetch audit logs');
  }
}
