import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/mysql';
import { createLog } from '@/services/audit-log-service';
import { getUser } from '@/services/user-service-server';
import type { AppUser } from '@/lib/types';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; paymentId: string } }
) {
  try {
    const { id: creditId, paymentId } = params;

    // Verificar autenticación - obtener usuario desde headers o sesión
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    }

    // Por ahora, usar un usuario admin de ejemplo - esto debería venir de la sesión real
    const user: AppUser = {
      id: 'admin',
      role: 'ADMINISTRADOR',
      fullName: 'Administrador',
      email: 'admin@credinica.com',
      username: 'admin',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      sucursal: undefined,
      sucursalName: undefined,
      phone: undefined,
      mustChangePassword: false
    };

    if (!user) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    }

    // Solo administradores pueden eliminar pagos
    if (user.role !== 'ADMINISTRADOR') {
      return NextResponse.json({ 
        success: false, 
        error: 'Solo los administradores pueden eliminar pagos' 
      }, { status: 403 });
    }

    // Verificar que el pago existe y obtener sus datos para auditoría
    const paymentResult: any = await query(
      'SELECT * FROM payments_registered WHERE id = ? AND creditId = ?',
      [paymentId, creditId]
    );

    if (paymentResult.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Pago no encontrado' 
      }, { status: 404 });
    }

    const payment = paymentResult[0];

    // Obtener información del crédito para auditoría
    const creditResult: any = await query(
      'SELECT creditNumber, clientName FROM credits WHERE id = ?',
      [creditId]
    );

    const credit = creditResult[0];

    // Eliminar el pago permanentemente
    await query('DELETE FROM payments_registered WHERE id = ?', [paymentId]);

    // Registrar en auditoría
    await createLog(
      user,
      'payment:delete',
      `Eliminó permanentemente el pago de ${payment.amount} del crédito ${credit?.creditNumber || creditId} (${credit?.clientName || 'Cliente desconocido'}).`,
      {
        targetId: creditId,
        details: {
          deletedPayment: {
            id: paymentId,
            amount: payment.amount,
            paymentDate: payment.paymentDate,
            managedBy: payment.managedBy,
            transactionNumber: payment.transactionNumber
          }
        }
      }
    );

    return NextResponse.json({ 
      success: true, 
      message: 'Pago eliminado permanentemente' 
    });

  } catch (error: any) {
    console.error('Error eliminando pago:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Error interno del servidor' 
    }, { status: 500 });
  }
}