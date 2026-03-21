import { NextResponse } from 'next/server';
import { generatePaymentsDetailReport } from '@/services/report-service';
import { getUser } from '@/services/user-service-server';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');

        if (!userId) {
            return NextResponse.json({ success: false, message: 'Falta userId' }, { status: 400 });
        }

        const user = await getUser(userId);
        if (!user) {
            return NextResponse.json({ success: false, message: 'Usuario no encontrado' }, { status: 404 });
        }

        // Configurar filtros para el reporte de hoy
        const filters: any = {
            users: [userId],
            dateFrom: new Date().toISOString().split('T')[0], // Hoy
            dateTo: new Date().toISOString().split('T')[0],   // Hoy
        };

        // Si es Gerente o Admin y no especificó usuario, tal vez quiera ver toda la sucursal?
        // Pero por defecto para el Dashboard móvil del "Gestor", filtramos por él mismo.

        const report = await generatePaymentsDetailReport(filters);

        return NextResponse.json({
            success: true,
            data: {
                gestorName: user.fullName,
                totalRecuperacion: report.stats.totalPaid,
                diaRecaudado: report.stats.dueTodayCapital + report.stats.dueTodayInterest,
                moraRecaudada: report.stats.overdue,
                proximoRecaudado: report.stats.advance,
                vencidoRecaudado: report.stats.expired,
                totalClientesCobrados: report.stats.totalClients
            }
        });

    } catch (error) {
        console.error('Error in mobile dashboard API:', error);
        return NextResponse.json({ success: false, message: 'Error al obtener datos del dashboard' }, { status: 500 });
    }
}
