'use server';

import { query } from '@/lib/mysql';
import type { AppUser } from '@/lib/types';
import { headers } from 'next/headers';

/**
 * Crea una nueva entrada de registro de auditoría en la tabla `audit_logs` de MySQL.
 * @param actor El usuario que realiza la acción.
 * @param action Un nombre de acción corto y legible por máquina (p. ej., 'user:create').
 * @param details Una descripción legible por humanos de la acción.
 * @param metadata Metadatos adicionales, incluyendo targetId y detalles de los cambios.
 */
export const createLog = async (
  actor: AppUser,
  action: string,
  details: string,
  metadata: { targetId: string; details?: any }
): Promise<void> => {
  if (!actor || !actor.id || !actor.fullName) {
    console.warn('Registro de auditoría omitido: Actor no válido proporcionado.');
    return;
  }

  try {
    const headersList = await headers();
    const ipAddress = headersList.get('x-forwarded-for')?.split(',')[0].trim() ||
      headersList.get('x-real-ip') ||
      '127.0.0.1';

    const [entityType] = action.split(':');
    const logSql = `
        INSERT INTO audit_logs (userId, userName, ipAddress, action, details, entityId, entityType, changes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    await query(logSql, [
      actor.id,
      actor.fullName,
      ipAddress,
      action,
      details,
      metadata.targetId,
      entityType,
      metadata.details ? JSON.stringify(metadata.details) : null,
    ]);
  } catch (error) {
    console.error("Fallo al crear registro de auditoría en MySQL:", error);
  }
};
