
'use server';

import { NextResponse } from 'next/server';
import { getCreditsAdmin, addCredit } from '@/services/credit-service-server';
import { getSession } from '@/app/(auth)/login/actions';
import type { CreditStatus } from '@/lib/types';

export async function GET(request: Request) {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    try {
        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status') as CreditStatus | undefined;
        const searchTerm = searchParams.get('search') || undefined;

        const { credits } = await getCreditsAdmin({ user: session, status, searchTerm });
        return NextResponse.json(credits);
    } catch (error) {
        console.error('[API GET /credits]', error);
        return NextResponse.json({ error: 'Error al obtener los créditos.' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    try {
        const creditData = await request.json();
        const result = await addCredit(creditData, session);

        if (result.success && result.creditId) {
            return NextResponse.json({ id: result.creditId, message: 'Solicitud de crédito creada' }, { status: 201 });
        } else {
            return NextResponse.json({ error: result.error || 'No se pudo crear la solicitud' }, { status: 400 });
        }
    } catch (error) {
        console.error('[API POST /credits]', error);
        return NextResponse.json({ error: 'Error en el servidor al crear la solicitud.' }, { status: 500 });
    }
}
