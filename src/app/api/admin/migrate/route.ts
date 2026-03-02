
import { query } from '@/lib/mysql';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        // 1. Agregar columnas a payments_registered
        await query(`
            ALTER TABLE payments_registered 
            ADD COLUMN IF NOT EXISTS paymentType ENUM('NORMAL', 'DISPENSA', 'AJUSTE') DEFAULT 'NORMAL',
            ADD COLUMN IF NOT EXISTS notes TEXT;
        `);

        // 2. Asegurarse de que el estado 'Fallecido' esté permitido en la tabla credits (si es un enum)
        // Pero en MySQL el status parece ser VARCHAR por el código anterior.

        return NextResponse.json({ success: true, message: 'Migración completada exitosamente.' });
    } catch (error: any) {
        console.error('Error en migración:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
