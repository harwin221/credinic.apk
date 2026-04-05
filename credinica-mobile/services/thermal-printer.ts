import * as Print from 'expo-print';
import { ReceiptData } from '../components/ReceiptModal';
import { Platform, PermissionsAndroid } from 'react-native';

// Intentamos cargar la librería nativa para el APK
// Si falla (como en Expo Go), se ignora silenciosamente
let EscPosPrinter: any = null;
try {
    const printerLib = require('react-native-esc-pos-printer');
    EscPosPrinter = printerLib.default || printerLib;
} catch (e) {
    console.log('[PRINT] Librería nativa no disponible en este entorno (Expo Go). Usando diálogo del sistema.');
}

class ThermalPrinterService {
    /**
     * Solicita permisos de Bluetooth necesarios para Android 12+
     */
    async requestBluetoothPermissions(): Promise<boolean> {
        if (Platform.OS !== 'android') {
            return true; // iOS no necesita permisos explícitos
        }

        try {
            const apiLevel = Platform.Version;
            console.log('[PRINT] Android API Level:', apiLevel);

            // Android 12+ (API 31+) requiere nuevos permisos
            if (apiLevel >= 31) {
                const granted = await PermissionsAndroid.requestMultiple([
                    PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
                    PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
                ]);

                const scanGranted = granted['android.permission.BLUETOOTH_SCAN'] === PermissionsAndroid.RESULTS.GRANTED;
                const connectGranted = granted['android.permission.BLUETOOTH_CONNECT'] === PermissionsAndroid.RESULTS.GRANTED;

                console.log('[PRINT] Permisos Bluetooth:', { scanGranted, connectGranted });
                return scanGranted && connectGranted;
            } else {
                // Android 11 y anteriores usan permisos legacy
                const granted = await PermissionsAndroid.requestMultiple([
                    PermissionsAndroid.PERMISSIONS.BLUETOOTH,
                    PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADMIN,
                    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
                ]);

                const bluetoothGranted = granted['android.permission.BLUETOOTH'] === PermissionsAndroid.RESULTS.GRANTED;
                const locationGranted = granted['android.permission.ACCESS_FINE_LOCATION'] === PermissionsAndroid.RESULTS.GRANTED;

                console.log('[PRINT] Permisos Bluetooth (legacy):', { bluetoothGranted, locationGranted });
                return bluetoothGranted && locationGranted;
            }
        } catch (error) {
            console.error('[PRINT] Error solicitando permisos:', error);
            return false;
        }
    }

    /**
     * Busca impresoras Bluetooth emparejadas en el sistema.
     */
    async findPrinters(): Promise<any[]> {
        // Primero solicitar permisos
        const hasPermissions = await this.requestBluetoothPermissions();
        if (!hasPermissions) {
            console.log('[PRINT] Permisos de Bluetooth no otorgados');
            // Aún así retornar la opción del sistema
            return [
                {
                    name: 'Impresora Térmica (Sistema)',
                    address: 'Bluetooth / Red',
                    info: 'Usa la impresora configurada por defecto en tu dispositivo',
                    isNative: false
                }
            ];
        }

        if (EscPosPrinter && Platform.OS === 'android') {
            try {
                console.log('[PRINT] Buscando impresoras Bluetooth nativas...');
                // Buscamos impresoras Bluetooth emparejadas nativamente
                const devices = await EscPosPrinter.discover({ connectionType: 'Bluetooth' });
                console.log('[PRINT] Dispositivos encontrados:', devices.length);
                
                const printers = devices.map((d: any) => ({
                    name: d.name || 'Impresora Bluetooth',
                    address: d.target,
                    info: 'Bluetooth',
                    isNative: true,
                    target: d.target
                }));
                
                // Siempre agregar la opción del sistema como fallback
                printers.push({
                    name: 'Impresora Térmica (Sistema)',
                    address: 'Bluetooth / Red',
                    info: 'Usa la impresora configurada por defecto en tu dispositivo',
                    isNative: false
                });
                
                return printers;
            } catch (error) {
                console.log('[PRINT] Error en descubrimiento nativo:', error);
            }
        }

        // Fallback: Diálogo del sistema
        return [
            {
                name: 'Impresora Térmica (Sistema)',
                address: 'Bluetooth / Red',
                info: 'Usa la impresora configurada por defecto en tu dispositivo',
                isNative: false
            }
        ];
    }

