import { NextResponse } from 'next/server';
import { query } from '@/lib/mysql';
import { getSession } from '@/app/(auth)/login/actions';
import { calculateAveragePaymentDelay } from '@/lib/utils';
import type { CreditDetail } from '@/lib/types';

export const dynamic = 'force-dynamic';

interface ClienteGanadoPerdido {
  clientId: string;
  clientName: string;
  montoEntregado: number;
  fecha: string;
  promedioCredito: number;
  promedioCliente: number;
  estado: 'NUEVO' | 'INACTIVO' | 'PERDIDO';
}

interface GestorData {
  gestorName: string;
  ganados: ClienteGanadoPerdido[];
  perdidos: ClienteGanadoPerdido[];
  totalGanados: number;
  totalPerdidos: number;
  montoGanados: number;
  montoPerdidos: number;
}

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const fechaDesde = searchParams.get('fechaDesde');
    const fechaHasta = searchParams.get('fechaHasta');
    const sucursalId = searchParams.get('sucursalId');
    const gestorId = searchParams.get('gestorId');

    if (!fechaDesde || !fechaHasta) {
      return NextResponse.json({ success: false, error: 'Fechas requeridas' }, { status: 400 });
    }

    const userRole = session.role.toUpperCase();

    // Obtener gestores según permisos
    let gestoresQuery = 'SELECT id, fullName, sucursal_id FROM users WHERE role = "GESTOR"';
    const gestoresParams: any[] = [];

    if (userRole === 'GERENTE' && session.sucursal) {
      gestoresQuery += ' AND sucursal_id = ?';
      gestoresParams.push(session.sucursal);
    }

    if (sucursalId && sucursalId !== 'all' && userRole === 'ADMINISTRADOR') {
      gestoresQuery += ' AND sucursal_id = ?';
      gestoresParams.push(sucursalId);
    }

    if (gestorId && gestorId !== 'all') {
      gestoresQuery += ' AND id = ?';
      gestoresParams.push(gestorId);
    }

    const gestores: any[] = await query(gestoresQuery, gestoresParams);

    const reportData: GestorData[] = [];

    for (const gestor of gestores) {
      const ganados: ClienteGanadoPerdido[] = [];
      const perdidos: ClienteGanadoPerdido[] = [];

      // ============================================
      // GANADOS - NUEVOS (Primer crédito del cliente)
      // ============================================
      const nuevosQuery = `
        SELECT 
          c.id as creditId,
          c.clientId,
          cl.name as clientName,
          c.principalAmount as montoEntregado,
          c.deliveryDate as fecha
        FROM credits c
        INNER JOIN clients cl ON c.clientId = cl.id
        WHERE c.collectionsManager = ?
          AND c.status IN ('Active', 'Paid')
          AND c.deliveryDate BETWEEN ? AND ?
          AND (
            SELECT COUNT(*) FROM credits c2 
            WHERE c2.clientId = c.clientId 
            AND c2.id != c.id
          ) = 0
        ORDER BY c.deliveryDate
      `;

      const nuevos: any[] = await query(nuevosQuery, [gestor.fullName, fechaDesde, fechaHasta]);

      for (const nuevo of nuevos) {
        ganados.push({
          clientId: nuevo.clientId,
          clientName: nuevo.clientName,
          montoEntregado: nuevo.montoEntregado,
          fecha: nuevo.fecha,
          promedioCredito: 0.00,
          promedioCliente: 0.00,
          estado: 'NUEVO'
        });
      }

      // ============================================
      // GANADOS - INACTIVOS (Cliente que renovó después de cancelar)
      // ============================================
      const inactivosQuery = `
        SELECT 
          c.id as creditId,
          c.clientId,
          cl.name as clientName,
          c.principalAmount as montoEntregado,
          c.deliveryDate as fecha
        FROM credits c
        INNER JOIN clients cl ON c.clientId = cl.id
        WHERE c.collectionsManager = ?
          AND c.status IN ('Active', 'Paid')
          AND c.deliveryDate BETWEEN ? AND ?
          AND (
            SELECT COUNT(*) FROM credits c2 
            WHERE c2.clientId = c.clientId 
            AND c2.id != c.id
          ) > 0
        ORDER BY c.deliveryDate
      `;

      const inactivos: any[] = await query(inactivosQuery, [gestor.fullName, fechaDesde, fechaHasta]);

      for (const inactivo of inactivos) {
        // Obtener crédito anterior (el que canceló antes de este)
        const creditoAnteriorQuery = `
          SELECT id FROM credits 
          WHERE clientId = ? 
          AND id != ? 
          AND deliveryDate < ?
          ORDER BY deliveryDate DESC 
          LIMIT 1
        `;
        const creditoAnterior: any[] = await query(creditoAnteriorQuery, [
          inactivo.clientId,
          inactivo.creditId,
          inactivo.fecha
        ]);

        let promedioCredito = 0;
        if (creditoAnterior.length > 0) {
          const creditDetail = await getCreditWithDetails(creditoAnterior[0].id);
          if (creditDetail) {
            const { avgLateDaysForCredit } = calculateAveragePaymentDelay(creditDetail);
            promedioCredito = avgLateDaysForCredit;
          }
        }

        // Promedio consolidado del cliente
        const promedioCliente = await getClientAverageDelay(inactivo.clientId);

        ganados.push({
          clientId: inactivo.clientId,
          clientName: inactivo.clientName,
          montoEntregado: inactivo.montoEntregado,
          fecha: inactivo.fecha,
          promedioCredito,
          promedioCliente,
          estado: 'INACTIVO'
        });
      }

      // ============================================
      // PERDIDOS (Cliente que canceló y no renovó)
      // ============================================
      const perdidosQuery = `
        SELECT 
          c.id as creditId,
          c.clientId,
          cl.name as clientName,
          c.principalAmount as montoEntregado,
          MAX(pr.paymentDate) as fechaCancelacion
        FROM credits c
        INNER JOIN clients cl ON c.clientId = cl.id
        INNER JOIN payments_registered pr ON c.id = pr.creditId
        WHERE c.collectionsManager = ?
          AND c.status = 'Paid'
          AND pr.status != 'ANULADO'
        GROUP BY c.id, c.clientId, cl.name, c.principalAmount
        HAVING fechaCancelacion BETWEEN ? AND ?
          AND NOT EXISTS (
            SELECT 1 FROM credits c2 
            WHERE c2.clientId = c.clientId 
            AND c2.deliveryDate > fechaCancelacion
          )
        ORDER BY fechaCancelacion
      `;

      const perdidosData: any[] = await query(perdidosQuery, [gestor.fullName, fechaDesde, fechaHasta]);

      for (const perdido of perdidosData) {
        // Promedio del crédito que canceló
        const creditDetail = await getCreditWithDetails(perdido.creditId);
        let promedioCredito = 0;
        if (creditDetail) {
          const { avgLateDaysForCredit } = calculateAveragePaymentDelay(creditDetail);
          promedioCredito = avgLateDaysForCredit;
        }

        // Promedio consolidado del cliente
        const promedioCliente = await getClientAverageDelay(perdido.clientId);

        perdidos.push({
          clientId: perdido.clientId,
          clientName: perdido.clientName,
          montoEntregado: perdido.montoEntregado,
          fecha: perdido.fechaCancelacion,
          promedioCredito,
          promedioCliente,
          estado: 'PERDIDO'
        });
      }

      // Calcular totales
      const totalGanados = ganados.length;
      const totalPerdidos = perdidos.length;
      const montoGanados = ganados.reduce((sum, c) => sum + c.montoEntregado, 0);
      const montoPerdidos = perdidos.reduce((sum, c) => sum + c.montoEntregado, 0);

      if (totalGanados > 0 || totalPerdidos > 0) {
        reportData.push({
          gestorName: gestor.fullName,
          ganados,
          perdidos,
          totalGanados,
          totalPerdidos,
          montoGanados,
          montoPerdidos
        });
      }
    }

    return NextResponse.json({ success: true, data: reportData });

  } catch (error: any) {
    console.error('Error generating ganados-perdidos report:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error al generar el reporte' },
      { status: 500 }
    );
  }
}

