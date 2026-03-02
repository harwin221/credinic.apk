
'use server';

import {
  createUserService,
  resetUserPassword as resetUserPasswordService,
  updateUserService,
  updateUserPassword,
  deleteUserFromAuthAndDb,
  getUser,
} from '@/services/user-service-server';
import type { CreateUserInput, AppUser as User } from '@/lib/types';
import { revalidatePath } from 'next/cache';
import { createLog } from '@/services/audit-log-service';
import { diff } from 'deep-object-diff';

/**
 * Acción de Servidor para crear un nuevo usuario. Llama a la función de servicio subyacente.
 */
export async function createUser(
  userData: CreateUserInput,
  actor: User,
): Promise<{ success: boolean; userId?: string; error?: string }> {
  const result = await createUserService(userData);
  if (result.uid) {
    await createLog(actor, 'user:create', `Se creó el usuario ${userData.displayName} (${userData.username}).`, { targetId: result.uid });
    revalidatePath('/settings/users');
    revalidatePath('/audit');
  }
  return { success: !!result.uid, userId: result.uid, error: result.uid ? undefined : 'Error creando usuario' };
}

export async function updateUserAction(
  userId: string,
  newData: Partial<User> & { password?: string },
  actor: User
): Promise<{ success: boolean; error?: string }> {
  const oldData = await getUser(userId);
  const { password, ...userFields } = newData;

  // 1. Update user fields
  const result = await updateUserService(userId, userFields);

  if (!result.success) return result;

  // 2. Update password if provided
  if (password && password.length >= 6) {
    const passwordResult = await updateUserPassword(userId, password);
    if (!passwordResult.success) {
      return { success: false, error: "Usuario actualizado, pero falló el cambio de contraseña." };
    }
  }

  if (result.success && oldData) {
    const changes = diff(oldData, { ...oldData, ...userFields });

    let changeDetails = Object.keys(changes).map(key => {
      const oldValue = (oldData as any)[key];
      const newValue = (userFields as any)[key];
      if (oldValue === undefined || oldValue === null || oldValue === '') {
        return `el ${key} se estableció en '${newValue}'`;
      }
      return `el ${key} cambió de '${oldValue}' a '${newValue}'`;
    }).join(', ');

    if (password) {
      changeDetails += (changeDetails ? ', ' : '') + "se actualizó la contraseña";
    }

    await createLog(actor, 'user:update', `Se actualizó el usuario ${userFields.fullName || oldData.fullName}. Cambios: ${changeDetails}.`, { targetId: userId, details: { ...changes, passwordUpdated: !!password } });
    revalidatePath('/settings/users');
    revalidatePath('/audit');
  }
  return result;
}

/**
 * Acción de servidor para restablecer la contraseña de un usuario. Llama a la función de servicio subyacente.
 */
export async function resetUserPassword(uid: string, actor: User): Promise<{ success: boolean, error?: string }> {
  const result = await resetUserPasswordService(uid);
  if (result.success) {
    const targetUser = await getUser(uid);
    if (targetUser) {
      await createLog(actor, 'user:reset_password', `Se forzó el reseteo de contraseña para ${targetUser.fullName}.`, { targetId: uid });
    }
  }
  return result;
}

export async function deleteUser(uid: string, actor: User): Promise<{ success: boolean, error?: string }> {
  try {
    const userToDelete = await getUser(uid);
    if (userToDelete) {
      await deleteUserFromAuthAndDb(uid);
      await createLog(actor, 'user:delete', `Se eliminó al usuario ${userToDelete.fullName}.`, { targetId: uid });
      revalidatePath('/settings/users');
      revalidatePath('/audit');
    }
    return { success: true };
  } catch (error: any) {
    console.error('Error in deleteUser server action:', error);
    return { success: false, error: error.message };
  }
}
