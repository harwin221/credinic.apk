import * as Print from 'expo-print';
import { ReceiptData } from '../components/ReceiptModal';

/**
 * Servicio de gestión de impresoras térmicas. 
 * Actualmente utiliza expo-print como puente para la impresión del sistema.
 */
class ThermalPrinterService {
    /**
     * Busca impresoras Bluetooth emparejadas en el sistema.
     * En el entorno Expo actual, se apoya en el diálogo del sistema Android/iOS.
     */
    async findPrinters(): Promise<any[]> {
        return [
            {
                name: 'Impresora Térmica (Sistema)',
                address: 'Bluetooth / Red',
                info: 'Usa la impresora configurada por defecto en tu dispositivo'
            }
        ];
    }

    /**
     * Imprime un recibo utilizando el servicio de impresión del sistema (expo-print).
     * El HTML está optimizado para papel térmico de 58mm y 80mm.
     */
    async printReceipt(printerName: string, receipt: ReceiptData): Promise<void> {
        try {
            console.log('[PRINT] Generando recibo para:', receipt.transactionNumber);
            const html = this.generateReceiptHtml(receipt);
            
            // expo-print abre el diálogo del sistema donde el usuario elige la impresora Bluetooth
            await Print.printAsync({ 
                html,
                // En iOS esto ayuda a definir el tamaño inicial, en Android depende del driver del sistema
                width: 302, // 80mm aprox en puntos (72 dpi)
            });
            console.log('[PRINT] Impresión enviada al sistema');
        } catch (error) {
            console.error('[PRINT] Error en servicio de impresión:', error);
            throw new Error('No se pudo establecer conexión con el servicio de impresión');
        }
    }

    /**
     * Genera un HTML minimalista y optimizado para impresoras térmicas de 57mm/80mm.
     * Se utiliza fuente Courier para asegurar que los espacios coincidan como en una máquina de escribir.
     */
    public generateReceiptHtml(r: ReceiptData): string {
        const fmt = (n: number) => n.toLocaleString('es-NI', { 
            minimumFractionDigits: 2, 
            maximumFractionDigits: 2 
        });
        
        return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        @page {
            size: 80mm auto;
            margin: 0;
        }
        body {
            font-family: 'Courier New', Courier, monospace;
            font-size: 13px;
            width: 72mm; /* Dejamos margen de seguridad para 80mm */
            margin: 0 auto;
            padding: 5px;
            line-height: 1.2;
            color: #000;
        }
        .center { text-align: center; }
        .brand { 
            font-size: 22px; 
            font-weight: bold; 
            margin: 5px 0;
            text-transform: uppercase;
        }
        .subtitle {
            font-size: 11px;
            margin-bottom: 5px;
        }
        .divider { 
            border-top: 1px dashed #000; 
            margin: 8px 0; 
            width: 100%;
        }
        .row { 
            display: flex; 
            justify-content: space-between; 
            margin: 2px 0; 
        }
        .bold { font-weight: bold; }
        .client-name {
            font-size: 14px;
            font-weight: bold;
            margin: 4px 0;
        }
        .total-box { 
            border: 2px solid #000; 
            text-align: center; 
            padding: 8px; 
            margin: 10px 0; 
        }
        .total-label {
            font-size: 10px;
            font-weight: bold;
        }
        .total-amount { 
            font-size: 22px; 
            font-weight: bold; 
        }
        .summary-box { 
            background: #f0f0f0; 
            padding: 6px; 
            margin: 8px 0; 
        }
        .footer {
            margin-top: 20px;
            font-size: 11px;
        }
        .signature-line {
            margin-top: 30px;
            border-top: 1px solid #000;
            width: 80%;
            margin-left: 10%;
        }
    </style>
</head>
<body>
    <div class="center">
        <div class="brand">CREDINIC</div>
        <div class="subtitle">ESTADO DE CUENTA / RECIBO</div>
        <div class="bold">COPIA: CLIENTE</div>
    </div>
    
    <div class="divider"></div>
    
    <div class="row">
        <span>No. Recibo:</span>
        <span class="bold">${r.transactionNumber}</span>
    </div>
    <div class="row">
        <span>No. Crédito:</span>
        <span class="bold">${r.creditNumber}</span>
    </div>
    <div class="row">
        <span>Fecha Pago:</span>
        <span>${r.paymentDate}</span>
    </div>
    
    <div class="divider"></div>
    
    <div>CLIENTE:</div>
    <div class="client-name">${r.clientName.toUpperCase()}</div>
    <div>CÓDIGO: ${r.clientCode}</div>
    
    <div class="divider"></div>
    
    <div class="row">
        <span>Cuota del Día:</span>
        <span>C$ ${fmt(r.cuotaDelDia)}</span>
    </div>
    <div class="row">
        <span>Mora / Atraso:</span>
        <span>C$ ${fmt(r.montoAtrasado)}</span>
    </div>
    <div class="row">
        <span>Días Mora:</span>
        <span>${r.diasMora}</span>
    </div>
    <div class="row bold">
        <span>Total Exigible:</span>
        <span>C$ ${fmt(r.totalAPagar)}</span>
    </div>
    
    <div class="divider"></div>
    
    <div class="total-box">
        <div class="total-label">MONTO RECIBIDO</div>
        <div class="total-amount">C$ ${fmt(r.amountPaid)}</div>
    </div>
    
    <div class="center bold" style="font-size: 10px; margin-bottom: 5px;">
        CONCEPTO: ABONO DE CRÉDITO
    </div>
    
    <div class="summary-box">
        <div class="row">
            <span>Saldo Anterior:</span>
            <span>C$ ${fmt(r.saldoAnterior)}</span>
        </div>
        <div class="row bold">
            <span>Nuevo Saldo:</span>
            <span>C$ ${fmt(r.nuevoSaldo)}</span>
        </div>
    </div>

    <div class="row" style="font-size: 10px;">
        <span>Cancelación Total:</span>
        <span>C$ ${fmt(r.montoCancelacion)}</span>
    </div>
    
    <div class="divider"></div>
    
    <div class="center footer">
        ¡GRACIAS POR SU PAGO!<br>
        PROHIBIDO EL PAGO SIN RECIBO<br>
        <span class="bold">CONSERVE ESTE DOCUMENTO</span>
    </div>
    
    <div class="center" style="margin-top: 40px;">
        <div class="signature-line"></div>
        <div class="bold" style="margin-top: 5px;">${r.sucursal.toUpperCase()}</div>
        <div class="bold">${r.managedBy.toUpperCase()}</div>
        <div style="font-size: 10px;">${r.role.toUpperCase()}</div>
    </div>

    <div style="height: 50px;"></div> <!-- Espacio para corte manual -->
</body>
</html>`;
    }
}

export const thermalPrinterService = new ThermalPrinterService();
