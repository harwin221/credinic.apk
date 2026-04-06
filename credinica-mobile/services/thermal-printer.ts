import { ReceiptData } from '../components/ReceiptModal';
import { Platform, PermissionsAndroid, Alert, Linking } from 'react-native';

// Cargamos la librería que soporta dispositivos vinculados directamente
let BluetoothManager: any = null;
let BluetoothEscposPrinter: any = null;

try {
    const lib = require('react-native-bluetooth-escpos-printer');
    BluetoothManager = lib.BluetoothManager;
    BluetoothEscposPrinter = lib.BluetoothEscposPrinter;
} catch (e) {
    console.log('[PRINT] react-native-bluetooth-escpos-printer no disponible.');
}

class ThermalPrinterService {
    /**
     * Solicita permisos de Bluetooth agresivamente (Android 12+)
     */
    async requestBluetoothPermissions(): Promise<boolean> {
        if (Platform.OS !== 'android') return true;

        try {
            const apiLevel = Platform.Version;
            
            if (typeof apiLevel === 'number' && apiLevel >= 31) {
                const granted = await PermissionsAndroid.requestMultiple([
                    'android.permission.BLUETOOTH_SCAN' as any,
                    'android.permission.BLUETOOTH_CONNECT' as any,
                    'android.permission.ACCESS_FINE_LOCATION' as any,
                ]);

                const isOk = (
                    (granted as any)['android.permission.BLUETOOTH_SCAN'] === PermissionsAndroid.RESULTS.GRANTED &&
                    (granted as any)['android.permission.BLUETOOTH_CONNECT'] === PermissionsAndroid.RESULTS.GRANTED
                );

                if (!isOk) {
                    Alert.alert(
                        "Permisos Necesarios",
                        "Para conectar la PT-210, activa el permiso de 'Dispositivos Cercanos'.",
                        [{ text: "Abrir Ajustes", onPress: () => Linking.openSettings() }, { text: "OK" }]
                    );
                }
                return isOk;
            } else {
                const granted = await PermissionsAndroid.requestMultiple([
                    'android.permission.BLUETOOTH_ADMIN' as any,
                    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
                ]);
                return (granted as any)[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION] === PermissionsAndroid.RESULTS.GRANTED;
            }
        } catch (error) {
            console.error('[PRINT] Permission Error:', error);
            return false;
        }
    }

    /**
     * Obtiene SOLO los dispositivos que el usuario ya vinculó en los ajustes del teléfono.
     */
    async findPrinters(): Promise<any[]> {
        const hasPermissions = await this.requestBluetoothPermissions();
        if (!hasPermissions || !BluetoothManager) return [];

        try {
            console.log('[PRINT] Obteniendo dispositivos vinculados...');
            // Esta función devuelve lo que ya está en el sistema
            const bondedJson = await BluetoothManager.pairedDevices();
            const devices = JSON.parse(bondedJson);
            
            return devices.map((d: any) => ({
                name: d.name || 'Dispositivo BT',
                address: d.address, // MAC Address
                info: 'Vinculado',
                isNative: true
            }));
        } catch (error) {
            console.error('[PRINT] Error listando vinculados:', error);
            return [];
        }
    }

