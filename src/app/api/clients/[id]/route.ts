
'use server';

import { NextResponse } from 'next/server';
import { getClient, updateClient } from '@/services/client-service-server';
import { getSession } from '@/app/(auth)/login/actions';

export async function GET(request: Request, { params }: { params: { id: string } }) {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    try {
        const client = await getClient(params.id);
        if (!client) {
            return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
        }
        return NextResponse.json(client);
    } catch (error) {
        console.error(`[API GET /clients/${params.id}]`, error);
        return NextResponse.json({ error: 'Error al obtener el cliente.' }, { status: 500 });
    }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    try {
        const clientData = await request.json();
        const result = await updateClient(params.id, clientData, session);

        if (result.success) {
            return NextResponse.json({ message: 'Cliente actualizado' });
        } else {
            return NextResponse.json({ error: result.error || 'No se pudo actualizar el cliente' }, { status: 400 });
        }
    } catch (error) {
        console.error(`[API PUT /clients/${params.id}]`, error);
        return NextResponse.json({ error: 'Error en el servidor al actualizar el cliente.' }, { status: 500 });
    }
}
