import { NextResponse } from 'next/server';
import { query } from '@/lib/mysql';
import { randomUUID } from 'crypto';
import { generatePaymentSchedule } from '@/lib/utils';
import { nowInNicaragua, isoToMySQLDateTime, isoToMySQLDateTimeNoon } from '@/lib/date-utils';
import { getClient } from '@/services/client-service-server';

export const dynamic = 'force-dynamic';

/**
 * Endpoint para crear una nueva solicitud de crédito desde la app móvil
 * POST /api/mobile/mobile_create_credit
 * 
 * Usa la misma lógica que credit-service-improved.ts
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

        // Obtener información del cliente
        const client = await getClient(clientId);
        if (!client) {
            return NextResponse.json({ 
                success: false, 
                message: 'Cliente no encontrado' 
            }, { status: 404 });
        }

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

        // Obtener feriados para ajustar fechas de pago
        const holidaysResult: any = await query('SELECT date FROM holidays');
        const holidays = holidaysResult.map((h: any) => {
            const d = new Date(h.date);
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        });

        // Generar plan de pagos (igual que la web)
        const scheduleData = generatePaymentSchedule({
            loanAmount: principal,
            monthlyInterestRate: rate,
            termMonths: term,
            paymentFrequency: paymentFrequency as any,
            startDate: firstPaymentDate,
            holidays
        });

        if (!scheduleData || !scheduleData.schedule) {
            return NextResponse.json({ 
                success: false, 
                message: 'Error al generar el plan de pagos' 
            }, { status: 500 });
        }

        // Crear el crédito (igual que la web)
        const creditId = randomUUID();
        const applicationDate = nowInNicaragua();
        
        // Los créditos desde móvil siempre son Pending (requieren aprobación)
        const initialStatus = 'Pending';

        const creditSql = `
            INSERT INTO credits (
                id, creditNumber, clientId, clientName, status, applicationDate, approvalDate, approvedBy, 
                amount, principalAmount, interestRate, termMonths, paymentFrequency, currencyType, 
                totalAmount, totalInterest, totalInstallmentAmount, firstPaymentDate, deliveryDate, dueDate, 
                collectionsManager, createdBy, branch, branchName, productType, subProduct, productDestination
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        await query(creditSql, [
            creditId,
            creditNumber,
            clientId,
            client.name,
            initialStatus,
            isoToMySQLDateTime(applicationDate),
            null, // approvalDate
            null, // approvedBy
            principal,
            principal, // principalAmount
            rate,
            term,
            paymentFrequency,
            'CÓRDOBAS',
            scheduleData.totalPayment,
            scheduleData.totalInterest,
            scheduleData.periodicPayment,
            isoToMySQLDateTimeNoon(firstPaymentDate),
            null, // deliveryDate
            `${scheduleData.schedule[scheduleData.schedule.length - 1].paymentDate} 12:00:00`,
            collectionsManager,
            collectionsManager, // createdBy
            client.sucursal,
            client.sucursalName || client.sucursal,
            productType,
            subProduct,
            productDestination
        ]);

        // Insertar garantías si existen
        if (guarantees && guarantees.length > 0) {
            for (const guarantee of guarantees) {
                await query(
                    'INSERT INTO guarantees (id, creditId, article, brand, color, model, series, estimatedValue) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                    [randomUUID(), creditId, guarantee.article, guarantee.brand, guarantee.color, guarantee.model, guarantee.series, guarantee.estimatedValue]
                );
            }
        }

        // Insertar fiadores si existen
        if (guarantors && guarantors.length > 0) {
            for (const guarantor of guarantors) {
                await query(
                    'INSERT INTO guarantors (id, creditId, name, cedula, phone, address, relationship) VALUES (?, ?, ?, ?, ?, ?, ?)',
                    [randomUUID(), creditId, guarantor.name, guarantor.cedula, guarantor.phone, guarantor.address, guarantor.relationship]
                );
            }
        }

        // Insertar plan de pagos (igual que la web)
        if (scheduleData.schedule.length > 0) {
            for (const payment of scheduleData.schedule) {
                await query(
                    'INSERT INTO payment_plan (creditId, paymentNumber, paymentDate, amount, principal, interest, balance) VALUES (?, ?, ?, ?, ?, ?, ?)',
                    [creditId, payment.paymentNumber, `${payment.paymentDate} 12:00:00`, payment.amount, payment.principal, payment.interest, payment.balance]
                );
            }
        }

        return NextResponse.json({
            success: true,
            message: 'Solicitud de crédito creada exitosamente',
            data: {
                creditId,
                creditNumber,
                status: initialStatus
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
