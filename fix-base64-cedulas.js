// Script para decodificar SOLO las cédulas que están en Base64 válido
require('dotenv').config({ path: '.env' });
const mysql = require('mysql2/promise');

const newDbConfig = {
    host: process.env.NEW_DB_HOST,
    user: process.env.NEW_DB_USER,
    password: process.env.NEW_DB_PASSWORD,
    database: process.env.NEW_DB_DATABASE,
    charset: 'utf8mb4',
    timezone: '+00:00'
};

function isValidBase64Cedula(str) {
    if (!str || str.length === 0) return false;
    
    // Base64 termina con = o ==
    if (!str.endsWith('=') && !str.endsWith('==')) return false;
    
    // Base64 solo contiene caracteres A-Z, a-z, 0-9, +, /, y = al final
    const base64Regex = /^[A-Za-z0-9+/]+=*$/;
    if (!base64Regex.test(str)) return false;
    
    // Intentar decodificar
    try {
        const decoded = Buffer.from(str, 'base64').toString('utf-8');
        
        // Verificar que el decodificado sea una cédula válida
        // Debe contener números y posiblemente guiones
        // Y debe tener una longitud razonable (entre 8 y 20 caracteres)
        if (decoded.length < 8 || decoded.length > 20) return false;
        
        // Debe contener principalmente números y guiones
        const validChars = /^[0-9\-A-Z]+$/i;
        if (!validChars.test(decoded)) return false;
        
        // Debe tener al menos un número
        if (!/\d/.test(decoded)) return false;
        
        return true;
    } catch (e) {
        return false;
    }
}

async function fixBase64Cedulas() {
    let connection;
    try {
        console.log('🔌 Conectando a la base de datos...');
        connection = await mysql.createConnection(newDbConfig);
        console.log('✅ Conexión exitosa.\n');

        // Obtener todos los clientes
        const [clients] = await connection.execute('SELECT id, clientNumber, name, cedula FROM clients ORDER BY clientNumber');
        
        console.log(`📋 Total de clientes: ${clients.length}\n`);
        
        let fixed = 0;
        let skipped = 0;
        
        console.log('🔧 Decodificando cédulas en Base64...\n');
        
        for (const client of clients) {
            if (isValidBase64Cedula(client.cedula)) {
                const decoded = Buffer.from(client.cedula, 'base64').toString('utf-8');
                console.log(`✓ ${client.clientNumber} - ${client.name.substring(0, 30)}`);
                console.log(`  Antes:   ${client.cedula}`);
                console.log(`  Después: ${decoded}\n`);
                
                await connection.execute(
                    'UPDATE clients SET cedula = ? WHERE id = ?',
                    [decoded, client.id]
                );
                
                fixed++;
            } else {
                skipped++;
            }
        }
        
        console.log(`\n✅ Proceso completado:`);
        console.log(`   Cédulas decodificadas: ${fixed}`);
        console.log(`   Cédulas sin cambios: ${skipped}`);

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error);
    } finally {
        if (connection) await connection.end();
    }
}

fixBase64Cedulas();
