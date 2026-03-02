
'use server';

import { NextResponse } from 'next/server';
import { getSession } from '@/app/(auth)/login/actions';
import { generatePaymentsDetailReport } from '@/services/report-service';
import type { ReportFilters } from '@/services/report-service';

export async function GET(request: Request) {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    try {
        const { searchParams } = new URL(request.url);
        
        const filters: ReportFilters = {
          sucursales: searchParams.getAll('sucursal'),
          users: searchParams.getAll('user'),
          dateFrom: searchParams.get('from') || undefined,
          dateTo: searchParams.get('to') || undefined,
          viewType: (searchParams.get('viewType') as 'summary' | 'detailed') || 'detailed',
        };
        
        const reportData = await generatePaymentsDetailReport(filters);

        return NextResponse.json(reportData);

    } catch (error) {
        console.error('[API GET /reports/payments-detail]', error);
        return NextResponse.json({ error: 'Error al generar el reporte de recuperación.' }, { status: 500 });
    }
}
