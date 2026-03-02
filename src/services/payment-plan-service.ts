'use server';

import { query } from '@/lib/mysql';
import type { AppUser, Payment } from '@/lib/types';
import { createLog } from './audit-log-service';
import { isoToMySQLDateTime } from '@/lib/date-utils';

/**
 * Actualiza las fechas del plan de pagos de un crédito
 * Solo disponible para administradores
 */
export async function updatePaymentPlanDates(
  creditId: string,
  updatedPayments: { paymentNumber: number; paymentDate: string }[],
  actor: AppUser
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`Iniciando actualización de fechas para crédito ${creditId}:`, updatedPayments);

    // Verificar que solo administradores pueden editar fechas
    if (actor.role.toUpperCase() !== 'ADMINISTRADOR') {
      console.log(`Acceso denegado para usuario ${actor.fullName} con rol ${actor.role}`);
      return { success: false, error: 'Solo los administradores pueden editar fechas del plan de pagos.' };
    }

    // Verificar que el crédito existe
    const creditResult: any = await query('SELECT id, creditNumber, clientName FROM credits WHERE id = ? LIMIT 1', [creditId]);
    if (creditResult.length === 0) {
      console.log(`Crédito ${creditId} no encontrado`);
      return { success: false, error: 'Crédito no encontrado.' };
    }

    const credit = creditResult[0];
    console.log(`Crédito encontrado: ${credit.creditNumber} - ${credit.clientName}`);

    // Actualizar cada fecha en la base de datos
    for (const payment of updatedPayments) {
      // Convertir la fecha a formato MySQL con mediodía para evitar problemas de zona horaria
      const mysqlDate = `${payment.paymentDate} 12:00:00`;
      
      console.log(`Actualizando pago ${payment.paymentNumber} a fecha ${mysqlDate}`);
      
      const updateResult = await query(
        'UPDATE payment_plan SET paymentDate = ? WHERE creditId = ? AND paymentNumber = ?',
        [mysqlDate, creditId, payment.paymentNumber]
      );

      console.log(`Resultado actualización pago ${payment.paymentNumber}:`, updateResult);
    }

    // Marcar el crédito como editado manualmente agregando un campo especial en la auditoría
    await createLog(
      actor,
      'payment_plan:manual_edit',
      `Editó fechas del plan de pagos del crédito ${credit.creditNumber} para ${credit.clientName}. Se modificaron ${updatedPayments.length} fechas MANUALMENTE.`,
      { 
        targetId: creditId,
        details: {
          manualEdit: true,
          editedBy: actor.fullName,
          editedAt: new Date().toISOString(),
          updatedPayments: updatedPayments.map(p => ({
            paymentNumber: p.paymentNumber,
            newDate: p.paymentDate
          }))
        }
      }
    );

    console.log(`Actualización completada exitosamente para crédito ${creditId}`);
    return { success: true };

  } catch (error: any) {
    console.error(`Error al actualizar fechas del plan de pagos para crédito ${creditId}:`, error);
    return { success: false, error: `Error en la base de datos: ${error.message || 'Error desconocido'}` };
  }
}

/**
 * Obtiene el plan de pagos de un crédito
 */
export async function getPaymentPlan(creditId: string): Promise<Payment[]> {
  try {
    const paymentPlan: any = await query(
      'SELECT * FROM payment_plan WHERE creditId = ? ORDER BY paymentNumber',
      [creditId]
    );

    return paymentPlan.map((p: any) => ({
      ...p,
      paymentDate: p.paymentDate ? new Date(p.paymentDate).toISOString() : null
    })) as Payment[];

  } catch (error: any) {
    console.error(`Error al obtener plan de pagos para crédito ${creditId}:`, error);
    return [];
  }
}