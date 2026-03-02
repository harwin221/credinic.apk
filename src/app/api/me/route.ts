
import { NextResponse } from 'next/server';
import { getSession } from '@/app/(auth)/login/actions';

export async function GET(request: Request) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // El objeto session ya es el perfil del usuario completo
    return NextResponse.json(session);

  } catch (error) {
    console.error('Error en /api/me:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
