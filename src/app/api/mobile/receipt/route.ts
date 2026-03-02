import { NextResponse } from 'next/server';
import { getSession } from '@/app/(auth)/login/actions';
import { getCredit } from '@/services/credit-service-server';
import { calculateCreditStatusDetails } from '@/lib/utils';
import { formatDateTimeForUser } from '@/lib/date-utils';
import { parseISO, isValid } from 'date-fns';

// Función helper para formatear fechas (igual que en receipt-html.ts)
const toISOStringSafe = (date: any): string | undefined => {
    if (!date) return undefined;
    try {
        if (date instanceof Date) {
            if (isValid(date)) return date.toISOString();
        }
        if (typeof date === 'string') {
            const parsed = parseISO(date);
            if (isValid(parsed)) return parsed.toISOString();
        }
         if (typeof date === 'number') {
            const d = new Date(date);
            if (isValid(d)) return d.toISOString();
        }
    } catch (e) {
        console.error("toISOStringSafe falló para la fecha:", date, e);
    }
    return undefined;
};

const formatLocalTime = (utcDateString?: string): string => {
    if(!utcDateString) return 'Fecha inválida';
    try {
        const utcDate = parseISO(utcDateString);
        if (!isValid(utcDate)) return 'Fecha inválida';
        const formatter = new Intl.DateTimeFormat('es-NI', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: 'numeric',
            minute: 'numeric',
            second: 'numeric',
            hour12: true,
            timeZone: 'America/Managua',
        });
        return formatter.format(utcDate);
    } catch (e){
        console.error("Error formatting date: ", e);
        return 'Fecha inválida';
    }
};

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
    
    const statusBefore = calculateCreditStatusDetails(creditStateBeforePayment, paymentToPrint.paymentDate);
    const statusAfter = calculateCreditStatusDetails(credit, paymentToPrint.paymentDate);

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
Fecha/Hora: ${formatLocalTime(toISOStringSafe(paymentToPrint.paymentDate))}
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
          timestamp: formatLocalTime(toISOStringSafe(paymentToPrint.paymentDate)),
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
        <div>Fecha/Hora: ${formatLocalTime(toISOStringSafe(paymentToPrint.paymentDate))}</div>
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
          timestamp: formatLocalTime(toISOStringSafe(paymentToPrint.paymentDate)),
          gestor: paymentToPrint.managedBy
        }
      });
    }

    return NextResponse.json({ 
      error: 'Formato no soportado. Use: text o html' 
    }, { status: 400 });

  } catch (error) {
    console.error('[API Mobile Receipt Error]', error);
    return NextResponse.json({ 
      error: 'Error generando recibo móvil',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}