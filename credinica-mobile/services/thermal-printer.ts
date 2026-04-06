import { ReceiptData } from '../components/ReceiptModal';
import { Platform, PermissionsAndroid, DeviceEventEmitter } from 'react-native';

// Importamos la nueva librería nativa
let BluetoothManager: any = null;
let BluetoothEscposPrinter: any = null;

try {
    const printerLib = require('react-native-bluetooth-escpos-printer');
    BluetoothManager = printerLib.BluetoothManager;
    BluetoothEscposPrinter = printerLib.BluetoothEscposPrinter;
} catch (e) {
    console.log('[PRINT] react-native-bluetooth-escpos-printer no disponible (Expo Go).');
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
            
            if (apiLevel >= 31) {
                const granted = await PermissionsAndroid.requestMultiple([
                    PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
                    PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
                    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
                ]);

                return (
                    granted['android.permission.BLUETOOTH_SCAN'] === PermissionsAndroid.RESULTS.GRANTED &&
                    granted['android.permission.BLUETOOTH_CONNECT'] === PermissionsAndroid.RESULTS.GRANTED &&
                    granted['android.permission.ACCESS_FINE_LOCATION'] === PermissionsAndroid.RESULTS.GRANTED
                );
            } else {
                const BLUETOOTH = 'android.permission.BLUETOOTH' as any;
                const BLUETOOTH_ADMIN = 'android.permission.BLUETOOTH_ADMIN' as any;
                
                const granted = await PermissionsAndroid.requestMultiple([
                    BLUETOOTH,
                    BLUETOOTH_ADMIN,
                    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
                ]);

                return (
                    granted[BLUETOOTH] === PermissionsAndroid.RESULTS.GRANTED &&
                    granted['android.permission.ACCESS_FINE_LOCATION'] === PermissionsAndroid.RESULTS.GRANTED
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
        if (!hasPermissions) throw new Error('No se otorgaron permisos de Bluetooth.');

        if (!BluetoothManager) return [];

        try {
            const isEnabled = await BluetoothManager.isBluetoothEnabled();
            if (!isEnabled) await BluetoothManager.enableBluetooth();

            // Buscamos dispositivos emparejados previamente
            const pairedDevices = await BluetoothManager.getPairedDevices();
            const list = JSON.parse(pairedDevices);
            
            return list.map((d: any) => ({
                name: d.name || 'Impresora Bluetooth',
                address: d.address, // MAC Address
                info: 'Bluetooth',
                isNative: true
            }));
        } catch (error) {
            console.error('[PRINT] Error buscando impresoras:', error);
            return [];
        }
    }

    /**
     * Imprime un recibo usando la librería nativa.
     */
    async printReceipt(printerAddress: string, receipt: ReceiptData): Promise<void> {
        if (!BluetoothManager || !BluetoothEscposPrinter) {
            throw new Error('El motor de impresión nativa no está listo.');
        }

        try {
            console.log('[PRINT] Conectando a:', printerAddress);
            await BluetoothManager.connect(printerAddress);
            console.log('[PRINT] Conectado. Enviando comandos ESC/POS...');

            const printer = BluetoothEscposPrinter;

            // Formateador simple para moneda
            const fmt = (n: number) => n.toLocaleString('es-NI', { 
                minimumFractionDigits: 2, 
                maximumFractionDigits: 2 
            }).replace(/\xA0/g, ' '); // Limpiar espacios de no-rompimiento

            // COMIENZA IMPRESIÓN DIRECTA
            await printer.printerInit();
            await printer.printerAlign(BluetoothEscposPrinter.ALIGN.CENTER);
            await printer.setItalic(false);
            await printer.printText("CREDINIC\n\r", {
                encoding: 'GBK',
                codepage: 0,
                widthtimes: 1,
                heigthtimes: 1,
                fonttype: 1
            });
            await printer.printText("ESTADO DE CUENTA / RECIBO\n\r", {});
            await printer.printText("COPIA: CLIENTE\n\r", {});
            await printer.printText("--------------------------------\n\r", {});
            
            await printer.printerAlign(BluetoothEscposPrinter.ALIGN.LEFT);
            await printer.printText(`No. Recibo:  ${receipt.transactionNumber}\n\r`, {});
            await printer.printText(`No. Credito: ${receipt.creditNumber}\n\r`, {});
            await printer.printText(`Fecha Pago:  ${receipt.paymentDate}\n\r`, {});
            await printer.printText("--------------------------------\n\r", {});
            
            await printer.printText("CLIENTE:\n\r", {});
            await printer.printText(`${receipt.clientName.toUpperCase()}\n\r`, {
                fonttype: 1
            });
            await printer.printText(`CÓDIGO: ${receipt.clientCode}\n\r`, {});
            await printer.printText("--------------------------------\n\r", {});
            
            await printer.printText(`Cuota Dia:    C$ ${fmt(receipt.cuotaDelDia)}\n\r`, {});
            await printer.printText(`Mora/Atraso:  C$ ${fmt(receipt.montoAtrasado)}\n\r`, {});
            await printer.printText(`Dias Mora:    ${receipt.diasMora}\n\r`, {});
            await printer.printText("--------------------------------\n\r", { fonttype: 1 });
            await printer.printText(`TOTAL EXIGIBLE: C$ ${fmt(receipt.totalAPagar)}\n\r`, { fonttype: 1 });
            await printer.printText("--------------------------------\n\r", {});
            
            await printer.printerAlign(BluetoothEscposPrinter.ALIGN.CENTER);
            await printer.printText("TOTAL RECIBIDO\n\r", { widthtimes: 1 });
            await printer.printText(`C$ ${fmt(receipt.amountPaid)}\n\r`, { widthtimes: 1, heigthtimes: 1 });
            await printer.printText("\n\r", {});
            await printer.printText("CONCEPTO: ABONO DE CREDITO\n\r", {});
            await printer.printText("--------------------------------\n\r", {});
            
            await printer.printerAlign(BluetoothEscposPrinter.ALIGN.LEFT);
            await printer.printText(`Saldo Anterior: C$ ${fmt(receipt.saldoAnterior)}\n\r`, {});
            await printer.printText(`Nuevo Saldo:    C$ ${fmt(receipt.nuevoSaldo)}\n\r`, { fonttype: 1 });
            await printer.printText("--------------------------------\n\r", {});
            
            await printer.printerAlign(BluetoothEscposPrinter.ALIGN.CENTER);
            await printer.printText("¡GRACIAS POR SU PAGO!\n\r", {});
            await printer.printText("PROHIBIDO EL PAGO SIN RECIBO\n\r", {});
            await printer.printText("CONSERVE ESTE DOCUMENTO\n\r", { fonttype: 1 });
            
            await printer.printText("\n\r\n\r", {});
            await printer.printText("__________________________\n\r", {});
            await printer.printText(`${receipt.sucursal.toUpperCase()}\n\r`, {});
            await printer.printText(`${receipt.managedBy.toUpperCase()}\n\r`, {});
            await printer.printText(`${receipt.role.toUpperCase()}\n\r`, {});
            
            await printer.printText("\n\r\n\r\n\r", {});
            console.log('[PRINT] Comandos enviados.');

        } catch (error) {
            console.error('[PRINT] Fallo en impresión:', error);
            throw new Error('Error al conectar o imprimir. Verifica que la impresora esté encendida.');
        }
    }
}

export const thermalPrinterService = new ThermalPrinterService();
