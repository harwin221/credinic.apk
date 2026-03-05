import { CreditDetail, RegisteredPayment } from '@/lib/types';
import { calculateCreditStatusDetails, formatCurrency } from '@/lib/utils';
import { formatDateForUser } from '@/lib/date-utils';

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
    <div style="font-family: Arial, sans-serif; font-size: 13px; line-height: 1.6; color: #000; width: 80mm; padding: 10px; box-sizing: border-box; background: white;">
      <div style="text-align: center; margin-bottom: 10px;">
        <div style="font-size: 20px; font-weight: bold; letter-spacing: 1px;">CREDINICA</div>
        <div style="font-size: 10px; color: #555;">COPIA: CLIENTE</div>
      </div>
      
      ${line}
      
      ${isReprint ? '<div style="text-align: center; font-weight: bold; font-size: 14px; margin: 4px 0;">*** REIMPRESIÓN ***</div>' : ''}
      ${isOffline ? '<div style="text-align: center; font-weight: bold; background: #f0f0f0; padding: 4px; margin: 4px 0; border: 1px solid #000;">*** MODO OFFLINE ***</div>' : ''}

      <div style="margin: 8px 0;">
        ${row('Recibo:', payment.transactionNumber || (isOffline ? 'PENDIENTE' : 'N/A'))}
        ${row('Crédito:', credit.creditNumber)}
        ${row('Fecha/Hora:', formattedDate)}
      </div>
      
      ${line}
      
      <div style="margin: 10px 0;">
        <div style="font-size: 11px; color: #555; margin-bottom: 2px;">Cliente:</div>
        <div style="font-weight: bold; font-size: 15px;">${sanitize(credit.clientName)}</div>
        <div style="font-size: 12px;">Código: ${sanitize(credit.clientDetails?.clientNumber || 'N/A')}</div>
      </div>
      
      ${line}

      <div style="margin: 8px 0;">
        ${row('Cuota del día:', formatCurrency(cuotaDelDia))}
        ${row('Monto atrasado:', formatCurrency(montoAtrasado))}
        ${row('Días mora:', diasMora.toString())}
        <div style="margin-top: 6px; padding-top: 4px; border-top: 0.5px solid #eee;">
          ${row('Total a pagar:', formatCurrency(totalAPagar), true)}
        </div>
      </div>

      ${line}
      
      <div style="margin: 8px 0;">
        ${row('Monto de cancelación:', formatCurrency(montoCancelacion))}
      </div>
      
      <div style="border: 1.5px solid #000; padding: 10px; margin: 12px 0; text-align: center;">
        <div style="font-size: 11px; margin-bottom: 4px;">TOTAL COBRADO</div>
        <div style="font-weight: bold; font-size: 22px;">${formatCurrency(payment.amount)}</div>
      </div>

      <div style="text-align: center; font-style: italic; font-size: 11px; margin: 8px 0; color: #444;">Concepto: ABONO DE CRÉDITO</div>
      
      <div style="margin: 12px 0; background: #f9f9f9; padding: 8px; border-radius: 4px;">
        ${row('Saldo anterior:', formatCurrency(saldoAnterior))}
        <div style="margin-top: 4px; color: #000;">
          ${row('Nuevo saldo:', formatCurrency(nuevoSaldo), true)}
        </div>
      </div>

      ${line}

      <div style="text-align: center; margin-top: 25px;">
        <div style="font-size: 12px; margin-bottom: 15px;">¡Gracias por su pago!<br><b>CONSERVE ESTE RECIBO</b></div>
        
        <div style="margin-top: 40px;">
          <div style="width: 180px; margin: 0 auto; border-top: 1px solid #000; padding-top: 5px;">
             <div style="font-weight: bold; font-size: 13px;">${sanitize(displayBranch)}</div>
          </div>
          
          <div style="margin-top: 15px;">
            <div style="font-weight: bold; font-size: 13px; color: #000;">${managedBy}</div>
            <div style="font-size: 11px; color: #444;">${displayRole}</div>
          </div>
        </div>
      </div>
    </div>
  `;
}
