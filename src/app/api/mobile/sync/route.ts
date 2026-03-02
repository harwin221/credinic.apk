import { NextResponse } from 'next/server';
import { getSession } from '@/app/(auth)/login/actions';
import { getCreditsAdmin } from '@/services/credit-service-server';
import { query } from '@/lib/mysql';

export const dynamic = 'force-dynamic';

/**
 * Endpoint para sincronización completa de datos del gestor
 * Descarga TODA la cartera asignada al gestor para trabajo offline
 */
export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Roles autorizados
    if (!['GESTOR', 'ADMINISTRADOR', 'GERENTE', 'FINANZAS', 'OPERATIVO'].includes(session.role)) {
      return NextResponse.json({ error: 'Rol no autorizado para sincronización móvil' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const lastSync = searchParams.get('lastSync'); // Para sincronización incremental

    // Obtener créditos activos del gestor
    const { credits } = await getCreditsAdmin({
      user: session,
      status: 'Active'
    });

    // Obtener datos adicionales necesarios para offline
    const clientIds = [...new Set(credits.map(c => c.clientId))];

    // Obtener clientes completos
    const clientsQuery = clientIds.length > 0
      ? `SELECT * FROM clients WHERE id IN (${clientIds.map(() => '?').join(',')})`
      : 'SELECT * FROM clients WHERE 1=0';

    const clients = clientIds.length > 0
      ? await query(clientsQuery, clientIds)
      : [];

    // Obtener planes de pago para todos los créditos
    const creditIds = credits.map(c => c.id);
    const paymentPlansQuery = creditIds.length > 0
      ? `SELECT * FROM payment_plan WHERE creditId IN (${creditIds.map(() => '?').join(',')}) ORDER BY paymentNumber`
      : 'SELECT * FROM payment_plan WHERE 1=0';

    const paymentPlans = creditIds.length > 0
      ? await query(paymentPlansQuery, creditIds)
      : [];

    // Obtener pagos registrados
    const paymentsQuery = creditIds.length > 0
      ? `SELECT * FROM payments_registered WHERE creditId IN (${creditIds.map(() => '?').join(',')}) AND status != 'ANULADO' ORDER BY paymentDate DESC`
      : 'SELECT * FROM payments_registered WHERE 1=0';

    const payments = creditIds.length > 0
      ? await query(paymentsQuery, creditIds)
      : [];

    // Obtener configuraciones del sistema
    const systemConfig = {
      companyName: 'CrediNic',
      timezone: 'America/Managua',
      currency: 'NIO',
      receiptFooter: 'Gracias por su pago'
    };

    const syncData = {
      timestamp: new Date().toISOString(),
      gestor: {
        id: session.id,
        name: session.fullName,
        sucursal: session.sucursalName
      },
      credits: credits,
      clients: clients,
      paymentPlans: paymentPlans,
      payments: payments,
      systemConfig: systemConfig,
      stats: {
        totalCredits: credits.length,
        totalClients: clients.length,
        totalPayments: payments.length
      }
    };

    return NextResponse.json(syncData);

  } catch (error) {
    console.error('[API Mobile Sync Error]', error);
    return NextResponse.json({
      error: 'Error en sincronización móvil',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}