    /**
     * Imprime un recibo. Si es una impresora nativa usa ESC/POS, si no usa el diálogo del sistema.
     */
    async printReceipt(printerName: string, receipt: ReceiptData, selectedTarget?: string): Promise<void> {
        try {
            console.log('[PRINT] Generando recibo para:', receipt.transactionNumber, 'Usando:', printerName);

            // SI HAY LIBRERÍA NATIVA Y ES UNA IMPRESORA NATIVA
            if (EscPosPrinter && selectedTarget) {
                console.log('[PRINT] Iniciando impresión NATIVA ESC/POS...');
                
                await EscPosPrinter.init({
                    type: 'Bluetooth',
                    target: selectedTarget,
                });

                const printer = new EscPosPrinter.EscPosPrinter();
                
                // Construimos los comandos ESC/POS básicos
                await printer
                    .setAlignment('center')
                    .size(1, 1)
                    .line('CREDINIC')
                    .size(0, 0)
                    .line('ESTADO DE CUENTA / RECIBO')
                    .line('COPIA: CLIENTE')
                    .line('------------------------------------------')
                    .setAlignment('left')
                    .line(`No. Recibo:  ${receipt.transactionNumber}`)
                    .line(`No. Credito: ${receipt.creditNumber}`)
                    .line(`Fecha Pago:  ${receipt.paymentDate}`)
                    .line('------------------------------------------')
                    .line('CLIENTE:')
                    .bold(true)
                    .line(receipt.clientName.toUpperCase())
                    .bold(false)
                    .line(`CÓDIGO: ${receipt.clientCode}`)
                    .line('------------------------------------------')
                    .line(`Cuota del Dia:   C$ ${this.format(receipt.cuotaDelDia)}`)
                    .line(`Mora / Atraso:   C$ ${this.format(receipt.montoAtrasado)}`)
                    .line(`Dias Mora:       ${receipt.diasMora}`)
                    .bold(true)
                    .line(`Total Exigible:  C$ ${this.format(receipt.totalAPagar)}`)
                    .bold(false)
                    .line('------------------------------------------')
                    .setAlignment('center')
                    .size(1, 1)
                    .line(`TOTAL RECIBIDO`)
                    .line(`C$ ${this.format(receipt.amountPaid)}`)
                    .size(0, 0)
                    .line('CONCEPTO: ABONO DE CREDITO')
                    .line('------------------------------------------')
                    .setAlignment('left')
                    .line(`Saldo Anterior:  C$ ${this.format(receipt.saldoAnterior)}`)
                    .bold(true)
                    .line(`Nuevo Saldo:     C$ ${this.format(receipt.nuevoSaldo)}`)
                    .bold(false)
                    .line(`Cancelacion Total: C$ ${this.format(receipt.montoCancelacion)}`)
                    .line('------------------------------------------')
                    .setAlignment('center')
                    .line('¡GRACIAS POR SU PAGO!')
                    .line('PROHIBIDO EL PAGO SIN RECIBO')
                    .bold(true)
                    .line('CONSERVE ESTE DOCUMENTO')
                    .bold(false)
                    .feed(3)
                    .line('__________________________')
                    .line(receipt.sucursal.toUpperCase())
                    .line(receipt.managedBy.toUpperCase())
                    .line(receipt.role.toUpperCase())
                    .feed(3)
                    .cut()
                    .print();

                console.log('[PRINT] Impresión nativa ESC/POS completada');
                return;
            }

            // FALLBACK: IMPRESIÓN POR DIÁLOGO DE SISTEMA (Lo que ya funcionaba)
            const html = this.generateReceiptHtml(receipt);
            await Print.printAsync({ 
                html,
                width: 302, 
            });
            console.log('[PRINT] Impresión enviada al sistema');
        } catch (error) {
            console.error('[PRINT] Error en servicio de impresión:', error);
            // Si el error es en nativo, intentamos el fallback automático
            if (selectedTarget) {
                console.log('[PRINT] Reintentando con diálogo del sistema...');
                try {
                    await this.printReceipt(printerName, receipt);
                } catch (fallbackError) {
                    throw new Error('No se pudo conectar con la impresora. Verifica que el Bluetooth esté encendido y la impresora esté emparejada y encendida.');
                }
            } else {
                throw new Error('No se pudo conectar con la impresora. Verifica que el Bluetooth esté encendido y la impresora esté emparejada y encendida.');
            }
        }
    }

