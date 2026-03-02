/**
 * Servicio de impresión Bluetooth para impresoras térmicas ESC/POS
 * Compatible con impresoras de 58mm como PT-210
 */

// Comandos ESC/POS
const ESC = '\x1B';
const GS = '\x1D';

const Commands = {
  INIT: ESC + '@',
  ALIGN_LEFT: ESC + 'a' + '\x00',
  ALIGN_CENTER: ESC + 'a' + '\x01',
  ALIGN_RIGHT: ESC + 'a' + '\x02',
  BOLD_ON: ESC + 'E' + '\x01',
  BOLD_OFF: ESC + 'E' + '\x00',
  UNDERLINE_ON: ESC + '-' + '\x01',
  UNDERLINE_OFF: ESC + '-' + '\x00',
  FONT_SMALL: ESC + 'M' + '\x01',
  FONT_NORMAL: ESC + 'M' + '\x00',
  LINE_FEED: '\n',
  CUT_PAPER: GS + 'V' + '\x41' + '\x03',
  DOUBLE_HEIGHT_ON: ESC + '!' + '\x10',
  DOUBLE_HEIGHT_OFF: ESC + '!' + '\x00',
};

class BluetoothPrinterService {
  private device: BluetoothDevice | null = null;
  private characteristic: BluetoothRemoteGATTCharacteristic | null = null;
  private encoder = new TextEncoder();

  /**
   * Verifica si el navegador soporta Web Bluetooth
   */
  isSupported(): boolean {
    return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
  }

  /**
   * Conecta a una impresora Bluetooth
   */
  async connect(): Promise<boolean> {
    if (!this.isSupported()) {
      throw new Error('Web Bluetooth no está soportado en este navegador');
    }

    try {
      // Solicitar dispositivo Bluetooth
      this.device = await navigator.bluetooth.requestDevice({
        filters: [
          { services: ['000018f0-0000-1000-8000-00805f9b34fb'] }, // Servicio común de impresoras
        ],
        optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb']
      });

      if (!this.device.gatt) {
        throw new Error('GATT no disponible');
      }

      // Conectar al servidor GATT
      const server = await this.device.gatt.connect();
      
      // Obtener el servicio
      const service = await server.getPrimaryService('000018f0-0000-1000-8000-00805f9b34fb');
      
      // Obtener la característica de escritura
      this.characteristic = await service.getCharacteristic('00002af1-0000-1000-8000-00805f9b34fb');

      // Guardar el ID del dispositivo para reconexión
      if (this.device.id) {
        localStorage.setItem('bluetooth_printer_id', this.device.id);
      }

      console.log('✅ Impresora Bluetooth conectada:', this.device.name);
      return true;
    } catch (error) {
      console.error('❌ Error al conectar impresora Bluetooth:', error);
      throw error;
    }
  }

  /**
   * Desconecta la impresora
   */
  async disconnect(): Promise<void> {
    if (this.device?.gatt?.connected) {
      await this.device.gatt.disconnect();
    }
    this.device = null;
    this.characteristic = null;
    localStorage.removeItem('bluetooth_printer_id');
    console.log('🔌 Impresora Bluetooth desconectada');
  }

  /**
   * Verifica si hay una impresora conectada
   */
  isConnected(): boolean {
    return this.device?.gatt?.connected ?? false;
  }

  /**
   * Envía datos a la impresora
   */
  private async write(data: string): Promise<void> {
    if (!this.characteristic) {
      throw new Error('No hay impresora conectada');
    }

    const bytes = this.encoder.encode(data);
    
    // Dividir en chunks de 512 bytes (límite de Bluetooth)
    const chunkSize = 512;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.slice(i, i + chunkSize);
      await this.characteristic.writeValue(chunk);
      // Pequeña pausa entre chunks
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }

  /**
   * Imprime texto
   */
  private async printText(text: string): Promise<void> {
    await this.write(text + Commands.LINE_FEED);
  }

  /**
   * Imprime una línea separadora
   */
  private async printSeparator(): Promise<void> {
    await this.write('--------------------------------' + Commands.LINE_FEED);
  }