// Función auxiliar para obtener crédito con detalles
async function getCreditWithDetails(creditId: string): Promise<CreditDetail | null> {
  try {
    const creditRows: any[] = await query('SELECT * FROM credits WHERE id = ? LIMIT 1', [creditId]);
    if (creditRows.length === 0) return null;

    const credit = creditRows[0];

    const [paymentPlan, registeredPayments]: [any[], any[]] = await Promise.all([
      query('SELECT * FROM payment_plan WHERE creditId = ? ORDER BY paymentNumber', [creditId]),
      query('SELECT * FROM payments_registered WHERE creditId = ? ORDER BY paymentDate DESC', [creditId])
    ]);

    return {
      ...credit,
      paymentPlan,
      registeredPayments
    } as CreditDetail;
  } catch (error) {
    console.error('Error getting credit details:', error);
    return null;
  }
}

// Función auxiliar para calcular promedio consolidado del cliente
async function getClientAverageDelay(clientId: string): Promise<number> {
  try {
    const credits: any[] = await query(
      'SELECT id FROM credits WHERE clientId = ? AND status IN ("Active", "Paid")',
      [clientId]
    );

    if (credits.length === 0) return 0;

    let totalDelay = 0;
    let totalCredits = 0;

    for (const credit of credits) {
      const creditDetail = await getCreditWithDetails(credit.id);
      if (creditDetail) {
        const { avgLateDaysForCredit } = calculateAveragePaymentDelay(creditDetail);
        totalDelay += avgLateDaysForCredit;
        totalCredits++;
      }
    }

    return totalCredits > 0 ? totalDelay / totalCredits : 0;
  } catch (error) {
    console.error('Error calculating client average delay:', error);
    return 0;
  }
}
