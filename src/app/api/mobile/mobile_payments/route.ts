import { NextResponse } from 'next/server';
import { addPayment as addPaymentService } from '@/services/credit-service-server';
import { getUser } from '@/services/user-service-server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { creditId, userId, amount, notes, paymentType } = body;

        if (!creditId || !userId || !amount) {
            return NextResponse.json({ success: false, message: 'Faltan datos requeridos' }, { status: 400 });
        }

        const user = await getUser(userId);
        if (!user) {
            return NextResponse.json({ success: false, message: 'Usuario no encontrado' }, { status: 404 });
        }

        // Preparar los datos del pago según la interfaz de la web
        const paymentData = {
            amount: Number(amount),
            paymentDate: new Date().toISOString(),
            paymentMethod: 'CASH', // Los gestores manejan efectivo mayormente
            paymentType: paymentType || 'NORMAL',
            description: notes || '',
            status: 'COMPLETADO'
        };

        // Llamada al servicio oficial que maneja la lógica de negocio (saldos, estados, etc.)
        const result = await addPaymentService(creditId, paymentData as any, user as any);

        if (result.success) {
            return NextResponse.json({
                success: true,
                message: 'Pago registrado con éxito',
                paymentId: result.paymentId,
                transactionNumber: result.transactionNumber
            });
        } else {
            return NextResponse.json({
                success: false,
                message: result.error || 'Error al procesar el pago en el servidor'
            }, { status: 400 });
        }

    } catch (error) {
        console.error('Error en API Mobile Payments:', error);
        return NextResponse.json({ success: false, message: 'Error interno al registrar el pago' }, { status: 500 });
    }
}
