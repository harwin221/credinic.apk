import { NextResponse } from 'next/server';

/**
 * Endpoint de versión de la API
 * Permite a las apps Android verificar compatibilidad
 */
export async function GET() {
  return NextResponse.json({
    api_version: '1.0.0',
    app_name: 'CrediNic',
    min_client_version: '1.0.0',
    features: [
      'authentication',
      'credits_management',
      'clients_management',
      'payments',
      'reports',
      'offline_sync'
    ],
    endpoints: {
      auth: {
        login: '/api/login',
        logout: '/api/logout',
        me: '/api/me'
      },
      data: {
        credits: '/api/credits',
        clients: '/api/clients',
        reports: '/api/reports'
      }
    }
  });
}