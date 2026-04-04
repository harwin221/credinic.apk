import { NextResponse } from 'next/server';
import { query } from '@/lib/mysql';
import * as bcrypt from 'bcryptjs';

/**
 * Endpoint de login para la app móvil
 * USA EXACTAMENTE LA MISMA LÓGICA QUE LA WEB: login/actions.ts
 * 
 * Diferencias con la web:
 * - No usa cookies/JWT (la app móvil maneja su propia sesión)
 * - Devuelve los datos del usuario directamente
 * - Registra en auditoría con device: 'mobile'
 */
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { username, password } = body;

        if (!username || !password) {
            return NextResponse.json(
                { success: false, message: 'Usuario y contraseña son requeridos' },
                { status: 400 }
            );
        }

        // LÓGICA IDÉNTICA A LA WEB: Buscar usuario por username
        const rows: any = await query('SELECT * FROM users WHERE username = ?', [username.toLowerCase()]);

        if (rows.length === 0) {
            console.error(`[Login Móvil Fallido] Usuario no encontrado: ${username.toLowerCase()}`);
            return NextResponse.json(
                { success: false, message: 'Credenciales incorrectas.' },
                { status: 401 }
            );
        }

        const user = rows[0];

        // LÓGICA IDÉNTICA A LA WEB: Verificar si la cuenta está activa
        if (!user.active) {
            console.error(`[Login Móvil Fallido] Cuenta inactiva: ${username.toLowerCase()}`);
            return NextResponse.json(
                { success: false, message: 'La cuenta de usuario está inactiva.' },
                { status: 401 }
            );
        }

        // LÓGICA IDÉNTICA A LA WEB: Verificar que tenga contraseña
        if (!user.hashed_password) {
            console.error(`[Login Móvil Fallido] Usuario sin contraseña: ${username.toLowerCase()}`);
            return NextResponse.json(
                { success: false, message: 'Cuenta de usuario corrupta. Contacte al administrador.' },
                { status: 401 }
            );
        }

        // LÓGICA IDÉNTICA A LA WEB: Validar contraseña con bcrypt
        const passwordsMatch = await bcrypt.compare(password, user.hashed_password);

        if (!passwordsMatch) {
            console.error(`[Login Móvil Fallido] Contraseña incorrecta: ${username.toLowerCase()}`);
            return NextResponse.json(
                { success: false, message: 'Credenciales incorrectas.' },
                { status: 401 }
            );
        }

        // LÓGICA IDÉNTICA A LA WEB: Verificar control de acceso
        const { checkAccess } = await import('@/services/settings-service');
        const accessCheck = await checkAccess(user.role, user.sucursal_id);

        if (!accessCheck.allowed) {
            console.warn(`[Login Móvil Denegado] Usuario ${username} bloqueado: ${accessCheck.reason}`);
            return NextResponse.json(
                { success: false, message: accessCheck.reason },
                { status: 403 }
            );
        }

        console.log(`[Login Móvil Exitoso] Usuario autenticado: ${username.toLowerCase()}`);

        // LÓGICA IDÉNTICA A LA WEB: Registrar en auditoría
        try {
            const { createLog } = await import('@/services/audit-log-service');
            const appUser = {
                id: user.id,
                fullName: user.fullName,
                username: user.username,
                email: user.email,
                role: user.role,
                sucursal: user.sucursal_id,
                sucursalName: user.sucursal_name,
                active: user.active,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt
            };
            await createLog(appUser, 'user:login', 'Inicio de sesión desde app móvil', { 
                targetId: user.id,
                device: 'mobile'
            });
        } catch (logError) {
            console.error('[Audit Log] No se pudo guardar el log de inicio de sesión móvil:', logError);
            // No fallar el login si el log falla
        }

        // Devolver datos del usuario (la app móvil maneja su propia sesión)
        return NextResponse.json({
            success: true,
            user: {
                id: user.id,
                fullName: user.fullName,
                username: user.username,
                email: user.email,
                role: user.role,
                sucursal: user.sucursal_id,
                sucursalName: user.sucursal_name,
                mustChangePassword: user.mustChangePassword
            }
        });

    } catch (error) {
        console.error('[Login Móvil Error] Error inesperado:', error);
        return NextResponse.json(
            { success: false, message: 'Error del servidor al intentar iniciar sesión.' },
            { status: 500 }
        );
    }
}
