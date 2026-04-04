import { NextResponse } from 'next/server';
import { query } from '@/lib/mysql';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const clientName = searchParams.get('clientName') || 'ROSIBEL ISIDRA MUNGUIA TORREZ';

        console.log('[DEBUG] Buscando créditos para:', clientName);

        // Obtener TODOS los créditos de este cliente
        const credits: any[] = await query(`
            SELECT 
                id,
                creditNumber,
                clientName,
                amount,
                status,
                applicationDate,
                approvalDate,
                deliveryDate,
                rejectionReason,
                rejectedBy,
                createdAt,
                updatedAt
            FROM credits
            WHERE clientName = ?
            ORDER BY createdAt DESC
        `, [clientName]);

        console.log('[DEBUG] Créditos encontrados:', credits.length);
        console.log('[DEBUG] Detalles:', JSON.stringify(credits, null, 2));

        return NextResponse.json({
            success: true,
            clientName,
            totalCredits: credits.length,
            credits
        });

    } catch (error: any) {
        console.error('[DEBUG] Error:', error);
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
