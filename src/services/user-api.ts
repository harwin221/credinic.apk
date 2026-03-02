
'use server';

import type { AppUser } from '@/lib/types';
import { getSession } from '@/app/(auth)/login/actions';

/**
 * Obtiene el perfil del usuario de la sesión actual.
 * @returns El objeto AppUser o null si no hay sesión.
 */
export async function getUserProfileFromDatabase(): Promise<AppUser | null> {
  try {
    const session = await getSession();
    return session;
  } catch (error) {
    console.error("Error al obtener el perfil de usuario desde la sesión:", error);
    return null;
  }
}
