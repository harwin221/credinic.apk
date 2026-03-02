
'use client';

import { getUsers as getUsersServer } from './user-service-server';
import type { AppUser } from '@/lib/types';

// Función del lado del cliente que llama a la acción del servidor para obtener usuarios
export async function getUsers(): Promise<AppUser[]> {
  try {
    const users = await getUsersServer();
    return users;
  } catch (error) {
    console.error('Error fetching users on client:', error);
    return [];
  }
}
