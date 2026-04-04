import { NextResponse } from 'next/server';
import { query } from '@/lib/mysql';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');
        const role = searchParams.get('role');
        const action = searchParams.get('action');

        if (!userId) {
            return NextResponse.json({ success: false, message: 'Falta userId' }, { status: 400 });
        }

        const userRows: any = await query('SELECT fullName, role, sucursal_id FROM users WHERE id = ? LIMIT 1', [userId]);
        if (!userRows || userRows.length === 0) {
            return NextResponse.json({ success: false, message: 'Usuario no existe' }, { status: 404 });
        }

        const user = userRows[0];
        const gestorName = user.fullName;
        const userRole = user.role;
        const sucursalId = user.sucursal_id;

        // Si es gerente o admin, mostrar datos de toda la sucursal
        if (role === 'manager' || userRole === 'Gerente' || userRole === 'Admin') {
            return await getManagerDashboard(userId, gestorName, sucursalId);
        }

        // Dashboard normal para gestores
        return await getGestorDashboard(gestorName);

    } catch (error: any) {
        console.error('Error mobile_dashboard API:', error);
        return NextResponse.json({ success: false, message: `Error: ${error?.message}` }, { status: 500 });
    }
}

// Dashboard para gestores (código original)
async function getGestorDashboard(gestorName: string) {
    // Total del día
    const todayRows: any = await query(`
        SELECT SUM(amount) as totalRecuperacion, COUNT(DISTINCT creditId) as totalClientesCobrados
        FROM payments_registered 
        WHERE managedBy = ? AND status != 'ANULADO'
          AND DATE(CONVERT_TZ(paymentDate, '+00:00', '-06:00')) = DATE(CONVERT_TZ(NOW(), '+00:00', '-06:00'))
    `, [gestorName]);

    const totalRecuperacion = Number(todayRows[0]?.totalRecuperacion || 0);
    const totalClientesCobrados = Number(todayRows[0]?.totalClientesCobrados || 0);

    if (totalRecuperacion === 0) {
        return NextResponse.json({
            success: true,
            data: { gestorName, totalRecuperacion: 0, diaRecaudado: 0, moraRecaudada: 0, vencidoRecaudado: 0, proximoRecaudado: 0, totalClientesCobrados: 0 }
        });
    }

    // Pagos del día con contexto del crédito para clasificar proporcionalmente
    const paymentRows: any[] = await query(`
        SELECT 
            pr.creditId, pr.amount, pr.paymentDate,
            c.dueDate,
            COALESCE((
                SELECT SUM(pp.amount) FROM payment_plan pp 
                WHERE pp.creditId = pr.creditId 
                AND DATE(CONVERT_TZ(pp.paymentDate, '+00:00', '-06:00')) < DATE(CONVERT_TZ(pr.paymentDate, '+00:00', '-06:00'))
            ), 0) as amountDueBefore,
            COALESCE((
                SELECT SUM(pr2.amount) FROM payments_registered pr2 
                WHERE pr2.creditId = pr.creditId AND pr2.status != 'ANULADO'
                AND pr2.paymentDate < pr.paymentDate
            ), 0) as paidBefore,
            COALESCE((
                SELECT SUM(pp3.amount) FROM payment_plan pp3 
                WHERE pp3.creditId = pr.creditId 
                AND DATE(CONVERT_TZ(pp3.paymentDate, '+00:00', '-06:00')) = DATE(CONVERT_TZ(pr.paymentDate, '+00:00', '-06:00'))
            ), 0) as dueTodayAmount
        FROM payments_registered pr
        JOIN credits c ON pr.creditId = c.id
        WHERE pr.managedBy = ? AND pr.status != 'ANULADO'
          AND DATE(CONVERT_TZ(pr.paymentDate, '+00:00', '-06:00')) = DATE(CONVERT_TZ(NOW(), '+00:00', '-06:00'))
    `, [gestorName]);

    let diaRecaudado = 0;
    let moraRecaudada = 0;
    let vencidoRecaudado = 0;
    let proximoRecaudado = 0;

    for (const p of paymentRows) {
        let amount = Number(p.amount || 0);
        const overdueAmount = Math.max(0, Number(p.amountDueBefore || 0) - Number(p.paidBefore || 0));
        const dueTodayAmount = Number(p.dueTodayAmount || 0);
        const dueDate = p.dueDate ? new Date(p.dueDate) : null;
        const isExpired = dueDate ? dueDate < new Date(p.paymentDate) : false;

        if (isExpired) {
            vencidoRecaudado += amount;
        } else {
            // 1. Cubre mora primero
            const moraAplicada = Math.min(amount, overdueAmount);
            moraRecaudada += moraAplicada;
            amount -= moraAplicada;

            // 2. Cubre cuota del día
            if (amount > 0 && dueTodayAmount > 0) {
                const diaAplicado = Math.min(amount, dueTodayAmount);
                diaRecaudado += diaAplicado;
                amount -= diaAplicado;
            }

            // 3. Sobrante es adelanto
            if (amount > 0) {
                proximoRecaudado += amount;
            }
        }
    }

    return NextResponse.json({
        success: true,
        data: { gestorName, totalRecuperacion, diaRecaudado, moraRecaudada, vencidoRecaudado, proximoRecaudado, totalClientesCobrados }
    });
}

