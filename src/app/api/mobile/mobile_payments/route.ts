import { NextResponse } from 'next/server';
import { addPayment } from '@/services/credit-service-server';
import { getUser } from '@/services/user-service-server';
import { nowInNicaragua } from '@/lib/date-utils';

export const dynamic = 'force-dynamic';

/**
 * Endpoint para registrar pagos desde la app móvil
 * POST /api/mobile/mobile_payments
 * 
 * USA EXACTAMENTE EL MISMO SERVICIO QUE LA APP WEB: credit-service-server.ts
 */
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { creditId, userId, amount, notes, paymentType = 'NORMAL' } = body;

        if (!creditId || !userId || !amount) {
            return NextResponse.json({ success: false, message: 'Faltan datos requeridos' }, { status: 400 });
        }

        // Obtener información del usuario
        const user = await getUser(userId);
        if (!user) {
            return NextResponse.json({ success: false, message: 'Usuario no encontrado' }, { status: 404 });
        }

        const paymentDate = nowInNicaragua();

        // Preparar datos del pago (mismo formato que la web)
        const paymentData = {
            paymentDate,
            amount: Number(amount),
            managedBy: user.fullName,
            transactionNumber: '', // addPayment genera el número automáticamente
            status: 'VALIDO' as const,
            paymentType,
            notes: notes || null
        };

        console.log('[MOBILE_PAYMENTS] Usando addPayment de credit-service-server.ts');

        // Usar EXACTAMENTE el mismo servicio que la app web
        const result = await addPayment(creditId, paymentData, user);

        if (!result.success) {
            return NextResponse.json({ 
                success: false, 
                message: result.error || 'Error al registrar el pago' 
            }, { status: 400 });
        }

        console.log('[MOBILE_PAYMENTS] Pago registrado exitosamente:', result.paymentId);

        return NextResponse.json({
            success: true,
            message: 'Pago registrado con éxito',
            paymentId: result.paymentId,
            transactionNumber: result.transactionNumber
        });

    } catch (error: any) {
        console.error('Error en mobile_payments:', error);
        return NextResponse.json({ 
            success: false, 
            message: error?.message || 'Error al registrar el pago' 
        }, { status: 500 });
    }
}
