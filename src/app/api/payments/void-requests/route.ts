import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/mysql';
import { getSession } from '@/app/(auth)/login/actions';
import { getUser } from '@/services/user-service-server';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    }

    const user = session;

    // Solo administradores pueden ver solicitudes de anulación
    if (user.role !== 'ADMINISTRADOR') {
      return NextResponse.json({
        success: false,
        error: 'Solo los administradores pueden ver solicitudes de anulación'
      }, { status: 403 });
    }

    // Obtener todas las solicitudes de anulación pendientes
    const requests: any = await query(`
      SELECT 
        pr.id,
        pr.creditId,
        c.creditNumber,
        c.clientName,
        pr.amount,
        pr.paymentDate,
        pr.managedBy,
        pr.voidRequestedBy,
        pr.voidReason,
        pr.voidRequestDate as requestDate
      FROM payments_registered pr
      JOIN credits c ON pr.creditId = c.id
      WHERE pr.status = 'ANULACION_PENDIENTE'
      ORDER BY pr.voidRequestDate DESC
    `);

    return NextResponse.json({
      success: true,
      requests
    });

  } catch (error: any) {
    console.error('Error obteniendo solicitudes de anulación:', error);
    return NextResponse.json({
      success: false,
      error: 'Error interno del servidor'
    }, { status: 500 });
  }
}