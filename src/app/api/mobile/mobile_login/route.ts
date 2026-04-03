import { NextResponse } from 'next/server';
import { query } from '@/lib/mysql';
import * as bcrypt from 'bcryptjs';

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

        // Buscar al usuario por correo o username
        const rows: any = await query(
            'SELECT * FROM users WHERE (username = ? OR email = ?) AND active = true LIMIT 1',
            [username.toLowerCase(), username.toLowerCase()]
        );

        if (!rows || rows.length === 0) {
            return NextResponse.json(
                { success: false, message: 'Usuario incorrecto o cuenta desactivada' },
                { status: 401 }
            );
        }

        const user = rows[0];

        // Válidar contraseña con bcrypt
        const isValid = await bcrypt.compare(password, user.hashed_password);

        if (!isValid) {
            return NextResponse.json(
                { success: false, message: 'Contraseña incorrecta' },
                { status: 401 }
            );
        }

        // Lista de roles con permiso de acceso móvil (Admin se deja momentáneamente para que puedas hacer pruebas)
        const validRoles = ['GESTOR', 'GERENTE', 'ADMINISTRADOR'];
        if (!validRoles.includes(user.role.toUpperCase())) {
            return NextResponse.json(
                { success: false, message: 'Rol de usuario sin acceso a la aplicación móvil' },
                { status: 403 }
            );
        }

        // Registrar el inicio de sesión en el log de auditoría
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
            };
            await createLog(appUser, 'user:login', 'Inicio de sesión desde app móvil', { 
                targetId: user.id,
                device: 'mobile'
            });
        } catch (logError) {
            console.error('[Audit Log] No se pudo guardar el log de inicio de sesión móvil:', logError);
            // No fallar el login si el log falla
        }

        // Si todo salió bien, respondemos con éxito y los datos limpios
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
            }
        });

    } catch (error) {
        console.error('Error in mobile login API:', error);
        return NextResponse.json(
            { success: false, message: 'Error interno del servidor conectando con BD' },
            { status: 500 }
        );
    }
}
