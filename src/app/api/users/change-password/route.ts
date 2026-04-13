import { NextResponse } from 'next/server';
import { updateUserPassword } from '@/services/user-service-server';
import { createLog } from '@/services/audit-log-service';
import { getUser } from '@/services/user-service-server';

/**
 * Endpoint para cambio de contraseña desde la app móvil
 * POST /api/users/change-password
 * 
 * Permite que un usuario cambie su propia contraseña proporcionando:
 * - userId: ID del usuario
 * - currentPassword: Contraseña actual (para validación)
 * - newPassword: Nueva contraseña
 */
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { userId, currentPassword, newPassword } = body;

        if (!userId || !currentPassword || !newPassword) {
            return NextResponse.json(
                { success: false, error: 'Todos los campos son requeridos' },
                { status: 400 }
            );
        }

        if (newPassword.length < 6) {
            return NextResponse.json(
                { success: false, error: 'La nueva contraseña debe tener al menos 6 caracteres' },
                { status: 400 }
            );
        }

        // Actualizar contraseña con validación de contraseña actual
        // isAdminChange = false porque es el usuario cambiando su propia contraseña
        const result = await updateUserPassword(userId, newPassword, currentPassword, false);

        if (!result.success) {
            return NextResponse.json(
                { success: false, error: result.error },
                { status: 400 }
            );
        }

        // Registrar en auditoría
        try {
            const user = await getUser(userId);
            if (user) {
                await createLog(user, 'user:change_password', 'Cambio de contraseña desde app móvil', {
                    targetId: userId,
                    device: 'mobile'
                });
            }
        } catch (logError) {
            console.error('[Audit Log] No se pudo guardar el log de cambio de contraseña:', logError);
            // No fallar la operación si el log falla
        }

        return NextResponse.json({
            success: true,
            message: 'Contraseña actualizada exitosamente'
        });

    } catch (error) {
        console.error('[Change Password Error] Error inesperado:', error);
        return NextResponse.json(
            { success: false, error: 'Error del servidor al cambiar la contraseña' },
            { status: 500 }
        );
    }
}
