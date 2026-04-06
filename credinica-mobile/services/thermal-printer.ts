import { ReceiptData } from '../components/ReceiptModal';
import { Platform, PermissionsAndroid } from 'react-native';

// Importamos la librería moderna
let EscPosPrinter: any = null;
try {
    const printerLib = require('react-native-esc-pos-printer');
    EscPosPrinter = printerLib.default || printerLib;
} catch (e) {
    console.log('[PRINT] react-native-esc-pos-printer no disponible (Expo Go).');
}

class ThermalPrinterService {
    /**
     * Solicita permisos de Bluetooth necesarios para Android 12+
     */
    async requestBluetoothPermissions(): Promise<boolean> {
        if (Platform.OS !== 'android') {
            return true;
        }

        try {
            const apiLevel = Platform.Version;
            
            if (typeof apiLevel === 'number' && apiLevel >= 31) {
                const granted = await PermissionsAndroid.requestMultiple([
                    PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
                    PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
                ]);

                return (
                    (granted as any)['android.permission.BLUETOOTH_SCAN'] === PermissionsAndroid.RESULTS.GRANTED &&
                    (granted as any)['android.permission.BLUETOOTH_CONNECT'] === PermissionsAndroid.RESULTS.GRANTED
                );
            } else {
                // Para versiones anteriores, necesitamos ubicación y los permisos clásicos
                const granted = await PermissionsAndroid.requestMultiple([
                    'android.permission.BLUETOOTH' as any,
                    'android.permission.BLUETOOTH_ADMIN' as any,
                    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
                ]);

                return (
                    (granted as any)['android.permission.BLUETOOTH'] === PermissionsAndroid.RESULTS.GRANTED &&
                    (granted as any)['android.permission.ACCESS_FINE_LOCATION'] === PermissionsAndroid.RESULTS.GRANTED
                );
            }
        } catch (error) {
            console.error('[PRINT] Error permisos:', error);
            return false;
        }
    }

    /**
     * Busca impresoras Bluetooth emparejadas.
     */
    async findPrinters(): Promise<any[]> {
        const hasPermissions = await this.requestBluetoothPermissions();
        if (!hasPermissions) {
            console.warn('[PRINT] Sin permisos de Bluetooth.');
        }

        if (!EscPosPrinter || Platform.OS !== 'android') return [];

        try {
            console.log('[PRINT] Buscando dispositivos Bluetooth...');
            // Esta librería usa descubrimiento nativo
            const devices = await EscPosPrinter.discover({ connectionType: 'Bluetooth' });
            
            return devices.map((d: any) => ({
                name: d.name || 'Impresora Térmica',
                address: d.target, // En esta librería target es el address/MAC
                info: 'Bluetooth',
                isNative: true
            }));
        } catch (error) {
            console.error('[PRINT] Error buscando impresoras:', error);
            return [];
        }
    }

    /**
     * Imprime un recibo usando la librería moderna.
     */
    async printReceipt(printerAddress: string, receipt: ReceiptData): Promise<void> {
        if (!EscPosPrinter) {
            throw new Error('El motor de impresión nativa no está disponible en este entorno.');
        }

        try {
            console.log('[PRINT] Iniciando conexión a:', printerAddress);
            
            // Inicializar la impresora
            await EscPosPrinter.init({
                type: 'Bluetooth',
                target: printerAddress,
            });

            const printer = new EscPosPrinter.EscPosPrinter();

            // Formateador simple
            const fmt = (n: number) => n.toLocaleString('es-NI', { 
                minimumFractionDigits: 2, 
                maximumFractionDigits: 2 
            }).replace(/\xA0/g, ' ');

            // Generar el ticket con comandos ESC/POS puros
            await printer
                .setAlignment('center')
                .setBold(true)
                .line('CREDINIC')
                .setBold(false)
                .line('ESTADO DE CUENTA / RECIBO')
                .line('COPIA: CLIENTE')
                .line('------------------------------------------')
                .setAlignment('left')
                .line(`No. Recibo:  ${receipt.transactionNumber}`)
                .line(`No. Credito: ${receipt.creditNumber}`)
                .line(`Fecha Pago:  ${receipt.paymentDate}`)
                .line('------------------------------------------')
                .line('CLIENTE:')
                .setBold(true)
                .line(receipt.clientName.toUpperCase())
                .setBold(false)
                .line(`CÓDIGO: ${receipt.clientCode}`)
                .line('------------------------------------------')
                .line(`Cuota Día:    C$ ${fmt(receipt.cuotaDelDia)}`)
                .line(`Mora/Atraso:  C$ ${fmt(receipt.montoAtrasado)}`)
                .line(`Días Mora:    ${receipt.diasMora}`)
                .setBold(true)
                .line(`TOTAL EXIGIBLE: C$ ${fmt(receipt.totalAPagar)}`)
                .setBold(false)
                .line('------------------------------------------')
                .setAlignment('center')
                .setBold(true)
                .line('TOTAL RECIBIDO')
                .line(`C$ ${fmt(receipt.amountPaid)}`)
                .setBold(false)
                .line('')
                .line('CONCEPTO: ABONO DE CREDITO')
                .line('------------------------------------------')
                .setAlignment('left')
                .line(`Saldo Anterior: C$ ${fmt(receipt.saldoAnterior)}`)
                .setBold(true)
                .line(`Nuevo Saldo:    C$ ${fmt(receipt.nuevoSaldo)}`)
                .setBold(false)
                .line('------------------------------------------')
                .setAlignment('center')
                .line('¡GRACIAS POR SU PAGO!')
                .line('PROHIBIDO EL PAGO SIN RECIBO')
                .setBold(true)
                .line('CONSERVE ESTE DOCUMENTO')
                .setBold(false)
                .feed(3)
                .line('__________________________')
                .line(receipt.sucursal.toUpperCase())
                .line(receipt.managedBy.toUpperCase())
                .line(receipt.role.toUpperCase())
                .feed(3)
                .cut()
                .print();

            console.log('[PRINT] Recibo enviado con éxito.');

        } catch (error) {
            console.error('[PRINT] Error en impresión nativa:', error);
            throw new Error('No se pudo imprimir. Verifica la conexión con la impresora PT-210.');
        }
    }
}

export const thermalPrinterService = new ThermalPrinterService();
