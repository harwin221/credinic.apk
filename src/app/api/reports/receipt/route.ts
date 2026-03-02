
'use server';

import { NextResponse } from 'next/server';
import { generateReceiptHtml } from '@/services/pdf/receipt-html';
import { getSession } from '@/app/(auth)/login/actions';

export async function GET(request: Request) {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    try {
        const { searchParams } = new URL(request.url);
        const creditId = searchParams.get('creditId');
        const paymentId = searchParams.get('paymentId');
        const isReprint = searchParams.get('isReprint') === 'true';

        if (!creditId || !paymentId) {
            return NextResponse.json({ error: 'Faltan los parámetros creditId y paymentId' }, { status: 400 });
        }

        const result = await generateReceiptHtml({ creditId, paymentId, isReprint });

        if (result.error) {
            return NextResponse.json({ error: result.error }, { status: 500 });
        }

        // Devolvemos el HTML directamente, que la APK puede renderizar en una WebView de impresión
        return new NextResponse(result.html, {
            status: 200,
            headers: {
                'Content-Type': 'text/html',
            },
        });

    } catch (error) {
        console.error('[API GET /reports/receipt]', error);
        return NextResponse.json({ error: 'Error al generar el recibo.' }, { status: 500 });
    }
}