// Dashboard para gerentes (nueva funcionalidad)
async function getManagerDashboard(userId: string, managerName: string, sucursalId: number) {
    // Obtener gestores de la sucursal
    const gestoresRows: any[] = await query(`
        SELECT id, fullName 
        FROM users 
        WHERE sucursal_id = ? AND role = 'Gestor' AND active = 1
        ORDER BY fullName
    `, [sucursalId]);

    // Total recaudado hoy de toda la sucursal (usando managedBy como la app web)
    const totalRows: any = await query(`
        SELECT SUM(pr.amount) as totalRecuperacion
        FROM payments_registered pr
        WHERE pr.managedBy IN (SELECT fullName FROM users WHERE sucursal_id = ? AND active = 1)
          AND pr.status != 'ANULADO'
          AND DATE(CONVERT_TZ(pr.paymentDate, '+00:00', '-06:00')) = DATE(CONVERT_TZ(NOW(), '+00:00', '-06:00'))
    `, [sucursalId]);

    const totalRecuperacion = Number(totalRows[0]?.totalRecuperacion || 0);

    // Cartera total de la sucursal
    const carteraRows: any = await query(`
        SELECT SUM(c.remainingBalance) as totalCartera
        FROM credits c
        JOIN users u ON c.collectionsManagerId = u.id
        WHERE u.sucursal_id = ? AND c.status = 'Active'
    `, [sucursalId]);

    const totalCartera = Number(carteraRows[0]?.totalCartera || 0);

    // Total en mora de la sucursal
    const moraRows: any = await query(`
        SELECT SUM(
            COALESCE((
                SELECT SUM(pp.amount) 
                FROM payment_plan pp 
                WHERE pp.creditId = c.id 
                AND DATE(CONVERT_TZ(pp.paymentDate, '+00:00', '-06:00')) < DATE(CONVERT_TZ(NOW(), '+00:00', '-06:00'))
            ), 0) - c.totalPaid
        ) as totalMora
        FROM credits c
        JOIN users u ON c.collectionsManagerId = u.id
        WHERE u.sucursal_id = ? AND c.status = 'Active'
    `, [sucursalId]);

    const totalMora = Math.max(0, Number(moraRows[0]?.totalMora || 0));

    // Solicitudes pendientes
    const solicitudesRows: any = await query(`
        SELECT COUNT(*) as count
        FROM credits c
        JOIN users u ON c.collectionsManagerId = u.id
        WHERE u.sucursal_id = ? AND c.status = 'Pending'
    `, [sucursalId]);

    const solicitudesPendientes = Number(solicitudesRows[0]?.count || 0);

    // Desembolsos pendientes (aprobados pero no desembolsados)
    const desembolsosRows: any = await query(`
        SELECT COUNT(*) as count
        FROM credits c
        JOIN users u ON c.collectionsManagerId = u.id
        WHERE u.sucursal_id = ? AND c.status = 'Approved'
    `, [sucursalId]);

    const desembolsosPendientes = Number(desembolsosRows[0]?.count || 0);

    // Recaudación por gestor (para el gráfico)
    const recaudacionPorGestor: any[] = [];
    for (const gestor of gestoresRows) {
        const gestorRecaudacion: any = await query(`
            SELECT 
                SUM(pr.amount) as total,
                MAX(pr.paymentDate) as ultimaCuota
            FROM payments_registered pr
            WHERE pr.managedBy = ? AND pr.status != 'ANULADO'
              AND DATE(CONVERT_TZ(pr.paymentDate, '+00:00', '-06:00')) = DATE(CONVERT_TZ(NOW(), '+00:00', '-06:00'))
        `, [gestor.fullName]);

        const total = Number(gestorRecaudacion[0]?.total || 0);
        const ultimaCuota = gestorRecaudacion[0]?.ultimaCuota;

        recaudacionPorGestor.push({
            gestorId: gestor.id,
            gestorName: gestor.fullName,
            totalRecaudado: total,
            ultimaCuota: ultimaCuota || null,
            cordobas: total, // Por ahora todo en córdobas
            dolares: 0
        });
    }

    // Ordenar por total recaudado descendente
    recaudacionPorGestor.sort((a, b) => b.totalRecaudado - a.totalRecaudado);

    // Detalle de recaudación (clasificación) - usar managedBy como la app web
    const paymentRows: any[] = await query(`
        SELECT 
            pr.creditId, pr.amount, pr.paymentDate, pr.managedBy,
            c.dueDate,
            COALESCE((
                SELECT SUM(pp.amount) FROM payment_plan pp 
                WHERE pp.creditId = pr.creditId 
                AND DATE(CONVERT_TZ(pp.paymentDate, '+00:00', '-06:00')) < DATE(CONVERT_TZ(pr.paymentDate, '+00:00', '-06:00'))
            ), 0) as amountDueBefore,
            COALESCE((
                SELECT SUM(pr2.amount) FROM payments_registered pr2 
                WHERE pr2.creditId = pr.creditId AND pr2.status != 'ANULADO'
                AND pr2.paymentDate < pr.paymentDate
            ), 0) as paidBefore,
            COALESCE((
                SELECT SUM(pp3.amount) FROM payment_plan pp3 
                WHERE pp3.creditId = pr.creditId 
                AND DATE(CONVERT_TZ(pp3.paymentDate, '+00:00', '-06:00')) = DATE(CONVERT_TZ(pr.paymentDate, '+00:00', '-06:00'))
            ), 0) as dueTodayAmount
        FROM payments_registered pr
        JOIN credits c ON pr.creditId = c.id
        WHERE pr.managedBy IN (SELECT fullName FROM users WHERE sucursal_id = ? AND active = 1)
          AND pr.status != 'ANULADO'
          AND DATE(CONVERT_TZ(pr.paymentDate, '+00:00', '-06:00')) = DATE(CONVERT_TZ(NOW(), '+00:00', '-06:00'))
    `, [sucursalId]);

    let diaRecaudado = 0;
    let moraRecaudada = 0;
    let vencidoRecaudado = 0;
    let proximoRecaudado = 0;

    for (const p of paymentRows) {
        let amount = Number(p.amount || 0);
        const overdueAmount = Math.max(0, Number(p.amountDueBefore || 0) - Number(p.paidBefore || 0));
        const dueTodayAmount = Number(p.dueTodayAmount || 0);
        const dueDate = p.dueDate ? new Date(p.dueDate) : null;
        const isExpired = dueDate ? dueDate < new Date(p.paymentDate) : false;

        if (isExpired) {
            vencidoRecaudado += amount;
        } else {
            const moraAplicada = Math.min(amount, overdueAmount);
            moraRecaudada += moraAplicada;
            amount -= moraAplicada;

            if (amount > 0 && dueTodayAmount > 0) {
                const diaAplicado = Math.min(amount, dueTodayAmount);
                diaRecaudado += diaAplicado;
                amount -= diaAplicado;
            }

            if (amount > 0) {
                proximoRecaudado += amount;
            }
        }
    }

    return NextResponse.json({
        success: true,
        data: {
            gestorName: managerName,
            totalRecuperacion,
            totalCartera,
            totalMora,
            solicitudesPendientes,
            desembolsosPendientes,
            diaRecaudado,
            moraRecaudada,
            vencidoRecaudado,
            proximoRecaudado,
            totalClientesCobrados: paymentRows.length,
            recaudacionPorGestor
        }
    });
}
