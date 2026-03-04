
'use server';

import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';
import type { AppUser } from '@/lib/types';
import { query } from '@/lib/mysql';
import * as bcrypt from 'bcryptjs';

const secretKey = process.env.JWT_SECRET || 'fallback-secret-key-debe-ser-larga-y-segura';
const key = new TextEncoder().encode(secretKey);

export async function encrypt(payload: any, expiration?: string | number | Date) {
  let jwt = new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt();

  if (expiration) {
    jwt = jwt.setExpirationTime(expiration);
  } else {
    jwt = jwt.setExpirationTime('1d'); // Default 1 day
  }

  return await jwt.sign(key);
}

export async function decrypt(input: string): Promise<any> {
  try {
    const { payload } = await jwtVerify(input, key, {
      algorithms: ['HS256'],
    });
    return payload;
  } catch (error) {
    // Se espera esto para tokens expirados, así que devolvemos null.
    return null;
  }
}

export async function loginUser(credentials: { username: string; password: string; }): Promise<{ success: boolean; error?: string; user?: AppUser }> {
  const { username, password } = credentials;

  try {
    const rows: any = await query('SELECT * FROM users WHERE username = ?', [username.toLowerCase()]);

    if (rows.length === 0) {
      console.error(`[Login Fallido] Usuario no encontrado para el username: ${username.toLowerCase()}`);
      return { success: false, error: 'Credenciales incorrectas.' };
    }

    const user = rows[0];

    if (!user.active) {
      console.error(`[Login Fallido] La cuenta de usuario ${username.toLowerCase()} está inactiva.`);
      return { success: false, error: 'La cuenta de usuario está inactiva.' };
    }

    if (!user.hashed_password) {
      console.error(`[Login Fallido] El usuario ${username.toLowerCase()} no tiene una contraseña (hashed_password) en la base de datos.`);
      return { success: false, error: 'Cuenta de usuario corrupta. Contacte al administrador.' };
    }

    const passwordsMatch = await bcrypt.compare(password, user.hashed_password);

    if (!passwordsMatch) {
      console.error(`[Login Fallido] La contraseña proporcionada para ${username.toLowerCase()} no coincide con el hash almacenado.`);
      return { success: false, error: 'Credenciales incorrectas.' };
    }

    // En este punto, el inicio de sesión es exitoso (credenciales válidas).

    // VERIFICACIÓN DE CONTROL DE ACCESO (NUEVO)
    const { checkAccess } = await import('@/services/settings-service');
    const accessCheck = await checkAccess(user.role, user.sucursal_id);

    if (!accessCheck.allowed) {
      console.warn(`[Login Denegado] Usuario ${username} bloqueado por control de acceso: ${accessCheck.reason}`);
      return { success: false, error: accessCheck.reason };
    }

    console.log(`[Login Exitoso] Usuario autenticado: ${username.toLowerCase()}`);

    const sessionPayload = {
      userId: user.id,
      role: user.role,
      fullName: user.fullName,
      email: user.email, // Mantenemos el email en el payload por si se usa en otro lugar
      mustChangePassword: user.mustChangePassword
    };

    // Calcular el fin del día en Nicaragua (23:59:59)
    const { toZonedTime, fromZonedTime } = await import('date-fns-tz');
    const { endOfDay } = await import('date-fns');

    const nicaraguaNow = toZonedTime(new Date(), 'America/Managua');
    const expiresNica = endOfDay(nicaraguaNow);
    const expires = fromZonedTime(expiresNica, 'America/Managua');

    // El JWT también expira al final del día
    const session = await encrypt(sessionPayload, expires);

    (await cookies()).set('session', session, { expires, httpOnly: true });

    // Construct AppUser to return to client for immediate context update
    const appUser: AppUser = {
      ...user,
      sucursal: user.sucursal_id,
      sucursalName: user.sucursal_name,
      sessionExpiresAt: expires.toISOString()
    };

    try {
      const { createLog } = await import('@/services/audit-log-service');
      // We will only log the first login of the day in the component or we just log every login and filter it on the report page.
      // The user asked "primer inicio de sesion de cada usuario", which we can get with a GROUP BY or MIN(createdAt) in the report.
      await createLog(appUser, 'user:login', 'Inicio de sesión exitoso', { targetId: appUser.id as string });
    } catch (logError) {
      console.error('[Audit Log] No se pudo guardar el log de inicio de sesión:', logError);
    }

    return { success: true, user: appUser };

  } catch (error) {
    console.error('[Login Action Error] Error inesperado en el servidor:', error);
    return { success: false, error: 'Error del servidor al intentar iniciar sesión.' };
  }
}

export async function logoutUser() {
  // Invalidar la cookie de sesión
  (await cookies()).set('session', '', { expires: new Date(0) });
}

export async function getSession(): Promise<AppUser | null> {
  const sessionCookie = (await cookies()).get('session')?.value;
  if (!sessionCookie) return null;

  const decryptedSession = await decrypt(sessionCookie);
  if (!decryptedSession?.userId) return null;

  try {
    // Obtener el perfil de usuario completo y actualizado de la base de datos
    const userProfile = await getUserProfileFromDatabase(decryptedSession.userId);

    if (userProfile) {
      // VERIFICACIÓN DE CONTROL DE ACCESO (EN CADA REQUEST)
      const { checkAccess } = await import('@/services/settings-service');
      const accessCheck = await checkAccess(userProfile.role, userProfile.sucursal);

      if (!accessCheck.allowed) {
        console.warn(`[Acceso Denegado] Usuario ${userProfile.username} bloqueado en tiempo real: ${accessCheck.reason}`);
        return null;
      }

      userProfile.sessionExpiresAt = new Date(decryptedSession.exp * 1000).toISOString();
    }

    return userProfile;
  } catch (error) {
    console.error('Error obteniendo perfil de usuario:', error);
    // En caso de error de DB, devolver datos básicos del token
    return {
      id: decryptedSession.userId,
      fullName: decryptedSession.fullName || 'Usuario',
      email: decryptedSession.email || '',
      username: decryptedSession.username || '',
      role: decryptedSession.role || 'OPERATIVO',
      mustChangePassword: decryptedSession.mustChangePassword || false,
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    } as AppUser;
  }
}

/**
 * Obtiene el perfil de usuario completo de la base de datos.
 * Optimizado para obtener solo los campos necesarios y ser más rápido.
 * @param userId El ID del usuario a obtener.
 * @returns El objeto AppUser completo o null si no se encuentra.
 */
async function getUserProfileFromDatabase(userId: string): Promise<AppUser | null> {
  // Consulta optimizada: solo seleccionar campos necesarios, sin hashed_password
  const sql = `
        SELECT id, fullName, email, username, phone, role, sucursal_id, sucursal_name, 
               active, mustChangePassword, 
               createdAt, updatedAt 
        FROM users 
        WHERE id = ? AND active = 1 
        LIMIT 1
    `;

  const rows: any = await query(sql, [userId]);
  if (rows.length > 0) {
    const user = rows[0];
    return {
      ...user,
      sucursal: user.sucursal_id,
      sucursalName: user.sucursal_name,
      supervisorId: user.supervisor_id,
      supervisorName: user.supervisor_name
    } as AppUser;
  }
  return null;
}
