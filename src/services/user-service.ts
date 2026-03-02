
'use client';

import { updateUserPassword as updateUserPasswordServer } from './user-service-server';

/**
 * Función del lado del cliente para que un usuario actualice su propia contraseña.
 * Llama a la acción del servidor, que se encargará de actualizar la contraseña en la base de datos.
 */
export async function updateUserPassword(userId: string, newPassword: string): Promise<void> {
  const result = await updateUserPasswordServer(userId, newPassword);
  if (!result.success) {
    throw new Error(result.error || 'No se pudo actualizar la contraseña en la base de datos.');
  }
}
