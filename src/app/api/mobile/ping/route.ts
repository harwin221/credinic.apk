import { NextResponse } from 'next/server';

/**
 * Endpoint simple para verificar conectividad
 * No requiere autenticación
 */
export async function GET() {
    return NextResponse.json({ 
        success: true, 
        message: 'pong',
        timestamp: new Date().toISOString()
    });
}

export async function HEAD() {
    return new NextResponse(null, { status: 200 });
}
