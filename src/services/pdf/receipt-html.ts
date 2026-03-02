

'use server';

import { query } from '@/lib/mysql';
import type { CreditDetail, ReceiptInput, Client, RegisteredPayment } from '@/lib/types';
import { calculateCreditStatusDetails } from '@/lib/utils';
import { parseISO, isValid } from 'date-fns';
import { getClient } from '@/services/client-service-server';
import { getCredit as getCreditServer } from '@/services/credit-service-server';
import { toISOString } from '@/lib/date-utils';


interface HtmlReceiptOutput {
    html?: string;
    error?: string;
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
        if (typeof date === 'number') {
            return toISOString(date) || undefined;
        }
    } catch (e) {
        console.error("toISOStringSafe falló para la fecha:", date, e);
    }
    return undefined;
};


const formatLocalTime = (utcDateString?: string): string => {
    if (!utcDateString) return 'Fecha inválida';
    try {
        const utcDate = parseISO(utcDateString);
        if (!isValid(utcDate)) return 'Fecha inválida';
        // Usar Intl.DateTimeFormat para un manejo robusto de la zona horaria en el servidor
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
    } catch (e) {
        console.error("Error formatting date: ", e);
        return 'Fecha inválida';
    }
};

interface GenerateReceiptHtmlInput extends ReceiptInput { }

export async function generateReceiptHtml({ creditId, paymentId, isReprint }: GenerateReceiptHtmlInput): Promise<HtmlReceiptOutput> {
    try {
        // 1. Obtener toda la información de una vez de forma eficiente
        const credit = await getCreditServer(creditId);
        if (!credit) return { error: 'Crédito no encontrado.' };

        const client = credit.clientDetails;
        if (!client) return { error: 'Cliente no encontrado.' };

        const paymentToPrint = (credit.registeredPayments || []).find(p => p.id === paymentId);

        if (!paymentToPrint) {
            console.error(`Error de lógica: No se encontró el pago con ID ${paymentId} en el crédito ${creditId} para generar el recibo.`);
            return { error: 'Pago no encontrado en el crédito. No se puede generar el recibo.' };
        }

        // --- 2. Cálculo de Datos ---
        // Filtrar pagos realizados ANTES del pago actual para obtener el estado pre-pago.
        const paymentsBeforeCurrent = (credit.registeredPayments || [])
            .filter(p => p.status !== 'ANULADO')
            .filter(p => {
                const pDate = toISOString(p.paymentDate);
                const printDate = toISOString(paymentToPrint.paymentDate);
                return pDate && printDate && pDate < printDate;
            });

        const creditStateBeforePayment = { ...credit, registeredPayments: paymentsBeforeCurrent };

        const statusBefore = calculateCreditStatusDetails(creditStateBeforePayment, paymentToPrint.paymentDate);
        const statusAfter = calculateCreditStatusDetails(credit, paymentToPrint.paymentDate);

        const cuotaDelDia = statusBefore.dueTodayAmount || 0;
        const montoAtrasado = statusBefore.overdueAmount;
        const diasMora = statusBefore.lateDays;
        const totalAPagar = cuotaDelDia + montoAtrasado;
        const saldoAnterior = statusBefore.remainingBalance;
        const nuevoSaldo = statusAfter.remainingBalance;

        const [users]: any = await query('SELECT sucursal_name, role FROM users WHERE fullName = ? LIMIT 1', [paymentToPrint.managedBy]);
        const userDetails = users && users.length > 0 ? users[0] : null;

        let userBranch = (credit.branchName || 'LEON').split(' ')[0].toUpperCase();
        let userRole = 'GESTOR DE COBRO';

        if (userDetails) {
            if (userDetails.sucursal_name) {
                userBranch = userDetails.sucursal_name.toUpperCase();
            }
            if (userDetails.role) {
                // Map roles to readable names if necessary, or use directly
                const roleMap: Record<string, string> = {
                    'ADMINISTRADOR': 'ADMINISTRADOR',
                    'GERENTE': 'GERENTE DE SUCURSAL',
                    'GESTOR': 'GESTOR DE COBRO',
                    'CAJERO': 'CAJERO',
                    'SUPERVISOR': 'SUPERVISOR'
                };
                userRole = roleMap[userDetails.role] || userDetails.role;
            }
        }

        // --- Funciones de Ayuda ---
        const sanitize = (text: string = ''): string => {
            if (!text) return '';
            return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
        };
        const formatCurrency = (amount: number = 0) => amount.toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

        const { generateReceiptHtmlTemplate } = await import('./receipt-template');
        const html = generateReceiptHtmlTemplate({
            credit,
            payment: paymentToPrint,
            isReprint,
            userSucursal: userBranch,
            userRole: userRole
        });

        // Wrap the generated receipt in a full HTML document for the /reports/receipt page
        const fullHtml = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Recibo - ${credit.creditNumber}</title>
                <meta charset="UTF-8">
                <style>
                    body { margin: 0; padding: 0; background: #fff; }
                    @media print { @page { size: 80mm auto; margin: 0; } }
                </style>
            </head>
            <body>
                ${html}
            </body>
            </html>
        `;

        return { html: fullHtml };
    } catch (e: any) {
        console.error("HTML Generation Error:", e);
        return { error: `Error al generar el HTML del recibo: ${e.message}` };
    }
}
