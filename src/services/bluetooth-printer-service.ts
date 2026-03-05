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
  DOUBLE_WIDTH_ON: ESC + '!' + '\x20',
  DOUBLE_WIDTH_OFF: ESC + '!' + '\x00',
  DOUBLE_SIZE_ON: ESC + '!' + '\x30',
  DOUBLE_SIZE_OFF: ESC + '!' + '\x00',
  REVERSE_ON: GS + 'B' + '\x01',
  REVERSE_OFF: GS + 'B' + '\x00',
};

class BluetoothPrinterService {
  private device: any = null;
  private characteristic: any = null;
  private encoder = new TextEncoder();

  /**
   * Verifica si el navegador soporta Web Bluetooth
   */
  isSupported(): boolean {
    return typeof navigator !== 'undefined' && (navigator as any).bluetooth;
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
      this.device = await (navigator as any).bluetooth.requestDevice({
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
   * Imprime un recibo de pago con formato PREMIUM para 58mm
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
      const lineLen = 32; // Ancho para 58mm

      const formatRow = (label: string, value: string) => {
        const spaces = lineLen - label.length - value.length;
        return label + (spaces > 0 ? ' '.repeat(spaces) : ' ') + value;
      };

      const sanitize = (text: string = '') => {
        return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
      };

      // Inicializar impresora
      await this.write(Commands.INIT);

      // Encabezado - CREDINIC (Grande y Centrado)
      await this.write(Commands.ALIGN_CENTER);
      await this.write(Commands.DOUBLE_SIZE_ON);
      await this.printText('CREDINIC');
      await this.write(Commands.DOUBLE_SIZE_OFF);

      // Subtítulo
      await this.write(Commands.FONT_SMALL);
      await this.printText('COPIA: CLIENTE');
      await this.write(Commands.FONT_NORMAL);
      await this.printText('');

      // Indicadores especiales
      if (receiptData.isReprint) {
        await this.write(Commands.BOLD_ON);
        await this.printText('*** REIMPRESION ***');
        await this.write(Commands.BOLD_OFF);
      }
      if (receiptData.isOffline) {
        await this.write(Commands.BOLD_ON);
        await this.printText('*** MODO OFFLINE ***');
        await this.write(Commands.BOLD_OFF);
      }

      // Información del recibo
      await this.write(Commands.ALIGN_LEFT);
      await this.write(Commands.FONT_SMALL);
      await this.printText(formatRow('Recibo:', receiptData.receiptNumber));
      await this.printText(formatRow('Credito:', receiptData.creditNumber));
      await this.printText(formatRow('Fecha:', receiptData.date));
      await this.write(Commands.FONT_NORMAL);
      await this.printText('--------------------------------');

      // Información del cliente
      await this.write(Commands.FONT_SMALL);
      await this.printText('CLIENTE:');
      await this.write(Commands.FONT_NORMAL);
      await this.write(Commands.BOLD_ON);
      await this.printText(sanitize(receiptData.clientName));
      await this.write(Commands.BOLD_OFF);
      await this.write(Commands.FONT_SMALL);
      await this.printText(`CODIGO: ${sanitize(receiptData.clientCode)}`);
      await this.write(Commands.FONT_NORMAL);
      await this.printText('--------------------------------');

      // Detalles financieros
      await this.printText(formatRow('Cuota del dia:', receiptData.cuotaDelDia));
      await this.printText(formatRow('Monto atrasado:', receiptData.montoAtrasado));
      await this.printText(formatRow('Dias mora:', receiptData.diasMora));

      await this.printText('');
      await this.write(Commands.BOLD_ON);
      await this.printText(formatRow('TOTAL A PAGAR:', receiptData.totalAPagar));
      await this.write(Commands.BOLD_OFF);
      await this.printText('--------------------------------');

      // Monto de cancelación
      await this.write(Commands.FONT_SMALL);
      await this.printText(formatRow('MONTO CANCELACION:', receiptData.montoCancelacion));
      await this.write(Commands.FONT_NORMAL);
      await this.printText('');

      // BOX: TOTAL COBRADO (REVERSE PRINTING logic)
      await this.write(Commands.ALIGN_CENTER);
      await this.printText('--------------------------------');
      await this.write(Commands.REVERSE_ON);
      await this.write(Commands.BOLD_ON);
      await this.printText('       TOTAL COBRADO        ');
      await this.write(Commands.DOUBLE_SIZE_ON);
      await this.printText(` ${receiptData.totalCobrado} `);
      await this.write(Commands.DOUBLE_SIZE_OFF);
      await this.write(Commands.BOLD_OFF);
      await this.write(Commands.REVERSE_OFF);
      await this.printText('--------------------------------');
      await this.printText('');

      // Concepto
      await this.write(Commands.FONT_SMALL);
      await this.printText('CONCEPTO: ABONO DE CREDITO');
      await this.write(Commands.FONT_NORMAL);
      await this.printText('');

      // Saldos bloque final
      await this.write(Commands.ALIGN_LEFT);
      await this.printText(formatRow('Saldo anterior:', receiptData.saldoAnterior));
      await this.write(Commands.BOLD_ON);
      await this.printText(formatRow('NUEVO SALDO:', receiptData.nuevoSaldo));
      await this.write(Commands.BOLD_OFF);
      await this.printText('--------------------------------');

      // Pie de página
      await this.write(Commands.ALIGN_CENTER);
      await this.write(Commands.FONT_SMALL);
      await this.printText('¡Gracias por su pago!');
      await this.write(Commands.BOLD_ON);
      await this.printText('CONSERVE ESTE RECIBO');
      await this.write(Commands.BOLD_OFF);
      await this.printText('');

      // Firmas
      await this.printText('_______________________________');
      await this.write(Commands.BOLD_ON);
      await this.printText(sanitize(receiptData.branch));
      await this.write(Commands.BOLD_OFF);
      await this.printText('');

      await this.write(Commands.BOLD_ON);
      await this.printText(sanitize(receiptData.collector));
      await this.write(Commands.BOLD_OFF);
      await this.write(Commands.FONT_SMALL);
      await this.printText(sanitize(receiptData.role));
      await this.write(Commands.FONT_NORMAL);

      // Espacios para corte
      await this.write(Commands.LINE_FEED);
      await this.write(Commands.LINE_FEED);
      await this.write(Commands.LINE_FEED);
      await this.write(Commands.LINE_FEED);
      await this.write(Commands.CUT_PAPER);

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