    /**
     * Imprime un recibo usando la conexión directa por MAC Address.
     */
    async printReceipt(printerAddress: string, receipt: ReceiptData): Promise<void> {
        if (!BluetoothManager || !BluetoothEscposPrinter) throw new Error('Motor de impresión no disponible.');

        try {
            console.log('[PRINT] Conectando a:', printerAddress);
            await BluetoothManager.connect(printerAddress);

            const fmt = (n: number) => n.toLocaleString('es-NI', { 
                minimumFractionDigits: 2, 
                maximumFractionDigits: 2 
            }).replace(/\xA0/g, ' ');

            // Comandos ESC/POS directos
            await BluetoothEscposPrinter.printerAlign(BluetoothEscposPrinter.ALIGN.CENTER);
            await BluetoothEscposPrinter.setBlob(1);
            await BluetoothEscposPrinter.printText("CREDINIC\n", { encoding: 'GBK', codepage: 0, widthtimes: 1, heigthtimes: 1, fonttype: 0 });
            await BluetoothEscposPrinter.setBlob(0);
            await BluetoothEscposPrinter.printText("RECIBO DE ABONO\n", {});
            await BluetoothEscposPrinter.printText("--------------------------------\n", {});
            
            await BluetoothEscposPrinter.printerAlign(BluetoothEscposPrinter.ALIGN.LEFT);
            await BluetoothEscposPrinter.printText(`RECIBO:  ${receipt.transactionNumber}\n`, {});
            await BluetoothEscposPrinter.printText(`CREDITO: ${receipt.creditNumber}\n`, {});
            await BluetoothEscposPrinter.printText(`FECHA:   ${receipt.paymentDate}\n`, {});
            await BluetoothEscposPrinter.printText("--------------------------------\n", {});
            
            await BluetoothEscposPrinter.printText("CLIENTE:\n", {});
            await BluetoothEscposPrinter.setBlob(1);
            await BluetoothEscposPrinter.printText(`${receipt.clientName.toUpperCase()}\n`, {});
            await BluetoothEscposPrinter.setBlob(0);
            await BluetoothEscposPrinter.printText(`CODIGO:  ${receipt.clientCode}\n`, {});
            await BluetoothEscposPrinter.printText("--------------------------------\n", {});
            
            await BluetoothEscposPrinter.printText(`CUOTA DIA:    C$ ${fmt(receipt.cuotaDelDia)}\n`, {});
            await BluetoothEscposPrinter.printText(`MORA/ATRASO:  C$ ${fmt(receipt.montoAtrasado)}\n`, {});
            await BluetoothEscposPrinter.setBlob(1);
            await BluetoothEscposPrinter.printText(`EXIGIBLE:     C$ ${fmt(receipt.totalAPagar)}\n`, {});
            await BluetoothEscposPrinter.setBlob(0);
            await BluetoothEscposPrinter.printText("--------------------------------\n", {});
            
            await BluetoothEscposPrinter.printerAlign(BluetoothEscposPrinter.ALIGN.CENTER);
            await BluetoothEscposPrinter.setBlob(1);
            await BluetoothEscposPrinter.printText("MONTO RECIBIDO\n", {});
            await BluetoothEscposPrinter.printText(`C$ ${fmt(receipt.amountPaid)}\n`, {});
            await BluetoothEscposPrinter.setBlob(0);
            await BluetoothEscposPrinter.printText("--------------------------------\n", {});
            
            await BluetoothEscposPrinter.printerAlign(BluetoothEscposPrinter.ALIGN.LEFT);
            await BluetoothEscposPrinter.printText(`SALDO ANT:    C$ ${fmt(receipt.saldoAnterior)}\n`, {});
            await BluetoothEscposPrinter.setBlob(1);
            await BluetoothEscposPrinter.printText(`NUEVO SALDO:  C$ ${fmt(receipt.nuevoSaldo)}\n`, {});
            await BluetoothEscposPrinter.setBlob(0);
            await BluetoothEscposPrinter.printText("--------------------------------\n", {});
            
            await BluetoothEscposPrinter.printerAlign(BluetoothEscposPrinter.ALIGN.CENTER);
            await BluetoothEscposPrinter.printText("¡GRACIAS POR SU PAGO!\n", {});
            await BluetoothEscposPrinter.printText("CONSERVE ESTE DOCUMENTO\n", {});
            await BluetoothEscposPrinter.printText("\n\n\n", {});
            await BluetoothEscposPrinter.printText("__________________________\n", {});
            await BluetoothEscposPrinter.printText(`${receipt.managedBy.toUpperCase()}\n`, {});
            await BluetoothEscposPrinter.printText("GESTOR DE COBRO\n", {});
            await BluetoothEscposPrinter.printText("\n\n\n\n", {});

            console.log('[PRINT] Impresión finalizada.');

        } catch (error: any) {
            console.error('[PRINT] Connect Error:', error);
            throw new Error('Error de conexión con la impresora. Verifica que esté encendida y vinculada.');
        }
    }
}

export const thermalPrinterService = new ThermalPrinterService();
