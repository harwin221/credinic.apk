
import type { CreditDetail, RegisteredPayment } from '@/lib/types';
import { calculateCreditStatusDetails } from '@/lib/utils';
import { parseISO, isValid, format } from 'date-fns';
import { es } from 'date-fns/locale';

interface GenerateReceiptHtmlClientInput {
    credit: CreditDetail;
    payment: RegisteredPayment;
    isReprint: boolean;
    userParams?: {
        sucursal?: string;
        role?: string;
    }
}

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
    } catch (e) {
        console.error("toISOStringSafe failed:", date);
    }
    return undefined;
};

const formatLocalTime = (utcDateString?: string): string => {
    if (!utcDateString) return 'Fecha inválida';
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
        });
        return formatter.format(utcDate);
    } catch (e) {
        return 'Fecha inválida';
    }
};

export function generateReceiptHtmlClient({ credit, payment, isReprint, userParams }: GenerateReceiptHtmlClientInput): string {
    const client = credit.clientDetails;

    // Calcular estados
    const paymentsBeforeCurrent = (credit.registeredPayments || [])
        .filter(p => p.status !== 'ANULADO')
        .filter(p => {
            // Simple string comparison for ISO dates usually works
            const pDate = new Date(p.paymentDate).getTime();
            const printDate = new Date(payment.paymentDate).getTime();
            return pDate < printDate;
        });

    const creditStateBeforePayment = { ...credit, registeredPayments: paymentsBeforeCurrent };

    // Recalcular statusDetails
    const statusBefore = calculateCreditStatusDetails(creditStateBeforePayment, payment.paymentDate);
    // Para statusAfter usamos el crédito con TODOS los pagos hasta este momento inclusive
    // Pero ojo: si el crédito pasado ya tiene pagos FUTUROS (reimpresión vieja), debemos filtrar
    // los posteriores al pago actual para que el saldo "nuevo" sea el de ese momento.
    const paymentsUntilCurrent = (credit.registeredPayments || [])
        .filter(p => p.status !== 'ANULADO')
        .filter(p => {
            const pDate = new Date(p.paymentDate).getTime();
            const printDate = new Date(payment.paymentDate).getTime();
            return pDate <= printDate;
        });
    const creditStateAtPayment = { ...credit, registeredPayments: paymentsUntilCurrent };
    const statusAfter = calculateCreditStatusDetails(creditStateAtPayment, payment.paymentDate);

    const cuotaDelDia = statusBefore.dueTodayAmount || 0;
    const montoAtrasado = statusBefore.overdueAmount;
    const diasMora = statusBefore.lateDays;
    const totalAPagar = cuotaDelDia + montoAtrasado;
    const saldoAnterior = statusBefore.remainingBalance;
    const nuevoSaldo = statusAfter.remainingBalance; // Saldo justo después de este pago

    const { generateReceiptHtmlTemplate } = require('./receipt-template');

    const htmlSnippet = generateReceiptHtmlTemplate({
        credit,
        payment,
        isReprint,
        userSucursal: userParams?.sucursal,
        userRole: userParams?.role
    });

    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Recibo</title>
            <meta charset="UTF-8">
            <style>
                body { margin: 0; padding: 0; background: #fff; }
                @media print { @page { size: 80mm auto; margin: 0; } }
            </style>
        </head>
        <body>
            ${htmlSnippet}
            <script>
                window.onload = function() { window.print(); }
            </script>
        </body>
        </html>
    `;

    return html;

    return html;
}