    private format(n: number) {
        return n.toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    /**
     * Genera un HTML minimalista para el diálogo del sistema
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
        @page { size: 80mm auto; margin: 0; }
        body { font-family: 'Courier New', Courier, monospace; font-size: 13px; width: 72mm; margin: 0 auto; padding: 5px; line-height: 1.2; color: #000; }
        .center { text-align: center; }
        .brand { font-size: 22px; font-weight: bold; margin: 5px 0; text-transform: uppercase; }
        .subtitle { font-size: 11px; margin-bottom: 5px; }
        .divider { border-top: 1px dashed #000; margin: 8px 0; width: 100%; }
        .row { display: flex; justify-content: space-between; margin: 2px 0; }
        .bold { font-weight: bold; }
        .client-name { font-size: 14px; font-weight: bold; margin: 4px 0; }
        .total-box { border: 2px solid #000; text-align: center; padding: 8px; margin: 10px 0; }
        .total-amount { font-size: 22px; font-weight: bold; }
        .summary-box { background: #f0f0f0; padding: 6px; margin: 8px 0; }
        .footer { margin-top: 20px; font-size: 11px; }
        .signature-line { margin-top: 30px; border-top: 1px solid #000; width: 80%; margin-left: 10%; }
    </style>
</head>
<body>
    <div class="center">
        <div class="brand">CREDINIC</div>
        <div class="subtitle">ESTADO DE CUENTA / RECIBO</div>
        <div class="bold">COPIA: CLIENTE</div>
    </div>
    <div class="divider"></div>
    <div class="row"><span>No. Recibo:</span><span class="bold">${r.transactionNumber}</span></div>
    <div class="row"><span>No. Crédito:</span><span class="bold">${r.creditNumber}</span></div>
    <div class="row"><span>Fecha Pago:</span><span>${r.paymentDate}</span></div>
    <div class="divider"></div>
    <div>CLIENTE:</div>
    <div class="client-name">${r.clientName.toUpperCase()}</div>
    <div>CÓDIGO: ${r.clientCode}</div>
    <div class="divider"></div>
    <div class="row"><span>Cuota del Día:</span><span>C$ ${fmt(r.cuotaDelDia)}</span></div>
    <div class="row"><span>Mora / Atraso:</span><span>C$ ${fmt(r.montoAtrasado)}</span></div>
    <div class="row"><span>Días Mora:</span><span>${r.diasMora}</span></div>
    <div class="row bold"><span>Total Exigible:</span><span>C$ ${fmt(r.totalAPagar)}</span></div>
    <div class="divider"></div>
    <div class="total-box"><div class="total-amount">C$ ${fmt(r.amountPaid)}</div></div>
    <div class="center bold" style="font-size: 10px; margin-bottom: 5px;">CONCEPTO: ABONO DE CRÉDITO</div>
    <div class="summary-box">
        <div class="row"><span>Saldo Anterior:</span><span>C$ ${fmt(r.saldoAnterior)}</span></div>
        <div class="row bold"><span>Nuevo Saldo:</span><span>C$ ${fmt(r.nuevoSaldo)}</span></div>
    </div>
    <div class="divider"></div>
    <div class="center footer">
        ¡GRACIAS POR SU PAGO!<br>PROHIBIDO EL PAGO SIN RECIBO<br><span class="bold">CONSERVE ESTE DOCUMENTO</span>
    </div>
    <div class="center" style="margin-top: 40px;">
        <div class="signature-line"></div>
        <div class="bold">${r.sucursal.toUpperCase()}</div><div class="bold">${r.managedBy.toUpperCase()}</div>
    </div>
</body>
</html>`;
    }
}

export const thermalPrinterService = new ThermalPrinterService();
