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

            // Formatear el recibo con tags
            let receiptText = '<C>CREDINIC\n</C>';
            receiptText += '<C>RECIBO DE ABONO\n</C>';
            receiptText += '--------------------------------\n';
            receiptText += `RECIBO:  ${receipt.transactionNumber}\n`;
            receiptText += `CREDITO: ${receipt.creditNumber}\n`;
            receiptText += `FECHA:   ${receipt.paymentDate}\n`;
            receiptText += '--------------------------------\n';
            receiptText += 'CLIENTE:\n';
            receiptText += `<B>${receipt.clientName.toUpperCase()}\n</B>`;
            receiptText += `CODIGO:  ${receipt.clientCode}\n`;
            receiptText += '--------------------------------\n';
            receiptText += `CUOTA DIA:    C$ ${fmt(receipt.cuotaDelDia)}\n`;
            receiptText += `MORA/ATRASO:  C$ ${fmt(receipt.montoAtrasado)}\n`;
            receiptText += `<B>EXIGIBLE:     C$ ${fmt(receipt.totalAPagar)}\n</B>`;
            receiptText += '--------------------------------\n';
            receiptText += '<C><B>MONTO RECIBIDO\n</B></C>';
            receiptText += `<C>C$ ${fmt(receipt.amountPaid)}\n</C>`;
            receiptText += '--------------------------------\n';
            receiptText += `SALDO ANT:    C$ ${fmt(receipt.saldoAnterior)}\n`;
            receiptText += `<B>NUEVO SALDO:  C$ ${fmt(receipt.nuevoSaldo)}\n</B>`;
            receiptText += '--------------------------------\n';
            receiptText += '<C>¡GRACIAS POR SU PAGO!\n</C>';
            receiptText += '<C>CONSERVE ESTE DOCUMENTO\n</C>';
            receiptText += '\n\n\n';
            receiptText += '__________________________\n';
            receiptText += `${receipt.managedBy.toUpperCase()}\n`;
            receiptText += 'GESTOR DE COBRO\n';
            receiptText += '\n\n\n\n';

            await BLEPrinter.printText(receiptText);

            console.log('[PRINT] Impresión finalizada.');

        } catch (error: any) {
            console.error('[PRINT] Error de impresión:', error);
            throw new Error('Error de conexión con la impresora. Verifica que esté encendida y cerca.');
        }
    }
}

export const thermalPrinterService = new ThermalPrinterService();
