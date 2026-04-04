import { NextResponse } from 'next/server';
import { updateCredit, addPayment, getCredit } from '@/services/credit-service-server';
import { getUser } from '@/services/user-service-server';
import { nowInNicaragua } from '@/lib/date-utils';
import { query } from '@/lib/mysql';

export const dynamic = 'force-dynamic';

/**
 * Endpoint para desembolsar créditos desde la app móvil
 * USA EXACTAMENTE LA MISMA LÓGICA QUE LA WEB: disbursements/page.tsx
 * 
 * Si es un représtamo (hay saldo pendiente):
 * 1. Liquida el crédito anterior con un pago automático usando addPayment
 * 2. Activa el nuevo crédito usando updateCredit
 */
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { creditId, userId } = body;

        console.log('[DISBURSE_CREDIT] creditId:', creditId, 'userId:', userId);

        if (!creditId || !userId) {
            return NextResponse.json({ success: false, message: 'Faltan parámetros' }, { status: 400 });
        }

        // Obtener información del usuario completo
        const user = await getUser(userId);
        if (!user) {
            return NextResponse.json({ success: false, message: 'Usuario no existe' }, { status: 404 });
        }

        const userRole = user.role.toUpperCase();

        // Solo gerentes, admins y operativos pueden desembolsar
        if (!['GERENTE', 'ADMINISTRADOR', 'OPERATIVO'].includes(userRole)) {
            return NextResponse.json({ success: false, message: 'No tienes permisos para desembolsar' }, { status: 403 });
        }

        // Obtener el crédito completo con todos sus detalles usando el servicio de la web
        const credit = await getCredit(creditId);
        if (!credit) {
            return NextResponse.json({ success: false, message: 'Crédito no encontrado' }, { status: 404 });
        }

        // Verificar que el crédito esté en estado Approved
        if (credit.status !== 'Approved') {
            return NextResponse.json({ success: false, message: 'El crédito no está aprobado' }, { status: 400 });
        }

        console.log('[DISBURSE_CREDIT] Verificando si hay saldo pendiente (représtamo)');

        // LÓGICA IDÉNTICA A LA WEB: Si es un représtamo, liquidar el crédito anterior
        if (credit.outstandingBalance && credit.outstandingBalance > 0) {
            // Buscar el crédito activo del mismo cliente
            const activeCreditsRows: any = await query(
                'SELECT id FROM credits WHERE clientId = ? AND status = ? AND id != ? LIMIT 1',
                [credit.clientId, 'Active', creditId]
            );

            if (activeCreditsRows.length > 0) {
                const oldCreditId = activeCreditsRows[0].id;
                console.log('[DISBURSE_CREDIT] Liquidando crédito anterior:', oldCreditId, 'con monto:', credit.outstandingBalance);

                // 1. Registrar el pago de cancelación en el crédito antiguo usando addPayment de la web
                const payoffPaymentData = {
                    paymentDate: nowInNicaragua(),
                    amount: credit.outstandingBalance,
                    managedBy: user.fullName,
                    transactionNumber: `REFIN-${credit.creditNumber}`,
                    status: 'VALIDO' as const
                };

                const paymentResult = await addPayment(oldCreditId, payoffPaymentData, user);
                if (!paymentResult.success) {
                    return NextResponse.json({ 
                        success: false, 
                        message: `Error al liquidar crédito anterior: ${paymentResult.error}` 
                    }, { status: 400 });
                }
                
                console.log('[DISBURSE_CREDIT] Crédito anterior liquidado exitosamente');
                // La función addPayment se encarga de cambiar el estado a 'Paid' si el saldo es 0
            }
        }

        console.log('[DISBURSE_CREDIT] Activando nuevo crédito usando updateCredit de la web');

        // 2. Activar el nuevo crédito usando EXACTAMENTE el mismo servicio que la web
        const result = await updateCredit(creditId, {
            status: 'Active',
            disbursedAmount: credit.amount, // Usar el monto total aprobado
            deliveryDate: nowInNicaragua(),
            disbursedBy: user.fullName
        }, user);

        if (!result.success) {
            return NextResponse.json({ 
                success: false, 
                message: result.error || 'No se pudo desembolsar el crédito' 
            }, { status: 400 });
        }

        console.log('[DISBURSE_CREDIT] Crédito desembolsado exitosamente');

        return NextResponse.json({
            success: true,
            message: 'Crédito desembolsado exitosamente'
        });

    } catch (error: any) {
        console.error('Error in disburse credit API:', error);
        return NextResponse.json({ success: false, message: `Error: ${error?.message}` }, { status: 500 });
    }
}
