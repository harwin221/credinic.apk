import { NextResponse } from 'next/server';
import { getSession } from '@/app/(auth)/login/actions';
import { query } from '@/lib/mysql';
import { nowInNicaragua } from '@/lib/date-utils';

/**
 * Endpoint para verificar estado de sincronización y estadísticas del gestor
 * Útil para la app móvil para saber cuándo sincronizar
 */
export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const includeStats = searchParams.get('stats') === 'true';

    // Información básica del gestor
    const gestorInfo = {
      id: session.id,
      name: session.fullName,
      role: session.role,
      sucursal: session.sucursalName,
      lastActivity: nowInNicaragua()
    };

    if (!includeStats) {
      return NextResponse.json({
        success: true,
        gestor: gestorInfo,
        timestamp: nowInNicaragua()
      });
    }

    // Obtener estadísticas detalladas
    const statsQueries = await Promise.all([
      // Créditos activos del gestor
      query(`
        SELECT COUNT(*) as activeCredits, SUM(totalAmount - COALESCE(
          (SELECT SUM(amount) FROM payments_registered pr 
           WHERE pr.creditId = c.id AND pr.status != 'ANULADO'), 0
        )) as totalBalance
        FROM credits c 
        WHERE c.collectionsManager = ? AND c.status = 'Active'
      `, [session.fullName]),

      // Pagos del día
      query(`
        SELECT COUNT(*) as todayPayments, SUM(pr.amount) as todayAmount
        FROM payments_registered pr
        JOIN credits c ON pr.creditId = c.id
        WHERE c.collectionsManager = ? 
        AND DATE(pr.paymentDate) = CURDATE()
        AND pr.status != 'ANULADO'
      `, [session.fullName]),

      // Clientes únicos
      query(`
        SELECT COUNT(DISTINCT c.clientId) as uniqueClients
        FROM credits c
        WHERE c.collectionsManager = ? AND c.status = 'Active'
      `, [session.fullName]),

      // Último pago registrado
      query(`
        SELECT pr.paymentDate, pr.amount, c.clientName
        FROM payments_registered pr
        JOIN credits c ON pr.creditId = c.id
        WHERE c.collectionsManager = ?
        AND pr.status != 'ANULADO'
        ORDER BY pr.paymentDate DESC
        LIMIT 1
      `, [session.fullName])
    ]);

    const [activeCreditsResult, todayPaymentsResult, uniqueClientsResult, lastPaymentResult] = statsQueries;

    const stats = {
      portfolio: {
        activeCredits: activeCreditsResult[0]?.activeCredits || 0,
        totalBalance: activeCreditsResult[0]?.totalBalance || 0,
        uniqueClients: uniqueClientsResult[0]?.uniqueClients || 0
      },
      today: {
        payments: todayPaymentsResult[0]?.todayPayments || 0,
        amount: todayPaymentsResult[0]?.todayAmount || 0
      },
      lastActivity: {
        lastPayment: lastPaymentResult[0] ? {
          date: lastPaymentResult[0].paymentDate,
          amount: lastPaymentResult[0].amount,
          client: lastPaymentResult[0].clientName
        } : null
      }
    };

    return NextResponse.json({
      success: true,
      gestor: gestorInfo,
      stats: stats,
      timestamp: nowInNicaragua()
    });

  } catch (error) {
    console.error('[API Mobile Status Error]', error);
    return NextResponse.json({ 
      error: 'Error obteniendo estado móvil',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}