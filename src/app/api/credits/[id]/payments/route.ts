
'use server';

import { NextResponse } from 'next/server';
import { addPayment } from '@/services/credit-service-server';
import { getSession } from '@/app/(auth)/login/actions';

export async function POST(request: Request, { params }: { params: { id: string } }) {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const creditId = params.id;

    try {
        const paymentData = await request.json();
        
        const newPaymentData = {
            ...paymentData,
            managedBy: session.fullName, // El abono siempre lo registra el usuario en sesión
            transactionNumber: paymentData.transactionNumber || `PAY-API-${Date.now()}`
        };

        const result = await addPayment(creditId, newPaymentData, session);

        if (result.success && result.paymentId) {
            return NextResponse.json({ id: result.paymentId, message: 'Abono registrado' }, { status: 201 });
        } else {
            return NextResponse.json({ error: result.error || 'No se pudo registrar el abono' }, { status: 400 });
        }
    } catch (error) {
        console.error(`[API POST /credits/${creditId}/payments]`, error);
        return NextResponse.json({ error: 'Error en el servidor al registrar el abono.' }, { status: 500 });
    }
}
