import { NextResponse } from 'next/server';
import { query } from '@/lib/mysql';

export const dynamic = 'force-dynamic';

// Búsqueda global de créditos activos (para que el gestor pueda cobrar a clientes de otros gestores)
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const search = searchParams.get('q') || '';

        if (search.length < 2) {
            return NextResponse.json({ success: true, data: [] });
        }

        const rows: any[] = await query(`
            SELECT c.id, c.creditNumber, c.clientName, c.collectionsManager,
                   c.totalAmount, c.status,
                   cl.clientNumber, cl.cedula, cl.phone,
                   COALESCE((SELECT SUM(pr.amount) FROM payments_registered pr WHERE pr.creditId = c.id AND pr.status != 'ANULADO'), 0) as totalPaid
            FROM credits c
            JOIN clients cl ON c.clientId = cl.id
            WHERE c.status = 'Active'
              AND (c.clientName LIKE ? OR cl.cedula LIKE ? OR c.creditNumber LIKE ?)
            ORDER BY c.clientName ASC
            LIMIT 20
        `, [`%${search}%`, `%${search}%`, `%${search}%`]);

        const data = rows.map((r: any) => ({
            id: r.id,
            creditNumber: r.creditNumber,
            clientName: r.clientName,
            collectionsManager: r.collectionsManager,
            clientNumber: r.clientNumber,
            cedula: r.cedula,
            phone: r.phone,
            remainingBalance: Math.max(0, Number(r.totalAmount || 0) - Number(r.totalPaid || 0)),
        }));

        return NextResponse.json({ success: true, data });

    } catch (error: any) {
        console.error('Error mobile_search:', error);
        return NextResponse.json({ success: false, message: error?.message }, { status: 500 });
    }
}
