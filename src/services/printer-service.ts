
import { toast } from '@/hooks/use-toast';
import { getCredit } from '@/services/credit-service';
import { generateReceiptHtmlClient } from '@/services/pdf/receipt-generator-client';

/**
 * Main print function that decides which printing method to use.
 * It opens a dedicated page for the document type which handles the final output (PDF/Print).
 * @param documentType Type of document.
 * @param entityId The ID of the credit or client.
 * @param paymentId Optional payment ID for receipts. If not provided, the service will find the latest payment.
 * @param isReprint Optional flag for receipts.
 */
export async function printDocument(
  documentType: 'receipt' | 'payment-plan' | 'promissory-note' | 'account-statement',
  entityId: string,
  paymentId: string | null, // paymentId puede ser nulo en algunos casos
  isReprint: boolean
): Promise<void> {

  if (documentType === 'receipt') {
    if (!paymentId) {
      toast({
        title: 'Error de Impresión',
        description: 'No se especificó un ID de pago para el recibo.',
        variant: 'destructive',
      });
      return;
    }

    // Lógica Offline / Híbrida para Recibos
    // Intentamos cargar el crédito (cache o red)
    const credit = await getCredit(entityId);
    if (credit) {
      const payment = (credit.registeredPayments || []).find(p => p.id === paymentId);
      if (payment) {
        // Si estamos offline O si preferimos la generación rápida en cliente
        // Para consistencia offline, usaremos el generador cliente si no hay red.
        const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;

        if (isOffline) {
          try {
            // Intentar obtener datos del usuario desde localStorage
            let userSucursal = credit.branchName || 'MATRIZ';
            let userRole = 'GESTOR DE COBRO';

            try {
              const userDataStr = localStorage.getItem('credi_user');
              if (userDataStr) {
                const userData = JSON.parse(userDataStr);
                if (userData?.sucursalName) userSucursal = userData.sucursalName;
                if (userData?.role) userRole = userData.role;
              }
            } catch (e) {
              console.warn('No se pudo obtener datos de usuario desde localStorage:', e);
            }

            const userParams = { sucursal: userSucursal, role: userRole };

            // Generar HTML
            const html = generateReceiptHtmlClient({
              credit,
              payment,
              isReprint,
              userParams
            });

            // Abrir ventana y imprimir
            const printWindow = window.open('', '_blank', 'width=400,height=600');
            if (printWindow) {
              printWindow.document.write(html);
              printWindow.document.close();
              // El script en el HTML llamará a window.print()
            } else {
              toast({ title: "Error", description: "Permite las ventanas emergentes para imprimir el recibo.", variant: "destructive" });
            }
            return; // Terminar aquí si fue exitoso offline print
          } catch (e) {
            console.error("Error imprimiendo offline:", e);
            toast({ title: "Error al generar recibo offline", description: "Intenta conectarte a internet.", variant: "destructive" });
          }
        }
      }
    }
  }

  const params = new URLSearchParams();

  if (documentType === 'receipt') {
    params.set('creditId', entityId);
    if (paymentId) params.set('paymentId', paymentId);
    if (isReprint) {
      params.set('isReprint', 'true');
    }
  } else if (documentType === 'account-statement') {
    params.set('clientId', entityId);
  } else {
    params.set('creditId', entityId);
  }

  if (documentType === 'receipt') {
    // Los recibos ya no se abren en pestaña por política de unificación y soporte offline.
    // Todas las llamadas deben manejarse a través del componente ReceiptPreview modal.
    console.warn('printDocument("receipt") depreciado. Use el modal ReceiptPreview.');
    return;
  }

  const url = `/reports/${documentType}?${params.toString()}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}

/**
 * Opens a new window with a document to be printed using the browser's standard print dialog.
 * This is meant for desktop/office use for documents like promissory notes or payment plans.
 * @param documentType The type of document to generate.
 * @param creditId The ID of the associated credit.
 */
export function printDocumentForDesktop(
  documentType: 'payment-plan' | 'promissory-note',
  creditId: string
): void {
  const params = new URLSearchParams({ creditId });
  const url = `/reports/${documentType}?${params.toString()}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}