  /**
   * Imprime un recibo de pago
   */
  async printReceipt(receiptData: {
    companyName: string;
    receiptNumber: string;
    creditNumber: string;
    date: string;
    clientName: string;
    clientCode: string;
    cuotaDelDia: string;
    montoAtrasado: string;
    diasMora: string;
    totalAPagar: string;
    montoCancelacion: string;
    totalCobrado: string;
    saldoAnterior: string;
    nuevoSaldo: string;
    branch: string;
    collector: string;
    role: string;
    isReprint?: boolean;
    isOffline?: boolean;
  }): Promise<void> {
    if (!this.isConnected()) {
      throw new Error('Impresora no conectada. Por favor, conecte la impresora primero.');
    }

    try {
      // Inicializar impresora
      await this.write(Commands.INIT);

      // Encabezado - Nombre de la empresa (centrado, negrita)
      await this.write(Commands.ALIGN_CENTER);
      await this.write(Commands.BOLD_ON);
      await this.write(Commands.DOUBLE_HEIGHT_ON);
      await this.printText('CREDINIC');
      await this.write(Commands.DOUBLE_HEIGHT_OFF);
      await this.write(Commands.BOLD_OFF);

      // Subtítulo
      await this.write(Commands.FONT_SMALL);
      await this.printText('COPIA: CLIENTE');
      await this.write(Commands.FONT_NORMAL);

      await this.write(Commands.ALIGN_LEFT);
      await this.printSeparator();

      // Indicadores especiales
      if (receiptData.isReprint) {
        await this.write(Commands.ALIGN_CENTER);
        await this.write(Commands.BOLD_ON);
        await this.printText('*** REIMPRESION ***');
        await this.write(Commands.BOLD_OFF);
        await this.write(Commands.ALIGN_LEFT);
      }
      if (receiptData.isOffline) {
        await this.write(Commands.ALIGN_CENTER);
        await this.write(Commands.BOLD_ON);
        await this.printText('*** MODO OFFLINE ***');
        await this.write(Commands.BOLD_OFF);
        await this.write(Commands.ALIGN_LEFT);
      }

      // Información del recibo
      await this.printText(`Recibo: ${receiptData.receiptNumber}`);
      await this.printText(`Credito: ${receiptData.creditNumber}`);
      await this.printText(`Fecha/Hora: ${receiptData.date}`);
      await this.printSeparator();

      // Información del cliente
      await this.write(Commands.FONT_SMALL);
      await this.printText('Cliente:');
      await this.write(Commands.FONT_NORMAL);
      await this.write(Commands.BOLD_ON);
      await this.printText(receiptData.clientName);
      await this.write(Commands.BOLD_OFF);
      await this.write(Commands.FONT_SMALL);
      await this.printText(receiptData.clientCode);
      await this.write(Commands.FONT_NORMAL);
      await this.printSeparator();

      // Detalles del pago
      await this.printText(`Cuota del dia:      ${receiptData.cuotaDelDia}`);
      await this.printText(`Monto atrasado:     ${receiptData.montoAtrasado}`);
      await this.printText(`Dias mora:          ${receiptData.diasMora}`);
      await this.write(Commands.BOLD_ON);
      await this.printText(`Total a pagar:      ${receiptData.totalAPagar}`);
      await this.write(Commands.BOLD_OFF);
      await this.printSeparator();

      // Monto de cancelación
      await this.printText(`Monto de cancelacion:`);
      await this.printText(`                    ${receiptData.montoCancelacion}`);
      
      // Total cobrado (destacado con líneas)
      await this.printText('--------------------------------');
      await this.write(Commands.BOLD_ON);
      await this.printText(`TOTAL COBRADO:      ${receiptData.totalCobrado}`);
      await this.write(Commands.BOLD_OFF);
      await this.printText('--------------------------------');

      // Concepto
      await this.write(Commands.ALIGN_CENTER);
      await this.write(Commands.FONT_SMALL);
      await this.printText('Concepto: ABONO DE CREDITO');
      await this.write(Commands.FONT_NORMAL);
      await this.write(Commands.ALIGN_LEFT);
      await this.printText('');

      // Saldos
      await this.printText(`Saldo anterior:     ${receiptData.saldoAnterior}`);
      await this.write(Commands.BOLD_ON);
      await this.printText(`Nuevo saldo:        ${receiptData.nuevoSaldo}`);
      await this.write(Commands.BOLD_OFF);
      await this.printSeparator();

      // Mensaje de agradecimiento
      await this.write(Commands.ALIGN_CENTER);
      await this.write(Commands.FONT_SMALL);
      await this.printText('Gracias por su pago.');
      await this.printText('CONSERVE ESTE RECIBO');
      await this.write(Commands.FONT_NORMAL);
      await this.printText('');

      // Firma - Sucursal
      await this.write(Commands.BOLD_ON);
      await this.printText('_______________________________');
      await this.printText(receiptData.branch);
      await this.write(Commands.BOLD_OFF);
      await this.printText('');
      
      // Cobrador y rol
      await this.write(Commands.FONT_SMALL);
      await this.write(Commands.BOLD_ON);
      await this.printText(receiptData.collector);
      await this.write(Commands.BOLD_OFF);
      await this.printText(receiptData.role);
      await this.write(Commands.FONT_NORMAL);

      // Espacios y corte
      await this.printText('');
      await this.printText('');
      await this.printText('');
      await this.write(Commands.CUT_PAPER);

      console.log('✅ Recibo impreso exitosamente');
    } catch (error) {
      console.error('❌ Error al imprimir recibo:', error);
      throw error;
    }
  }

  /**
   * Imprime un recibo de prueba
   */
  async printTestReceipt(): Promise<void> {
    await this.printReceipt({
      companyName: 'CREDINIC',
      receiptNumber: 'TEST-001',
      creditNumber: 'CRE-0000',
      date: new Date().toLocaleString('es-NI'),
      clientName: 'CLIENTE DE PRUEBA',
      clientCode: 'CLI-0000',
      cuotaDelDia: 'C$1,000.00',
      montoAtrasado: 'C$500.00',
      diasMora: '5',
      totalAPagar: 'C$1,500.00',
      montoCancelacion: 'C$10,000.00',
      totalCobrado: 'C$1,500.00',
      saldoAnterior: 'C$10,000.00',
      nuevoSaldo: 'C$8,500.00',
      branch: 'SUCURSAL LEON',
      collector: 'SISTEMA',
      role: 'GESTOR DE COBRO',
    });
  }
}

// Exportar instancia única (singleton)
export const bluetoothPrinter = new BluetoothPrinterService();
