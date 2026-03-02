// Script para verificar las cédulas en la base de datos nueva
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

async function checkCedulas() {
    let connection;
    try {
        console.log('🔌 Conectando a la base de datos nueva...');
        connection = await mysql.createConnection(newDbConfig);
        console.log('✅ Conexión exitosa.\n');

        // Obtener algunos ejemplos de cédulas
        const [clients] = await connection.execute(`
            SELECT id, clientNumber, name, cedula, legacyId
            FROM clients 
            ORDER BY createdAt DESC
            LIMIT 20
        `);

        console.log('📋 Cédulas en la base de datos nueva:\n');
        console.log('ID\t\tNombre\t\t\t\tCédula\t\tLegacy ID');
        console.log('─'.repeat(100));
        
        clients.forEach(client => {
            console.log(`${client.clientNumber}\t${client.name.padEnd(30)}\t${client.cedula || 'SIN CÉDULA'}\t${client.legacyId}`);
        });

        console.log('\n📊 Resumen:');
        const [stats] = await connection.execute(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN cedula IS NULL OR cedula = '' THEN 1 ELSE 0 END) as sin_cedula,
                SUM(CASE WHEN LENGTH(cedula) < 10 THEN 1 ELSE 0 END) as cedula_corta,
                SUM(CASE WHEN cedula LIKE '%-%' THEN 1 ELSE 0 END) as con_guiones
            FROM clients
        `);
        
        console.log(`Total clientes: ${stats[0].total}`);
        console.log(`Sin cédula: ${stats[0].sin_cedula}`);
        console.log(`Cédula corta (< 10 caracteres): ${stats[0].cedula_corta}`);
        console.log(`Con guiones: ${stats[0].con_guiones}`);

        // Comparar con la base vieja
        console.log('\n🔍 Comparando con base de datos vieja...\n');
        
        const oldDbConfig = {
            host: process.env.OLD_DB_HOST,
            user: process.env.OLD_DB_USER,
            password: process.env.OLD_DB_PASSWORD,
            database: process.env.OLD_DB_DATABASE,
            charset: 'utf8mb4'
        };
        
        const oldConnection = await mysql.createConnection(oldDbConfig);
        
        // Tomar algunos ejemplos específicos
        const legacyIds = clients.slice(0, 5).map(c => c.legacyId);
        const [oldClients] = await oldConnection.execute(`
            SELECT id, nombres, apellidos, cedula
            FROM users 
            WHERE id IN (${legacyIds.join(',')})
        `);
        
        console.log('Comparación (primeros 5 clientes):');
        console.log('Legacy ID\tNombre (Vieja)\t\t\tCédula (Vieja)\t\tCédula (Nueva)');
        console.log('─'.repeat(100));
        
        oldClients.forEach(oldClient => {
            const newClient = clients.find(c => c.legacyId === oldClient.id);
            const oldName = `${oldClient.nombres || ''} ${oldClient.apellidos || ''}`.trim();
            console.log(`${oldClient.id}\t\t${oldName.padEnd(30)}\t${oldClient.cedula || 'N/A'}\t\t${newClient?.cedula || 'N/A'}`);
        });
        
        await oldConnection.end();

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        if (connection) await connection.end();
    }
}

checkCedulas();
