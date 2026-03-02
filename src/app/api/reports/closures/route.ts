
'use server';

import { NextResponse } from 'next/server';
import { getSession } from '@/app/(auth)/login/actions';
import { query } from '@/lib/mysql';
import type { CashClosure } from '@/lib/types';

// Define los roles que tienen permiso para ver este reporte
const ALLOWED_ROLES = ['ADMINISTRADOR', 'OPERATIVO', 'FINANZAS', 'GERENTE'];

export async function GET(request: Request) {
    const session = await getSession();
    if (!session || !ALLOWED_ROLES.includes(session.role)) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    try {
        const closureRows: any[] = await query('SELECT * FROM closures ORDER BY closureDate DESC');
        
        const closures: CashClosure[] = closureRows.map((row: any) => ({
            ...row,
            id: row.id,
            closureDate: new Date(row.closureDate).toISOString(),
            denominationsNIO: typeof row.denominationsNIO === 'string' ? JSON.parse(row.denominationsNIO) : row.denominationsNIO,
            denominationsUSD: typeof row.denominationsUSD === 'string' ? JSON.parse(row.denominationsUSD) : row.denominationsUSD,
        }));

        return NextResponse.json(closures);
    } catch (error) {
        console.error('[API GET /reports/closures]', error);
        return NextResponse.json({ error: 'Error al obtener el historial de arqueos.' }, { status: 500 });
    }
}
