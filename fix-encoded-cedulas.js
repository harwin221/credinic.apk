// Script para decodificar las cédulas que están en Base64
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

function isBase64(str) {
    if (!str || str.length === 0) return false;
    // Base64 solo contiene caracteres A-Z, a-z, 0-9, +, /, y = al final
    const base64Regex = /^[A-Za-z0-9+/]+=*$/;
    if (!base64Regex.test(str)) return false;
    
    // Intentar decodificar
    try {
        const decoded = Buffer.from(str, 'base64').toString('utf-8');
        // Verificar que el decodificado tenga sentido (contiene números o guiones)
        return /[0-9-]/.test(decoded);
    } catch (e) {
        return false;
    }
}

async function fixEncodedCedulas() {
    let connection;
    try {
        console.log('🔌 Conectando a la base de datos...');
        connection = await mysql.createConnection(newDbConfig);
        console.log('✅ Conexión exitosa.\n');

        // Obtener todos los clientes
        const [clients] = await connection.execute('SELECT id, clientNumber, name, cedula FROM clients');
        
        console.log(`📋 Total de clientes: ${clients.length}\n`);
        
        let fixed = 0;
        let skipped = 0;
        
        for (const client of clients) {
            if (isBase64(client.cedula)) {
                const decoded = Buffer.from(client.cedula, 'base64').toString('utf-8');
                console.log(`🔧 ${client.clientNumber} - ${client.name}`);
                console.log(`   Antes: ${client.cedula}`);
                console.log(`   Después: ${decoded}`);
                
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
    } finally {
        if (connection) await connection.end();
    }
}

fixEncodedCedulas();
