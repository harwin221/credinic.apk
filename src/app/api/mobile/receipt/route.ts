import { NextResponse } from 'next/server';
import { getSession } from '@/app/(auth)/login/actions';
import { getCredit } from '@/services/credit-service-server';
import { calculateCreditStatusDetails } from '@/lib/utils';
import { formatDateTimeForUser, toISOString } from '@/lib/date-utils';
import { parseISO, isValid } from 'date-fns';

/**
 * Endpoint para generar recibos de pago para impresión móvil
 * USA LA MISMA LÓGICA que receipt-html.ts para consistencia total
 */
export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { creditId, paymentId, format = 'text', isReprint = false } = await request.json();

    // Validar datos requeridos
    if (!creditId || !paymentId) {
      return NextResponse.json({ 
        error: 'Datos requeridos: creditId, paymentId' 
      }, { status: 400 });
    }

    // Obtener datos del crédito (igual que receipt-html.ts)
    const credit = await getCredit(creditId);
    if (!credit) {
      return NextResponse.json({ error: 'Crédito no encontrado' }, { status: 404 });
    }

    const client = credit.clientDetails;
    if (!client) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
    }
    
    const paymentToPrint = (credit.registeredPayments || []).find(p => p.id === paymentId);
    if (!paymentToPrint) {
      return NextResponse.json({ error: 'Pago no encontrado en el crédito' }, { status: 404 });
    }

    // MISMA LÓGICA DE CÁLCULO que receipt-html.ts
    const paymentsBeforeCurrent = (credit.registeredPayments || [])
        .filter(p => p.status !== 'ANULADO')
        .filter(p => new Date(p.paymentDate) < new Date(paymentToPrint.paymentDate));

    const creditStateBeforePayment = { ...credit, registeredPayments: paymentsBeforeCurrent };
    
    const referenceDate = toISOString(paymentToPrint.paymentDate) || paymentToPrint.paymentDate;
    const statusBefore = calculateCreditStatusDetails(creditStateBeforePayment, referenceDate);
    const statusAfter = calculateCreditStatusDetails(credit, referenceDate);

    const cuotaDelDia = statusBefore.dueTodayAmount || 0;
    const montoAtrasado = statusBefore.overdueAmount;
    const diasMora = statusBefore.lateDays;
    const totalAPagar = cuotaDelDia + montoAtrasado;
    const saldoAnterior = statusBefore.remainingBalance;
    const nuevoSaldo = statusAfter.remainingBalance;

    const sucursalName = (credit.branchName || 'LEON').split(' ')[0].toUpperCase();

    // Funciones helper (iguales que receipt-html.ts)
    const sanitize = (text: string = ''): string => {
        if (!text) return '';
        return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
    };
    const formatCurrency = (amount: number = 0) => amount.toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    // Generar recibo en formato texto (para impresoras térmicas)
    if (format === 'text') {
      const receiptText = `${isReprint ? '*** REIMPRESION ***\n' : ''}CrediNic
COPIA: CLIENTE
------------------------------------------
Recibo: ${paymentToPrint.transactionNumber}
Credito: ${credit.creditNumber}
Fecha/Hora: ${formatDateTimeForUser(paymentToPrint.paymentDate)}
------------------------------------------
Cliente:
${credit.clientName.toUpperCase()}
Código: ${client?.clientNumber || 'N/A'}
------------------------------------------
Cuota del dia:           C$ ${formatCurrency(cuotaDelDia)}
Monto atrasado:          C$ ${formatCurrency(montoAtrasado)}
Dias mora:               ${diasMora}
Total a pagar:           C$ ${formatCurrency(totalAPagar)}
------------------------------------------
TOTAL COBRADO:           C$ ${formatCurrency(paymentToPrint.amount)}
------------------------------------------
Saldo anterior:          C$ ${formatCurrency(saldoAnterior)}
Nuevo saldo:             C$ ${formatCurrency(nuevoSaldo)}
------------------------------------------
Gracias por su pago.
CONSERVE ESTE RECIBO

${sucursalName}

${paymentToPrint.managedBy.toUpperCase()}
GESTOR DE COBRO


`;

      return NextResponse.json({
        success: true,
        format: 'text',
        content: receiptText,
        metadata: {
          creditNumber: credit.creditNumber,
          clientName: credit.clientName,
          amount: paymentToPrint.amount,
          transactionNumber: paymentToPrint.transactionNumber,
          timestamp: formatDateTimeForUser(paymentToPrint.paymentDate),
          gestor: paymentToPrint.managedBy
        }
      });
    }

    // Generar recibo en formato HTML (igual que la web)
    if (format === 'html') {
      const html = `<!DOCTYPE html>
<html>
<head>
    <title>Recibo de Pago</title>
    <meta charset="UTF-8">
    <style>
        body {
            font-family: 'Courier New', Courier, monospace;
            font-size: 16px;
            line-height: 1.9;
            color: #000;
            background: #fff;
            width: 80mm;
            margin: 0;
            padding: 0;
        }
        .receipt-container {
            padding: 2mm;
        }
        .center { text-align: center; }
        .line { border-top: 1px dashed #000; margin: 5px 0; }
        .row { display: flex; justify-content: space-between; }
        .bold { font-weight: bold; }
        .uppercase { text-transform: uppercase; }
        @media print {
            @page {
                size: 80mm auto;
                margin: 0;
            }
            body {
                margin: 0;
            }
        }
    </style>
</head>
<body>
    <div class="receipt-container">
        ${isReprint ? '<div class="center bold">*** REIMPRESION ***</div>' : ''}
        <div class="center bold">CrediNic</div>
        <div class="center">COPIA: CLIENTE</div>
        <div class="line"></div>
        <div>Recibo: ${sanitize(paymentToPrint.transactionNumber)}</div>
        <div>Credito: ${sanitize(credit.creditNumber)}</div>
        <div>Fecha/Hora: ${formatDateTimeForUser(paymentToPrint.paymentDate)}</div>
        <div class="line"></div>
        <div>Cliente:</div>
        <div class="bold uppercase">${sanitize(credit.clientName)}</div>
        <div>Código: ${sanitize(client?.clientNumber) || 'N/A'}</div>
        <div class="line"></div>
        <div class="row"><span>Cuota del dia:</span> <span>C$ ${formatCurrency(cuotaDelDia)}</span></div>
        <div class="row"><span>Monto atrasado:</span> <span>C$ ${formatCurrency(montoAtrasado)}</span></div>
        <div class="row"><span>Dias mora:</span> <span>${diasMora}</span></div>
        <div class="row bold"><span>Total a pagar:</span> <span>C$ ${formatCurrency(totalAPagar)}</span></div>
        <div class="line"></div>
        <div class="row bold"><span>TOTAL COBRADO:</span> <span>C$ ${formatCurrency(paymentToPrint.amount)}</span></div>
        <div class="line"></div>
        <div class="row"><span>Saldo anterior:</span> <span>C$ ${formatCurrency(saldoAnterior)}</span></div>
        <div class="row bold"><span>Nuevo saldo:</span> <span>C$ ${formatCurrency(nuevoSaldo)}</span></div>
        <div class="line"></div>
        <div class="center" style="margin-top: 10px;">Gracias por su pago.</div>
        <div class="center bold">CONSERVE ESTE RECIBO</div>
        <div class="center" style="margin-top: 20px;">${sanitize(sucursalName)}</div>
        <div class="center" style="margin-top: 10px;">${sanitize(paymentToPrint.managedBy.toUpperCase())}</div>
        <div class="center bold">GESTOR DE COBRO</div>
    </div>
</body>
</html>`;

      return NextResponse.json({
        success: true,
        format: 'html',
        content: html,
        metadata: {
          creditNumber: credit.creditNumber,
          clientName: credit.clientName,
          amount: paymentToPrint.amount,
          transactionNumber: paymentToPrint.transactionNumber,
          timestamp: formatDateTimeForUser(paymentToPrint.paymentDate),
          gestor: paymentToPrint.managedBy
        }
      });
    }

    // Generar recibo en formato JSON (para la App Móvil - Reimpresión exacta)
    if (format === 'json') {
      return NextResponse.json({
        success: true,
        data: {
          transactionNumber: paymentToPrint.transactionNumber,
          creditNumber: credit.creditNumber,
          paymentDate: formatDateTimeForUser(paymentToPrint.paymentDate),
          clientName: credit.clientName,
          clientCode: client?.clientNumber || 'N/A',
          amountPaid: paymentToPrint.amount,
          saldoAnterior,
          nuevoSaldo,
          diasMora,
          montoAtrasado,
          totalAPagar,
          cuotaDelDia,
          montoCancelacion: statusBefore.remainingBalance,
          sucursal: sucursalName,
          managedBy: paymentToPrint.managedBy,
          role: 'GESTOR'
        }
      });
    }

    return NextResponse.json({ 
      error: 'Formato no soportado. Use: text, html o json' 
    }, { status: 400 });

  } catch (error) {
    console.error('[API Mobile Receipt Error]', error);
    return NextResponse.json({ 
      error: 'Error generando recibo móvil',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}