import { NextResponse } from 'next/server';
import { getPortfolioForGestor } from '@/services/portfolio-service';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');

        if (!userId) {
            return NextResponse.json({ success: false, message: 'Falta userId' }, { status: 400 });
        }

        const { portfolio } = await getPortfolioForGestor(userId);

        // Categorizar según la lógica de negocio oficial (utils.ts / GestorDashboard.tsx)
        const categorized = {
            paidToday: [] as any[],
            dueToday: [] as any[],
            overdue: [] as any[],
            expired: [] as any[],
            upToDate: [] as any[], // Clientes al día (sin mora, no vencen hoy, no vencidos, no pagaron hoy)
            all: portfolio
        };

        portfolio.forEach(credit => {
            if (!credit.details) return;

            // Categorización en orden de prioridad
            if (credit.details.paidToday > 0) {
                categorized.paidToday.push(credit);
            } else if (credit.details.isDueToday) {
                categorized.dueToday.push(credit);
            } else if (credit.details.isExpired) {
                categorized.expired.push(credit);
            } else if (credit.details.overdueAmount > 0) {
                categorized.overdue.push(credit);
            } else {
                // Si no está en ninguna categoría anterior, está al día
                categorized.upToDate.push(credit);
            }
        });

        return NextResponse.json({
            success: true,
            data: categorized
        });

    } catch (error) {
        console.error('Error en API Portfolio Mobile:', error);
        return NextResponse.json({ success: false, message: 'Error al obtener la cartera' }, { status: 500 });
    }
}
