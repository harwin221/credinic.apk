import { NextResponse } from 'next/server';
import { query } from '@/lib/mysql';

export const dynamic = 'force-dynamic';

/**
 * Endpoint para solicitar anulación de un pago desde la app móvil
 * POST /api/mobile/mobile_void_payment
 * 
 * El gestor solicita la anulación, luego un administrador debe aprobarla
 */
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { paymentId, creditId, reason, requestedBy } = body;

        if (!paymentId || !creditId || !reason || !requestedBy) {
            return NextResponse.json({ 
                success: false, 
                message: 'Faltan datos requeridos' 
            }, { status: 400 });
        }

        // Verificar que el pago existe y está válido
        const paymentRows: any = await query(
            'SELECT * FROM payments_registered WHERE id = ? AND creditId = ?',
            [paymentId, creditId]
        );

        if (!paymentRows || paymentRows.length === 0) {
            return NextResponse.json({ 
                success: false, 
                message: 'Pago no encontrado' 
            }, { status: 404 });
        }

        const payment = paymentRows[0];

        if (payment.status === 'ANULADO') {
            return NextResponse.json({ 
                success: false, 
                message: 'Este pago ya está anulado' 
            }, { status: 400 });
        }

        if (payment.status === 'ANULACION_PENDIENTE') {
            return NextResponse.json({ 
                success: false, 
                message: 'Este pago ya tiene una solicitud de anulación pendiente' 
            }, { status: 400 });
        }

        // Solicitar anulación (cambiar estado a ANULACION_PENDIENTE)
        await query(
            `UPDATE payments_registered 
             SET status = 'ANULACION_PENDIENTE', 
                 voidReason = ?, 
                 voidRequestedBy = ?, 
                 voidRequestDate = NOW() 
             WHERE id = ?`,
            [reason, requestedBy, paymentId]
        );

        return NextResponse.json({
            success: true,
            message: 'Solicitud de anulación enviada. Debe ser aprobada por un administrador.'
        });

    } catch (error: any) {
        console.error('Error en mobile_void_payment:', error);
        return NextResponse.json({ 
            success: false, 
            message: error?.message || 'Error al solicitar anulación' 
        }, { status: 500 });
    }
}
