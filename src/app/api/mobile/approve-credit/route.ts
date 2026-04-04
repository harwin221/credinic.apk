import { NextResponse } from 'next/server';
import { updateCredit } from '@/services/credit-service-server';
import { getUser } from '@/services/user-service-server';
import { nowInNicaragua } from '@/lib/date-utils';

export const dynamic = 'force-dynamic';

/**
 * Endpoint para aprobar créditos desde la app móvil
 * USA EXACTAMENTE EL MISMO SERVICIO QUE LA WEB: updateCredit de credit-service-server.ts
 */
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { creditId, userId } = body;

        console.log('[APPROVE_CREDIT] creditId:', creditId, 'userId:', userId);

        if (!creditId || !userId) {
            return NextResponse.json({ success: false, message: 'Faltan parámetros' }, { status: 400 });
        }

        // Obtener información del usuario completo
        const user = await getUser(userId);
        if (!user) {
            return NextResponse.json({ success: false, message: 'Usuario no existe' }, { status: 404 });
        }

        const userRole = user.role.toUpperCase();

        // Solo gerentes, admins, finanzas y operativos pueden aprobar
        if (!['GERENTE', 'ADMINISTRADOR', 'FINANZAS', 'OPERATIVO'].includes(userRole)) {
            return NextResponse.json({ success: false, message: 'No tienes permisos para aprobar' }, { status: 403 });
        }

        console.log('[APPROVE_CREDIT] Usando updateCredit de la web');

        // Usar EXACTAMENTE el mismo servicio que la web
        const result = await updateCredit(creditId, {
            status: 'Approved',
            approvalDate: nowInNicaragua(),
            approvedBy: user.fullName
        }, user);

        if (!result.success) {
            return NextResponse.json({ 
                success: false, 
                message: result.error || 'No se pudo aprobar el crédito' 
            }, { status: 400 });
        }

        console.log('[APPROVE_CREDIT] Crédito aprobado exitosamente');

        return NextResponse.json({
            success: true,
            message: 'Crédito aprobado exitosamente'
        });

    } catch (error: any) {
        console.error('Error in approve credit API:', error);
        return NextResponse.json({ success: false, message: `Error: ${error?.message}` }, { status: 500 });
    }
}
