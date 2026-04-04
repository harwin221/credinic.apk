import { NextResponse } from 'next/server';
import { updateCredit } from '@/services/credit-service-server';
import { getUser } from '@/services/user-service-server';
import { nowInNicaragua } from '@/lib/date-utils';

export const dynamic = 'force-dynamic';

/**
 * Endpoint para denegar desembolsos desde la app móvil
 * USA EXACTAMENTE EL MISMO SERVICIO QUE LA WEB: updateCredit de credit-service-server.ts
 */
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { creditId, userId, reason } = body;

        console.log('[DENY_DISBURSEMENT] creditId:', creditId, 'userId:', userId);

        if (!creditId || !userId) {
            return NextResponse.json({ success: false, message: 'Faltan parámetros' }, { status: 400 });
        }

        // Obtener información del usuario completo
        const user = await getUser(userId);
        if (!user) {
            return NextResponse.json({ success: false, message: 'Usuario no existe' }, { status: 404 });
        }

        const userRole = user.role.toUpperCase();

        // Solo gerentes, admins y operativos pueden denegar desembolsos
        if (!['GERENTE', 'ADMINISTRADOR', 'OPERATIVO'].includes(userRole)) {
            return NextResponse.json({ success: false, message: 'No tienes permisos para denegar' }, { status: 403 });
        }

        console.log('[DENY_DISBURSEMENT] Usando updateCredit de la web');

        // Usar EXACTAMENTE el mismo servicio que la web
        const result = await updateCredit(creditId, {
            status: 'Rejected',
            approvalDate: nowInNicaragua(),
            rejectionReason: `Rechazado en etapa de desembolso: ${reason || 'Sin motivo especificado'}`,
            rejectedBy: user.fullName
        }, user);

        if (!result.success) {
            return NextResponse.json({ 
                success: false, 
                message: result.error || 'No se pudo denegar el desembolso' 
            }, { status: 400 });
        }

        console.log('[DENY_DISBURSEMENT] Desembolso denegado exitosamente');

        return NextResponse.json({
            success: true,
            message: 'Desembolso denegado exitosamente'
        });

    } catch (error: any) {
        console.error('Error in deny disbursement API:', error);
        return NextResponse.json({ success: false, message: `Error: ${error?.message}` }, { status: 500 });
    }
}
