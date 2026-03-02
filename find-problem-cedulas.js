// Script para encontrar las cédulas problemáticas
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

async function findProblemCedulas() {
    let connection;
    try {
        console.log('🔌 Conectando a la base de datos...');
        connection = await mysql.createConnection(newDbConfig);
        console.log('✅ Conexión exitosa.\n');

        // Buscar cédulas que parecen códigos abreviados (menos de 10 caracteres y con guión)
        const [shortCedulas] = await connection.execute(`
            SELECT id, clientNumber, name, cedula, LENGTH(cedula) as len
            FROM clients 
            WHERE LENGTH(cedula) < 10 AND cedula LIKE '%-%'
            ORDER BY createdAt DESC
            LIMIT 20
        `);
        
        console.log('📋 Cédulas cortas con guión (posibles códigos abreviados):\n');
        console.log('Cliente\t\tNombre\t\t\t\tCédula\t\tLongitud');
        console.log('─'.repeat(100));
        
        shortCedulas.forEach(client => {
            console.log(`${client.clientNumber}\t${client.name.padEnd(30)}\t${client.cedula}\t${client.len}`);
        });

        // Buscar cédulas que parecen Base64 (contienen caracteres especiales de Base64)
        const [base64Cedulas] = await connection.execute(`
            SELECT id, clientNumber, name, cedula, LENGTH(cedula) as len
            FROM clients 
            WHERE cedula REGEXP '[A-Za-z0-9+/]+=*$' AND LENGTH(cedula) > 15
            ORDER BY createdAt DESC
            LIMIT 10
        `);
        
        console.log('\n📋 Cédulas que parecen Base64:\n');
        console.log('Cliente\t\tNombre\t\t\t\tCédula');
        console.log('─'.repeat(100));
        
        base64Cedulas.forEach(client => {
            console.log(`${client.clientNumber}\t${client.name.padEnd(30)}\t${client.cedula.substring(0, 30)}...`);
            
            // Intentar decodificar
            try {
                const decoded = Buffer.from(client.cedula, 'base64').toString('utf-8');
                console.log(`\t\t\t\t\t\tDecodificado: ${decoded}`);
            } catch (e) {
                console.log(`\t\t\t\t\t\tNo se pudo decodificar`);
            }
        });

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        if (connection) await connection.end();
    }
}

findProblemCedulas();
