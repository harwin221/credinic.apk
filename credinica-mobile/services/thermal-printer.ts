import { ReceiptData } from '../components/ReceiptModal';
import { Platform, PermissionsAndroid, Alert, Linking } from 'react-native';

// Importar la nueva librería
import { BLEPrinter } from 'react-native-thermal-receipt-printer';

class ThermalPrinterService {
    private initialized = false;
    /**
     * Inicializa la impresora BLE y solicita permisos si es necesario
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
                        "Para conectar la impresora, activa el permiso de 'Dispositivos Cercanos'.",
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
     * Inicializa la librería BLE
     */
    async initPrinter(): Promise<void> {
        if (this.initialized) return;
        const hasPermissions = await this.requestBluetoothPermissions();
        if (!hasPermissions) throw new Error('Permisos de Bluetooth no concedidos');
        
        await BLEPrinter.init();
        this.initialized = true;
        console.log('[PRINT] BLE Printer initialized');
    }

    /**
     * Obtiene la lista de impresoras BLE disponibles
     */
    async findPrinters(): Promise<any[]> {
        await this.initPrinter();
        
        try {
            console.log('[PRINT] Buscando impresoras BLE...');
            const devices = await BLEPrinter.getDeviceList();
            
            return devices.map((d: any) => ({
                name: d.device_name || 'Impresora BT',
                address: d.inner_mac_address, // Usar inner_mac_address
                info: 'BLE',
                isNative: true
            }));
        } catch (error) {
            console.error('[PRINT] Error listando impresoras:', error);
            return [];
        }
    }

    /**
     * Imprime un recibo usando BLE
     */
    async printReceipt(printerAddress: string, receipt: ReceiptData): Promise<void> {
        await this.initPrinter();

        try {
            console.log('[PRINT] Conectando a:', printerAddress);
            await BLEPrinter.connectPrinter(printerAddress);

            const fmt = (n: number) => n.toLocaleString('es-NI', { 
                minimumFractionDigits: 2, 
                maximumFractionDigits: 2 
            }).replace(/\xA0/g, ' ');

            // Formatear el recibo como texto plano alineado
            const center = (text: string, width = 32) => {
                const spaces = Math.max(0, width - text.length);
                const left = Math.floor(spaces / 2);
                const right = spaces - left;
                return ' '.repeat(left) + text + ' '.repeat(right);
            };

            const leftRight = (left: string, right: string, width = 32) => {
                const total = left + right;
                if (total.length >= width) return left + ' ' + right;
                const spaces = width - total.length;
                return left + ' '.repeat(spaces) + right;
            };

            let receiptText = center('CREDINIC') + '\n';
            receiptText += center('ESTADO DE CUENTA / RECIBO') + '\n';
            receiptText += center('COPIA: CLIENTE') + '\n';
            receiptText += '--------------------------------\n';
            receiptText += leftRight('No. Recibo:', receipt.transactionNumber) + '\n';
            receiptText += leftRight('No. Credito:', receipt.creditNumber) + '\n';
            receiptText += leftRight('Fecha Pago:', receipt.paymentDate) + '\n';
            receiptText += '--------------------------------\n';
            receiptText += 'CLIENTE:\n';
            receiptText += receipt.clientName.toUpperCase() + '\n';
            receiptText += leftRight('CODIGO:', receipt.clientCode) + '\n';
            receiptText += '--------------------------------\n';
            receiptText += leftRight('Cuota del Dia:', 'C$ ' + fmt(receipt.cuotaDelDia)) + '\n';
            receiptText += leftRight('Mora / Atraso:', 'C$ ' + fmt(receipt.montoAtrasado)) + '\n';
            receiptText += leftRight('Dias Mora:', receipt.diasMora.toString()) + '\n';
            receiptText += '--------------------------------\n';
            receiptText += leftRight('Total a pagar:', 'C$ ' + fmt(receipt.totalAPagar)) + '\n';
            receiptText += '--------------------------------\n';
            receiptText += leftRight('Cancelacion Total:', 'C$ ' + fmt(receipt.montoCancelacion)) + '\n';
            receiptText += '--------------------------------\n';
            receiptText += center('MONTO RECIBIDO') + '\n';
            receiptText += center('C$ ' + fmt(receipt.amountPaid)) + '\n';
            receiptText += center('CONCEPTO: ABONO DE CREDITO') + '\n';
            receiptText += '--------------------------------\n';
            receiptText += leftRight('Saldo Anterior:', 'C$ ' + fmt(receipt.saldoAnterior)) + '\n';
            receiptText += leftRight('Nuevo Saldo:', 'C$ ' + fmt(receipt.nuevoSaldo)) + '\n';
            receiptText += '--------------------------------\n';
            receiptText += center('¡GRACIAS POR SU PAGO!') + '\n';
            receiptText += center('PROHIBIDO EL PAGO SIN RECIBO') + '\n';
            receiptText += center('CONSERVE ESTE DOCUMENTO') + '\n';
            receiptText += center('__________________________') + '\n';
            receiptText += center(receipt.sucursal.toUpperCase()) + '\n';
            receiptText += center(receipt.managedBy.toUpperCase()) + '\n';
            receiptText += center(receipt.role.toUpperCase());

            // Comando de corte para detener el papel
            receiptText += '\x1b\x69';

            await BLEPrinter.printText(receiptText);

            console.log('[PRINT] Impresión finalizada.');

        } catch (error: any) {
            console.error('[PRINT] Error de impresión:', error);
            throw new Error('Error de conexión con la impresora. Verifica que esté encendida y cerca.');
        }
    }
}

export const thermalPrinterService = new ThermalPrinterService();
