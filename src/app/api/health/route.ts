import { NextResponse } from 'next/server';

/**
 * Health check endpoint para monitoreo de la API
 * Útil para apps Android para verificar conectividad
 */
export async function GET() {
  try {
    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      service: 'CrediNic API',
      timezone: 'America/Managua'
    });
  } catch (error) {
    return NextResponse.json({
      status: 'unhealthy',
      error: 'Service unavailable'
    }, { status: 503 });
  }
}