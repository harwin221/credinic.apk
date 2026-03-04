import { CreditDetail, RegisteredPayment } from '@/lib/types';
import { calculateCreditStatusDetails, formatCurrency } from '@/lib/utils';
import { format, parseISO, isValid } from 'date-fns';
import { es } from 'date-fns/locale';

interface ReceiptTemplateProps {
  credit: CreditDetail;
  payment: Omit<RegisteredPayment, 'id'> & { id?: string };
  isReprint: boolean;
  userSucursal?: string;
  userRole?: string;
  isOffline?: boolean;
}

/**
 * SOURCE OF TRUTH for the Receipt HTML Layout.
 * Used by Modal, Server-side PDF/HTML and Offline printing.
 */
export function generateReceiptHtmlTemplate({
  credit,
  payment,
  isReprint,
  userSucursal,
  userRole,
  isOffline = false
}: ReceiptTemplateProps): string {
  // 1. Precise calculations for the receipt (Before-payment state)
  const paymentsExcludingCurrent = (credit.registeredPayments || []).filter(p => {
    if (!p.id || !payment.id) return true; // Fallback
    return p.id !== payment.id && p.status !== 'ANULADO';
  });

  const creditBefore = { ...credit, registeredPayments: paymentsExcludingCurrent };
  const statusBefore = calculateCreditStatusDetails(creditBefore, payment.paymentDate);
  const statusAfter = calculateCreditStatusDetails(credit, payment.paymentDate);

  const cuotaDelDia = statusBefore.dueTodayAmount;
  const montoAtrasado = statusBefore.overdueAmount;
  const diasMora = statusBefore.lateDays;
  const totalAPagar = cuotaDelDia + montoAtrasado;
  const saldoAnterior = statusBefore.remainingBalance;
  const nuevoSaldo = statusAfter.remainingBalance;
  const montoCancelacion = saldoAnterior;

  // Branch and Role
  const displayBranch = (userSucursal || credit.branchName || 'SUCURSAL').toUpperCase().split(' - ')[0];
  const displayRole = (userRole || 'GESTOR DE COBRO').toUpperCase();
  const managedBy = (payment.managedBy || 'SISTEMA').toUpperCase();

  // Date Formatting
  let formattedDate = '';
  try {
    // CHANGE: Use centralized formatDateForUser to prevent timezone drift, same as ReceiptPreview
    const { formatDateForUser } = require('@/lib/date-utils');
    formattedDate = formatDateForUser(payment.paymentDate, "dd/MM/yyyy, hh:mm:ss a");
  } catch (e) {
    formattedDate = 'N/A';
  }

  const sanitize = (text: string = ''): string => {
    if (!text) return '';
    return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
  };

  const line = '<div style="border-top: 1px dashed #000; margin: 8px 0;"></div>';
  const row = (label: string, value: string, bold = false) => `
    <div style="display: flex; justify-content: space-between; ${bold ? 'font-weight: bold;' : ''}">
      <span>${label}</span>
      <span>${value}</span>
    </div>
  `;

  return `
    <div style="font-family: 'Courier New', Courier, monospace; font-size: 14px; line-height: 1.4; color: #000; width: 80mm; padding: 10px; box-sizing: border-box;">
      <div style="text-align: center;">
        <div style="font-size: 18px; font-weight: bold;">CrediNica</div>
        <div style="font-size: 10px;">COPIA: CLIENTE</div>
      </div>
      
      ${line}
      
      ${isReprint ? '<div style="text-align: center; font-weight: bold;">*** REIMPRESION ***</div>' : ''}
      ${isOffline ? '<div style="text-align: center; font-weight: bold; background: #eee; padding: 2px;">*** MODO OFFLINE ***</div>' : ''}

      ${row('Recibo:', payment.transactionNumber || (isOffline ? 'PENDIENTE' : 'N/A'))}
      ${row('Crédito:', credit.creditNumber)}
      ${row('Fecha/Hora:', formattedDate)}
      
      ${line}
      
      <div style="margin: 4px 0;">
        <div style="font-size: 11px;">Cliente:</div>
        <div style="font-weight: bold; font-size: 14px;">${sanitize(credit.clientName)}</div>
        <div style="font-size: 11px;">${sanitize(credit.clientDetails?.clientNumber || 'N/A')}</div>
      </div>
      
      ${line}

      ${row('Cuota del dia:', formatCurrency(cuotaDelDia))}
      ${row('Monto atrasado:', formatCurrency(montoAtrasado))}
      ${row('Dias mora:', diasMora.toString())}
      <div style="margin-top: 4px;">
        ${row('Total a pagar:', formatCurrency(totalAPagar), true)}
      </div>

      ${line}
      
      ${row('Monto de cancelación:', formatCurrency(montoCancelacion))}
      
      <div style="border-top: 1px solid #000; border-bottom: 1px solid #000; padding: 8px 0; margin: 8px 0;">
        <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 16px;">
            <span>TOTAL COBRADO:</span>
            <span>${formatCurrency(payment.amount)}</span>
        </div>
      </div>

      <div style="text-align: center; font-style: italic; font-size: 10px; margin: 4px 0;">Concepto: ABONO DE CREDITO</div>
      
      <div style="margin-top: 12px;">
        ${row('Saldo anterior:', formatCurrency(saldoAnterior))}
        ${row('Nuevo saldo:', formatCurrency(nuevoSaldo), true)}
      </div>

      ${line}

      <div style="text-align: center; margin-top: 20px;">
        <div style="font-size: 11px;">Gracias por su pago.<br>CONSERVE ESTE RECIBO</div>
        
        <div style="margin-top: 30px;">
          <span style="border-bottom: 1px solid #000; padding: 0 40px; font-weight: bold;">
            ${sanitize(displayBranch)}
          </span>
          <div style="font-size: 10px; margin-top: 10px; color: #333;">
            <div style="font-weight: bold; color: #000;">${managedBy}</div>
            <div>${displayRole}</div>
          </div>
        </div>
      </div>
    </div>
  `;
}
