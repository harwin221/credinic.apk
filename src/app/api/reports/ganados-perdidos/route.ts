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
    const fechaDesde = searchParams.get('fechaDesde') || searchParams.get('from');
    const fechaHasta = searchParams.get('fechaHasta') || searchParams.get('to');
    const sucursalIds = searchParams.getAll('sucursalId').length > 0 
      ? searchParams.getAll('sucursalId') 
      : searchParams.getAll('sucursal');
    const userIds = searchParams.getAll('gestorId').length > 0 
      ? searchParams.getAll('gestorId') 
      : searchParams.getAll('user');

    if (!fechaDesde || !fechaHasta) {
      return NextResponse.json({ success: false, error: 'Fechas requeridas' }, { status: 400 });
    }

    const userRole = session.role.toUpperCase();

    // Convertir IDs de usuarios a nombres completos para buscar en collectionsManager
    let userNamesToFilter: string[] = [];
    if (userIds.length > 0) {
      const placeholders = userIds.map(() => '?').join(',');
      const userNamesResult: any[] = await query(
        `SELECT fullName FROM users WHERE id IN (${placeholders})`, 
        userIds
      );
      userNamesToFilter = userNamesResult.map(u => u.fullName);
    }

    // Obtener todos los usuarios activos que pueden tener créditos asignados
    let allUsersSql = `
      SELECT u.id, u.fullName, u.sucursal_id, u.role
      FROM users u
      WHERE u.active = true 
      AND u.role IN ('GESTOR', 'ADMINISTRADOR', 'GERENTE', 'FINANZAS', 'OPERATIVO', 'CAJERO')
    `;
    const allUsersParams: any[] = [];

    // Filtrar por sucursal si es gerente
    if (userRole === 'GERENTE' && session.sucursal) {
      allUsersSql += ' AND u.sucursal_id = ?';
      allUsersParams.push(session.sucursal);
    }

    // Filtrar por sucursales si se especificaron (solo Admin)
    if (sucursalIds.length > 0 && userRole === 'ADMINISTRADOR') {
      const placeholders = sucursalIds.map(() => '?').join(',');
      allUsersSql += ` AND u.sucursal_id IN (${placeholders})`;
      allUsersParams.push(...sucursalIds);
    }

    let allUsers: any[] = await query(allUsersSql, allUsersParams);

    // Filtrar por usuarios específicos si se especificaron
    if (userNamesToFilter.length > 0) {
      allUsers = allUsers.filter(u => userNamesToFilter.includes(u.fullName));
    }

    const reportData: GestorData[] = [];

    for (const usuario of allUsers) {
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
          AND DATE(DATE_SUB(c.deliveryDate, INTERVAL 6 HOUR)) BETWEEN ? AND ?
          AND (
            SELECT COUNT(*) FROM credits c2 
            WHERE c2.clientId = c.clientId 
            AND c2.id != c.id
          ) = 0
        ORDER BY c.deliveryDate
      `;

      const nuevos: any[] = await query(nuevosQuery, [usuario.fullName, fechaDesde, fechaHasta]);

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
      // Buscar créditos que se entregaron en el rango de fechas
      // Y que el cliente tenga un crédito anterior que fue cancelado ANTES del rango
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
          AND DATE(DATE_SUB(c.deliveryDate, INTERVAL 6 HOUR)) BETWEEN ? AND ?
          AND EXISTS (
            SELECT 1 FROM credits c_prev
            INNER JOIN payments_registered pr ON c_prev.id = pr.creditId
            WHERE c_prev.clientId = c.clientId
            AND c_prev.id != c.id
            AND c_prev.status = 'Paid'
            AND pr.status != 'ANULADO'
            AND DATE(DATE_SUB(pr.paymentDate, INTERVAL 6 HOUR)) < ?
            GROUP BY c_prev.id
          )
        ORDER BY c.deliveryDate
      `;

      const inactivos: any[] = await query(inactivosQuery, [usuario.fullName, fechaDesde, fechaHasta, fechaDesde]);

      for (const inactivo of inactivos) {
        // Obtener el crédito anterior más reciente (el que canceló antes de renovar)
        const creditoAnteriorQuery = `
          SELECT id FROM credits 
          WHERE clientId = ? 
          AND id != ? 
          AND deliveryDate < ?
          AND status = 'Paid'
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
          AND DATE(DATE_SUB(pr.paymentDate, INTERVAL 6 HOUR)) BETWEEN ? AND ?
        GROUP BY c.id, c.clientId, cl.name, c.principalAmount
        HAVING NOT EXISTS (
            SELECT 1 FROM credits c2 
            WHERE c2.clientId = c.clientId 
            AND c2.id != c.id
            AND c2.status IN ('Active', 'Paid')
            AND c2.deliveryDate >= c.deliveryDate
          )
        ORDER BY fechaCancelacion
      `;

      const perdidosData: any[] = await query(perdidosQuery, [usuario.fullName, fechaDesde, fechaHasta]);

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
          gestorName: usuario.fullName,
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
