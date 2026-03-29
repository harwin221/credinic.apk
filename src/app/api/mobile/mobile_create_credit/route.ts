import { NextResponse } from 'next/server';
import { query } from '@/lib/mysql';
import { v4 as uuidv4 } from 'uuid';
import { generatePaymentSchedule } from '@/lib/utils';
import { nowInNicaragua, toISOString } from '@/lib/date-utils';

export const dynamic = 'force-dynamic';

/**
 * Endpoint para crear una nueva solicitud de crédito desde la app móvil
 * POST /api/mobile/mobile_create_credit
 */
export async function POST(request: Request) {
    try {
        // Intentar leer el body
        let body;
        try {
            body = await request.json();
        } catch (jsonError) {
            console.error('Error parseando JSON:', jsonError);
            return NextResponse.json({ 
                success: false, 
                message: 'Datos inválidos: no se pudo parsear el JSON' 
            }, { status: 400 });
        }

        console.log('Body recibido:', JSON.stringify(body, null, 2));
        
        const {
            clientId,
            productType,
            subProduct,
            productDestination,
            amount,
            interestRate,
            termMonths,
            paymentFrequency,
            firstPaymentDate,
            collectionsManager,
            guarantees = [],
            guarantors = [],
        } = body;

        // Validaciones básicas
        if (!clientId || !productType || !subProduct || !productDestination) {
            return NextResponse.json({ 
                success: false, 
                message: 'Faltan campos requeridos' 
            }, { status: 400 });
        }

        const principal = parseFloat(amount);
        const rate = parseFloat(interestRate);
        const term = parseFloat(termMonths);

        if (!principal || principal < 1000) {
            return NextResponse.json({ 
                success: false, 
                message: 'El monto mínimo es C$1,000' 
            }, { status: 400 });
        }

        if (!rate || rate < 1 || rate > 50) {
            return NextResponse.json({ 
                success: false, 
                message: 'La tasa de interés debe estar entre 1% y 50%' 
            }, { status: 400 });
        }

        if (!term || term < 0.5 || term > 60) {
            return NextResponse.json({ 
                success: false, 
                message: 'El plazo debe estar entre 0.5 y 60 meses' 
            }, { status: 400 });
        }

        if (!['Diario', 'Semanal', 'Catorcenal', 'Quincenal'].includes(paymentFrequency)) {
            return NextResponse.json({ 
                success: false, 
                message: 'Frecuencia de pago inválida' 
            }, { status: 400 });
        }

        // Verificar que el cliente existe
        const clientRows: any = await query('SELECT * FROM clients WHERE id = ? LIMIT 1', [clientId]);
        if (!clientRows || clientRows.length === 0) {
            return NextResponse.json({ 
                success: false, 
                message: 'Cliente no encontrado' 
            }, { status: 404 });
        }

        const client = clientRows[0];

        // Verificar que no tenga solicitudes pendientes o aprobadas
        const existingCredits: any = await query(
            'SELECT * FROM credits WHERE clientId = ? AND status IN (?, ?)',
            [clientId, 'Pending', 'Approved']
        );

        if (existingCredits && existingCredits.length > 0) {
            return NextResponse.json({ 
                success: false, 
                message: 'El cliente ya tiene una solicitud pendiente o aprobada' 
            }, { status: 400 });
        }

        // Generar número de crédito
        const creditCountRows: any = await query('SELECT COUNT(*) as count FROM credits');
        const creditCount = creditCountRows[0].count;
        const creditNumber = `CRE-${String(creditCount + 1).padStart(6, '0')}`;

        // Generar plan de pagos
        const scheduleData = generatePaymentSchedule({
            loanAmount: principal,
            monthlyInterestRate: rate,
            termMonths: term,
            paymentFrequency: paymentFrequency as any,
            startDate: firstPaymentDate,
            holidays: []
        });

        if (!scheduleData || !scheduleData.schedule) {
            return NextResponse.json({ 
                success: false, 
                message: 'Error al generar el plan de pagos' 
            }, { status: 500 });
        }

        const paymentPlan = scheduleData.schedule;
        const totalAmount = scheduleData.totalPayment;
        const totalInterest = scheduleData.totalInterest;
        const installmentAmount = scheduleData.periodicPayment;

        // Crear el crédito
        const creditId = uuidv4();
        const now = nowInNicaragua();

        await query(
            `INSERT INTO credits (
                id, creditNumber, clientId, clientName, amount, interestRate, 
                termMonths, paymentFrequency, totalAmount, installmentAmount,
                firstPaymentDate, status, collectionsManager, productType, 
                subProduct, productDestination, createdAt, updatedAt,
                sucursal, currency
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                creditId,
                creditNumber,
                clientId,
                client.name,
                principal,
                rate,
                term,
                paymentFrequency,
                totalAmount,
                installmentAmount,
                toISOString(new Date(firstPaymentDate)),
                'Pending', // Estado inicial
                collectionsManager,
                productType,
                subProduct,
                productDestination,
                toISOString(now),
                toISOString(now),
                client.sucursal,
                'Córdobas'
            ]
        );

        // Insertar plan de pagos
        for (const payment of paymentPlan) {
            await query(
                `INSERT INTO payment_plan (
                    id, creditId, paymentNumber, paymentDate, amount, 
                    principal, interest, balance, status
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    uuidv4(),
                    creditId,
                    payment.paymentNumber,
                    toISOString(new Date(payment.paymentDate)),
                    payment.amount,
                    payment.principal,
                    payment.interest,
                    payment.balance,
                    'Pending'
                ]
            );
        }

        // Insertar garantías si existen
        for (const guarantee of guarantees) {
            await query(
                `INSERT INTO guarantees (
                    id, creditId, type, description, estimatedValue
                ) VALUES (?, ?, ?, ?, ?)`,
                [
                    uuidv4(),
                    creditId,
                    guarantee.type,
                    guarantee.description,
                    guarantee.estimatedValue || 0
                ]
            );
        }

        // Insertar fiadores si existen
        for (const guarantor of guarantors) {
            await query(
                `INSERT INTO guarantors (
                    id, creditId, name, cedula, phone, address, relationship
                ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [
                    uuidv4(),
                    creditId,
                    guarantor.name,
                    guarantor.cedula,
                    guarantor.phone || '',
                    guarantor.address || '',
                    guarantor.relationship || ''
                ]
            );
        }

        return NextResponse.json({
            success: true,
            message: 'Solicitud de crédito creada exitosamente',
            data: {
                creditId,
                creditNumber,
                status: 'Pending'
            }
        });

    } catch (error: any) {
        console.error('Error en mobile_create_credit:', error);
        return NextResponse.json({ 
            success: false, 
            message: error?.message || 'Error al crear la solicitud de crédito' 
        }, { status: 500 });
    }
}
