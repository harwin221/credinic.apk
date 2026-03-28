import { NextResponse } from 'next/server';
import { query, getNextSequenceValue } from '@/lib/mysql';
import { getUser } from '@/services/user-service-server';
import { nowInNicaragua, isoToMySQLDateTime } from '@/lib/date-utils';
import { hasUserClosedDay } from '@/services/closure-service';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { creditId, userId, amount } = body;

        if (!creditId || !userId || !amount) {
            return NextResponse.json({ success: false, message: 'Faltan datos requeridos' }, { status: 400 });
        }

        const user = await getUser(userId);
        if (!user) {
            return NextResponse.json({ success: false, message: 'Usuario no encontrado' }, { status: 404 });
        }

        // Verificar cierre de caja
        const hasClosed = await hasUserClosedDay(user.id);
        if (hasClosed) {
            return NextResponse.json({ success: false, message: 'Ya realizaste el cierre de caja hoy. No puedes registrar más pagos.' }, { status: 400 });
        }

        // Verificar que el crédito existe
        const creditRows: any = await query('SELECT id, creditNumber, status FROM credits WHERE id = ? LIMIT 1', [creditId]);
        if (!creditRows || creditRows.length === 0) {
            return NextResponse.json({ success: false, message: 'Crédito no encontrado' }, { status: 404 });
        }

        const credit = creditRows[0];

        // Generar número de transacción
        const sequence = await getNextSequenceValue('reciboNumber');
        const transactionNumber = `REC-${String(sequence).padStart(6, '0')}`;
        const paymentId = `pay_${Date.now()}`;
        const paymentDate = nowInNicaragua();

        // Insertar el pago
        await query(
            'INSERT INTO payments_registered (id, creditId, paymentDate, amount, managedBy, transactionNumber, status, paymentType, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [paymentId, creditId, isoToMySQLDateTime(paymentDate), Number(amount), user.fullName, transactionNumber, 'VALIDO', 'NORMAL', null]
        );

        // Verificar si el crédito quedó saldo en cero para marcarlo como Paid
        const allPayments: any = await query(
            "SELECT SUM(amount) as total FROM payments_registered WHERE creditId = ? AND status != 'ANULADO'",
            [creditId]
        );
        const totalPaid = Number(allPayments[0]?.total || 0);

        const creditDetail: any = await query('SELECT totalAmount FROM credits WHERE id = ? LIMIT 1', [creditId]);
        const totalAmount = Number(creditDetail[0]?.totalAmount || 0);

        if (totalAmount > 0 && totalPaid >= totalAmount) {
            await query("UPDATE credits SET status = 'Paid' WHERE id = ?", [creditId]);
        }

        return NextResponse.json({
            success: true,
            message: 'Pago registrado con éxito',
            paymentId,
            transactionNumber
        });

    } catch (error: any) {
        console.error('Error en API Mobile Payments:', error);
        return NextResponse.json({ success: false, message: `Error: ${error?.message || error}` }, { status: 500 });
    }
}
