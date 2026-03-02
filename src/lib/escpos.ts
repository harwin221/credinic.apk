
// Un codificador simple de ESC/POS para impresoras térmicas.
// Maneja texto básico y comandos de control.
// NOTA: Este archivo está diseñado para ser usado en el lado del servidor con Node.js.

export class EscPosEncoder {
    private _buffer: number[];

    constructor() {
        this._buffer = [];
    }

    // Inicializar impresora
    public initialize(): this {
        this._buffer.push(0x1B, 0x40);
        return this;
    }
    
    // Establecer codificación de caracteres
    public characterSet(cs: 'pc437' | 'pc850' | 'pc860' | 'pc863' | 'pc865'): this {
        const sets = {
            pc437: 0,
            pc850: 2,
            pc860: 3,
            pc863: 4,
            pc865: 5,
        };
        this._buffer.push(0x1B, 0x74, sets[cs]);
        return this;
    }
    
    // Añadir texto al buffer
    public text(text: string): this {
        const encoder = new TextEncoder();
        const bytes = encoder.encode(text);
        bytes.forEach(b => this._buffer.push(b));
        return this;
    }

    // Avance de línea
    public feed(lines: number = 1): this {
        for (let i = 0; i < lines; i++) {
            this._buffer.push(0x0A);
        }
        return this;
    }

    // Cortar papel
    public cut(type: 'full' | 'partial' = 'full'): this {
        this._buffer.push(0x1D, 0x56, type === 'full' ? 0x00 : 0x01);
        return this;
    }
    
    // Obtener el buffer de comandos final
    public encode(): Uint8Array {
        return new Uint8Array(this._buffer);
    }
}
