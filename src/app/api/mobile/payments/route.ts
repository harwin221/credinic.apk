import { NextResponse } from 'next/server';
import { getSession } from '@/app/(auth)/login/actions';
import { addPayment } from '@/services/credit-service-server';
import { nowInNicaragua } from '@/lib/date-utils';

/**
 * Endpoint para aplicar pagos desde la app móvil
 * Soporta pagos individuales y batch (múltiples pagos)
 */
export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { payments, isBatch = false } = body;

    // Validar estructura de datos
    if (!payments || (isBatch && !Array.isArray(payments)) || (!isBatch && !payments.creditId)) {
      return NextResponse.json({ 
        error: 'Estructura de datos inválida',
        expected: isBatch ? 'Array de pagos' : 'Objeto de pago único'
      }, { status: 400 });
    }

    const results = [];
    const paymentsToProcess = isBatch ? payments : [payments];

    // Procesar cada pago
    for (const paymentData of paymentsToProcess) {
      try {
        // Validar datos requeridos
        if (!paymentData.creditId || !paymentData.amount || !paymentData.managedBy) {
          results.push({
            success: false,
            creditId: paymentData.creditId,
            error: 'Datos incompletos: creditId, amount y managedBy son requeridos'
          });
          continue;
        }

        // Preparar datos del pago
        const paymentToAdd = {
          paymentDate: paymentData.paymentDate || nowInNicaragua(),
          amount: parseFloat(paymentData.amount),
          managedBy: paymentData.managedBy,
          transactionNumber: paymentData.transactionNumber || `MOB-${Date.now()}`,
          status: 'VALIDO' as const // Campo requerido por RegisteredPayment
        };

        // Aplicar el pago
        const result = await addPayment(paymentData.creditId, paymentToAdd, session);

        if (result.success) {
          results.push({
            success: true,
            creditId: paymentData.creditId,
            paymentId: result.paymentId,
            offlineId: paymentData.offlineId,
            transactionNumber: paymentToAdd.transactionNumber,
            timestamp: paymentToAdd.paymentDate
          });
        } else {
          results.push({
            success: false,
            creditId: paymentData.creditId,
            offlineId: paymentData.offlineId,
            error: result.error
          });
        }

      } catch (paymentError) {
        results.push({
          success: false,
          creditId: paymentData.creditId,
          offlineId: paymentData.offlineId,
          error: paymentError instanceof Error ? paymentError.message : 'Error procesando pago'
        });
      }
    }

    // Estadísticas del batch
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.length - successCount;

    return NextResponse.json({
      success: failureCount === 0,
      processed: results.length,
      successful: successCount,
      failed: failureCount,
      results: results,
      timestamp: nowInNicaragua()
    });

  } catch (error) {
    console.error('[API Mobile Payments Error]', error);
    return NextResponse.json({ 
      error: 'Error procesando pagos móviles',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}