import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Endpoint simple para verificar conectividad
 * Usado por la app móvil para detectar si hay conexión al servidor
 */
export async function GET() {
    return NextResponse.json({ success: true, message: 'Server is reachable' });
}

export async function HEAD() {
    return new NextResponse(null, { status: 200 });
}
