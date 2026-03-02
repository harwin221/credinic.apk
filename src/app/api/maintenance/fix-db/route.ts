import { query } from '@/lib/mysql';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        console.log('Iniciando actualización de esquema de base de datos...');

        // 1. Verificar y agregar columnas a payments_registered
        const columns: any = await query('SHOW COLUMNS FROM payments_registered');
        const columnNames = columns.map((c: any) => c.Field);

        const results = [];

        if (!columnNames.includes('paymentType')) {
            await query("ALTER TABLE payments_registered ADD COLUMN paymentType VARCHAR(50) DEFAULT 'NORMAL' AFTER status");
            results.push('Columna paymentType agregada a payments_registered');
        }

        if (!columnNames.includes('notes')) {
            await query("ALTER TABLE payments_registered ADD COLUMN notes TEXT AFTER paymentType");
            results.push('Columna notes agregada a payments_registered');
        }

        // 2. Verificar y agregar columnas a audit_logs
        const auditColumns: any = await query('SHOW COLUMNS FROM audit_logs');
        const auditColumnNames = auditColumns.map((c: any) => c.Field);

        if (!auditColumnNames.includes('ipAddress')) {
            await query("ALTER TABLE audit_logs ADD COLUMN ipAddress VARCHAR(45) AFTER userName");
            results.push('Columna ipAddress agregada a audit_logs');
        }

        // 3. Sincronizar contadores (counters)
        const [clientMaxRows]: any = await query("SELECT MAX(CAST(SUBSTRING(clientNumber, 5) AS UNSIGNED)) as maxVal FROM clients WHERE clientNumber LIKE 'CLI-%'");
        const [creditMaxRows]: any = await query("SELECT MAX(CAST(SUBSTRING(creditNumber, 5) AS UNSIGNED)) as maxVal FROM credits WHERE creditNumber LIKE 'CRE-%'");
        const [reciboMaxRows]: any = await query("SELECT MAX(CAST(SUBSTRING(transactionNumber, 5) AS UNSIGNED)) as maxVal FROM payments_registered WHERE transactionNumber LIKE 'REC-%'");

        const maxClient = clientMaxRows?.maxVal || 0;
        const maxCredit = creditMaxRows?.maxVal || 0;
        const maxRecibo = reciboMaxRows?.maxVal || 0;

        await query("INSERT INTO counters (id, clientNumber, creditNumber, reciboNumber) VALUES ('main', ?, ?, ?) ON DUPLICATE KEY UPDATE clientNumber = GREATEST(clientNumber, ?), creditNumber = GREATEST(creditNumber, ?), reciboNumber = GREATEST(reciboNumber, ?)",
            [maxClient, maxCredit, maxRecibo, maxClient, maxCredit, maxRecibo]);

        results.push(`Contadores sincronizados: Clientes=${maxClient}, Créditos=${maxCredit}, Recibos=${maxRecibo}`);

        if (results.length === 0) {
            return NextResponse.json({ success: true, message: 'El esquema y los contadores ya estaban actualizados.' });
        }

        return NextResponse.json({ success: true, changes: results });

    } catch (error: any) {
        console.error('Error al actualizar el esquema o sincronizar contadores:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
