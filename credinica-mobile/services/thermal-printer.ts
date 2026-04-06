import { ReceiptData } from '../components/ReceiptModal';
import { Platform, PermissionsAndroid, Alert, Linking } from 'react-native';

// Importamos la librería moderna
let EscPosPrinter: any = null;
try {
    const printerLib = require('react-native-esc-pos-printer');
    EscPosPrinter = printerLib.default || printerLib;
} catch (e) {
    console.log('[PRINT] react-native-esc-pos-printer no disponible.');
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
                // EXPLICITO: Usar los nombres de permiso de Android 12
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
                        "Para imprimir, Android exige permiso de 'Dispositivos Cercanos'. Por favor, actívalo en ajustes.",
                        [
                            { text: "Abrir Ajustes", onPress: () => Linking.openSettings() },
                            { text: "Cancelar", style: "cancel" }
                        ]
                    );
                }
                return isOk;
            } else {
                // Versiones anteriores
                const granted = await PermissionsAndroid.requestMultiple([
                    'android.permission.BLUETOOTH_ADMIN' as any,
                    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
                ]);

                return granted[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION] === PermissionsAndroid.RESULTS.GRANTED;
            }
        } catch (error) {
            console.error('[PRINT] Permission Error:', error);
            return false;
        }
    }

    /**
     * Busca impresoras Bluetooth vinculadas.
     */
    async findPrinters(): Promise<any[]> {
        const hasPermissions = await this.requestBluetoothPermissions();
        if (!hasPermissions) return [];

        if (!EscPosPrinter || Platform.OS !== 'android') return [];

        try {
            console.log('[PRINT] Buscando dispositivos PT-210...');
            // IMPORTANTE: EscPosPrinter.discover busca dispositivos visibles/vinculados
            const devices = await EscPosPrinter.discover({ connectionType: 'Bluetooth' });
            
            if (devices.length === 0) {
                console.log('[PRINT] No se hallaron dispositivos por descubrimiento simple.');
            }

            return devices.map((d: any) => ({
                name: d.name || 'Impresora Térmica',
                address: d.target, // MAC Address
                info: 'Bluetooth',
                isNative: true
            }));
        } catch (error) {
            console.error('[PRINT] Discovery Error:', error);
            return [];
        }
    }

    /**
     * Imprime un recibo usando comandos ESC/POS optimizados para PT-210
     */
    async printReceipt(printerAddress: string, receipt: ReceiptData): Promise<void> {
        if (!EscPosPrinter) throw new Error('Driver de impresión no cargado');

        try {
            console.log('[PRINT] Conectando a:', printerAddress);
            
            await EscPosPrinter.init({
                type: 'Bluetooth',
                target: printerAddress,
            });

            const printer = new EscPosPrinter.EscPosPrinter();

            const fmt = (n: number) => n.toLocaleString('es-NI', { 
                minimumFractionDigits: 2, 
                maximumFractionDigits: 2 
            }).replace(/\xA0/g, ' ');

            // Generar el ticket optimizado para 58mm (32 chars)
            // Usamos .width(384) si la librería lo soporta, o simplemente texto alineado
            await printer
                .setAlignment('center')
                .setBold(true)
                .line('CREDINIC')
                .setBold(false)
                .line('RECIBO DE ABONO')
                .line('--------------------------------')
                .setAlignment('left')
                .line(`RECIBO:  ${receipt.transactionNumber}`)
                .line(`CREDITO: ${receipt.creditNumber}`)
                .line(`FECHA:   ${receipt.paymentDate}`)
                .line('--------------------------------')
                .line('CLIENTE:')
                .setBold(true)
                .line(receipt.clientName.substring(0, 31).toUpperCase()) // Truncar para 58mm
                .setBold(false)
                .line(`CODIGO:  ${receipt.clientCode}`)
                .line('--------------------------------')
                .line(`CUOTA DIA:    C$ ${fmt(receipt.cuotaDelDia)}`)
                .line(`MORA/ATRASO:  C$ ${fmt(receipt.montoAtrasado)}`)
                .setBold(true)
                .line(`EXIGIBLE:     C$ ${fmt(receipt.totalAPagar)}`)
                .setBold(false)
                .line('--------------------------------')
                .setAlignment('center')
                .setBold(true)
                .line('MONTO RECIBIDO')
                .line(`C$ ${fmt(receipt.amountPaid)}`)
                .setBold(false)
                .line('--------------------------------')
                .setAlignment('left')
                .line(`SALDO ANT:    C$ ${fmt(receipt.saldoAnterior)}`)
                .setBold(true)
                .line(`NUEVO SALDO:  C$ ${fmt(receipt.nuevoSaldo)}`)
                .setBold(false)
                .line('--------------------------------')
                .setAlignment('center')
                .line('GRACIAS POR SU PAGO')
                .line('CONSERVE ESTE DOCUMENTO')
                .feed(4)
                .line('__________________________')
                .line(receipt.managedBy.toUpperCase())
                .line('GESTOR DE COBRO')
                .feed(3)
                .cut()
                .print();

            console.log('[PRINT] Todo enviado.');

        } catch (error) {
            console.error('[PRINT] Internal Error:', error);
            throw new Error('Error al conectar con PT-210. Asegúrate de que esté encendida y vinculada.');
        }
    }
}

export const thermalPrinterService = new ThermalPrinterService();
