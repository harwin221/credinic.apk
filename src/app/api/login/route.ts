
'use server';

import { NextResponse } from 'next/server';
import { loginUser } from '@/app/(auth)/login/actions';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Correo electrónico y contraseña son requeridos.' }, { status: 400 });
    }

    const result = await loginUser({ email, password });

    if (result.success) {
      return NextResponse.json({ success: true, message: 'Inicio de sesión exitoso.' });
    } else {
      return NextResponse.json({ success: false, error: result.error || 'Credenciales incorrectas.' }, { status: 401 });
    }

  } catch (error) {
    console.error('[API Login Error] Error inesperado en el servidor:', error);
    return NextResponse.json({ success: false, error: 'Error interno del servidor.' }, { status: 500 });
  }
}
