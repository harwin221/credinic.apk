
'use server';

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    // Invalida la cookie de sesión estableciendo su fecha de expiración en el pasado.
    cookies().set('session', '', {
      httpOnly: true,
      path: '/',
      expires: new Date(0),
    });
    
    return NextResponse.json({ message: 'Logged out successfully' }, { status: 200 });

  } catch (error) {
    console.error('Error logging out:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
