
'use server';

import { NextResponse } from 'next/server';
import { getClients, createClient } from '@/services/client-service-server';
import { getSession } from '@/app/(auth)/login/actions';

export async function GET(request: Request) {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const searchTerm = searchParams.get('search') || undefined;

    try {
        const { clients } = await getClients({ user: session, searchTerm });
        return NextResponse.json(clients);
    } catch (error) {
        console.error('[API GET /clients]', error);
        return NextResponse.json({ error: 'Error al obtener los clientes.' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    try {
        const clientData = await request.json();
        const result = await createClient(clientData, session);

        if (result.success && result.clientId) {
            return NextResponse.json({ id: result.clientId, message: 'Cliente creado' }, { status: 201 });
        } else {
            return NextResponse.json({ error: result.error || 'No se pudo crear el cliente' }, { status: 400 });
        }
    } catch (error) {
        console.error('[API POST /clients]', error);
        return NextResponse.json({ error: 'Error en el servidor al crear el cliente.' }, { status: 500 });
    }
}
