import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CreditDetail, RegisteredPayment } from '@/lib/types';
import { Printer, Bluetooth } from 'lucide-react';
import { generateReceiptHtmlTemplate } from '@/services/pdf/receipt-template';
import { bluetoothPrinter } from '@/services/bluetooth-printer-service';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency, calculateCreditStatusDetails } from '@/lib/utils';
import { format, parseISO, isValid } from 'date-fns';
import { es } from 'date-fns/locale';

interface ReceiptPreviewProps {
    isOpen: boolean;
    onClose: () => void;
    credit: CreditDetail;
    payment: Omit<RegisteredPayment, 'id'> & { id?: string };
    isOffline?: boolean;
    isReprint?: boolean;
    userBranch?: string;
    userRole?: string;
}

export function ReceiptPreview({
    isOpen,
    onClose,
    credit,
    payment,
    isOffline = false,
    isReprint = false,
    userBranch,
    userRole
}: ReceiptPreviewProps) {
    const receiptRef = React.useRef<HTMLDivElement>(null);
    const { toast } = useToast();
    const [isBluetoothConnected, setIsBluetoothConnected] = React.useState(false);
    const [isPrinting, setIsPrinting] = React.useState(false);

    // Verificar si Bluetooth está soportado y conectado
    React.useEffect(() => {
        if (bluetoothPrinter.isSupported()) {
            setIsBluetoothConnected(bluetoothPrinter.isConnected());
        }
    }, [isOpen]);

    // Generate the HTML snippet using the shared template
    const htmlSnippet = generateReceiptHtmlTemplate({
        credit,
        payment,
        isReprint: isReprint,
        userSucursal: userBranch,
        userRole: userRole,
        isOffline: isOffline
    });

    const handleConnectBluetooth = async () => {
        try {
            await bluetoothPrinter.connect();
            setIsBluetoothConnected(true);
            toast({
                title: "Impresora Conectada",
                description: "La impresora Bluetooth se ha conectado exitosamente.",
            });
        } catch (error: any) {
            toast({
                title: "Error de Conexión",
                description: error.message || "No se pudo conectar a la impresora Bluetooth.",
                variant: "destructive",
            });
        }
    };

    const handleBluetoothPrint = async () => {
        if (!isBluetoothConnected) {
            toast({
                title: "Impresora no conectada",
                description: "Por favor, conecte la impresora Bluetooth primero.",
                variant: "destructive",
            });
            return;
        }

        setIsPrinting(true);
        try {
            // Calcular todos los valores necesarios
            const paymentsExcludingCurrent = (credit.registeredPayments || []).filter(p => {
                if (!p.id || !payment.id) return true;
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

            // Formatear fecha
            let formattedDate = '';
            try {
                // CHANGE: Use centralized formatDateForUser to ensure timezone offsets apply correctly. 
                // Using raw date-fns without timezon-info causes reprints to shift offsets.
                formattedDate = formatDateForUser(payment.paymentDate, "dd/MM/yyyy, hh:mm:ss a");
            } catch (e) {
                formattedDate = 'N/A';
            }

            const displayBranch = (userBranch || credit.branchName || 'SUCURSAL').toUpperCase().split(' - ')[0];
            const displayRole = (userRole || 'GESTOR DE COBRO').toUpperCase();
            const managedBy = (payment.managedBy || 'SISTEMA').toUpperCase();

            // Preparar datos del recibo
            const receiptData = {
                companyName: 'CREDINIC',
                receiptNumber: payment.transactionNumber || (isOffline ? 'PENDIENTE' : 'N/A'),
                creditNumber: credit.creditNumber,
                date: formattedDate,
                clientName: credit.clientName.toUpperCase(),
                clientCode: credit.clientDetails?.clientNumber || 'N/A',
                cuotaDelDia: formatCurrency(cuotaDelDia),
                montoAtrasado: formatCurrency(montoAtrasado),
                diasMora: diasMora.toString(),
                totalAPagar: formatCurrency(totalAPagar),
                montoCancelacion: formatCurrency(montoCancelacion),
                totalCobrado: formatCurrency(payment.amount),
                saldoAnterior: formatCurrency(saldoAnterior),
                nuevoSaldo: formatCurrency(nuevoSaldo),
                branch: displayBranch,
                collector: managedBy,
                role: displayRole,
                isReprint,
                isOffline,
            };

            await bluetoothPrinter.printReceipt(receiptData);

            toast({
                title: "Recibo Impreso",
                description: "El recibo se ha impreso exitosamente.",
            });

            // Cerrar el modal después de imprimir
            setTimeout(() => onClose(), 1000);
        } catch (error: any) {
            toast({
                title: "Error de Impresión",
                description: error.message || "No se pudo imprimir el recibo.",
                variant: "destructive",
            });
        } finally {
            setIsPrinting(false);
        }
    };


    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-[350px] p-0 overflow-hidden bg-white sm:rounded-lg">
                <DialogHeader className={`p-4 ${isOffline ? 'bg-amber-500' : 'bg-primary'} text-white`}>
                    <DialogTitle className="flex items-center gap-2 text-white">
                        <Printer className="h-5 w-5" />
                        Recibo de Pago
                    </DialogTitle>
                </DialogHeader>

                <div className="p-4 max-h-[70vh] overflow-y-auto bg-gray-50 flex justify-center">
                    {/* Receipt Content Container */}
                    <div
                        ref={receiptRef}
                        className="bg-white shadow-sm border p-0 w-fit"
                        dangerouslySetInnerHTML={{ __html: htmlSnippet }}
                    />
                </div>

                <DialogFooter className="p-4 bg-white border-t flex flex-col gap-2">
                    {bluetoothPrinter.isSupported() ? (
                        <>
                            {!isBluetoothConnected ? (
                                <Button
                                    variant="outline"
                                    className="w-full"
                                    onClick={handleConnectBluetooth}
                                >
                                    <Bluetooth className="mr-2 h-4 w-4" />
                                    Conectar Impresora Bluetooth
                                </Button>
                            ) : (
                                <Button
                                    className="w-full bg-blue-600 hover:bg-blue-700"
                                    onClick={handleBluetoothPrint}
                                    disabled={isPrinting}
                                >
                                    <Bluetooth className="mr-2 h-4 w-4" />
                                    {isPrinting ? 'Imprimiendo...' : 'Imprimir con Bluetooth'}
                                </Button>
                            )}
                        </>
                    ) : (
                        <div className="text-center text-sm text-muted-foreground py-2">
                            Bluetooth no disponible en este dispositivo
                        </div>
                    )}
                    <Button variant="ghost" className="w-full" onClick={onClose}>
                        Cerrar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
