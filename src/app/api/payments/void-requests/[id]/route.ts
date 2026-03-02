import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/mysql';
import { createLog } from '@/services/audit-log-service';
import { getUser } from '@/services/user-service-server';
import { getSession } from '@/app/(auth)/login/actions';
import type { AppUser } from '@/lib/types';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await params;
    const { id: paymentId } = resolvedParams;
    const { action } = await request.json();

    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    }

    const user = session;

    // Solo administradores pueden aprobar/rechazar anulaciones
    if (user.role !== 'ADMINISTRADOR') {
      return NextResponse.json({
        success: false,
        error: 'Solo los administradores pueden procesar solicitudes de anulación'
      }, { status: 403 });
    }

    // Validar acción
    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json({
        success: false,
        error: 'Acción inválida'
      }, { status: 400 });
    }

    // Verificar que el pago existe y está pendiente de anulación
    const paymentResult: any = await query(
      `SELECT pr.*, c.creditNumber, c.clientName 
       FROM payments_registered pr
       JOIN credits c ON pr.creditId = c.id
       WHERE pr.id = ? AND pr.status = 'ANULACION_PENDIENTE'`,
      [paymentId]
    );

    if (paymentResult.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Solicitud de anulación no encontrada o ya procesada'
      }, { status: 404 });
    }

    const payment = paymentResult[0];

    if (action === 'approve') {
      // Aprobar anulación - marcar pago como anulado
      await query(
        `UPDATE payments_registered 
         SET status = 'ANULADO', 
             voidApprovedBy = ?, 
             voidApprovedDate = NOW()
         WHERE id = ?`,
        [user.fullName, paymentId]
      );

      // Registrar en auditoría
      await createLog(
        user,
        'payment:void_approved',
        `Aprobó la anulación del pago de ${payment.amount} del crédito ${payment.creditNumber} (${payment.clientName}). Motivo: ${payment.voidReason}`,
        {
          targetId: payment.creditId,
          details: {
            paymentId,
            amount: payment.amount,
            originalGestor: payment.managedBy,
            requestedBy: payment.voidRequestedBy,
            voidReason: payment.voidReason
          }
        }
      );

      return NextResponse.json({
        success: true,
        message: 'Anulación aprobada exitosamente'
      });

    } else if (action === 'reject') {
      // Rechazar anulación - devolver pago a estado válido
      await query(
        `UPDATE payments_registered 
         SET status = 'VALIDO', 
             voidRequestedBy = NULL,
             voidReason = NULL,
             voidRequestDate = NULL,
             voidRejectedBy = ?,
             voidRejectedDate = NOW()
         WHERE id = ?`,
        [user.fullName, paymentId]
      );

      // Registrar en auditoría
      await createLog(
        user,
        'payment:void_rejected',
        `Rechazó la solicitud de anulación del pago de ${payment.amount} del crédito ${payment.creditNumber} (${payment.clientName}). El pago permanece válido.`,
        {
          targetId: payment.creditId,
          details: {
            paymentId,
            amount: payment.amount,
            originalGestor: payment.managedBy,
            requestedBy: payment.voidRequestedBy,
            rejectedReason: payment.voidReason
          }
        }
      );

      return NextResponse.json({
        success: true,
        message: 'Solicitud de anulación rechazada'
      });
    }

  } catch (error: any) {
    console.error('Error procesando solicitud de anulación:', error);
    return NextResponse.json({
      success: false,
      error: 'Error interno del servidor'
    }, { status: 500 });
  }
}