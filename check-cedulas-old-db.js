// Script para verificar las cédulas en la base de datos vieja
require('dotenv').config({ path: '.env' });
const mysql = require('mysql2/promise');

const oldDbConfig = {
    host: process.env.OLD_DB_HOST,
    user: process.env.OLD_DB_USER,
    password: process.env.OLD_DB_PASSWORD,
    database: process.env.OLD_DB_DATABASE,
    charset: 'utf8mb4'
};

async function checkCedulas() {
    let connection;
    try {
        console.log('🔌 Conectando a la base de datos vieja...');
        connection = await mysql.createConnection(oldDbConfig);
        console.log('✅ Conexión exitosa.\n');

        // Obtener algunos ejemplos de cédulas
        const [users] = await connection.execute(`
            SELECT id, nombres, apellidos, cedula, tipo_usuario 
            FROM users 
            WHERE tipo_usuario = 3 
            ORDER BY id 
            LIMIT 20
        `);

        console.log('📋 Ejemplos de cédulas en la base de datos vieja:\n');
        console.log('ID\tNombre\t\t\t\tCédula');
        console.log('─'.repeat(80));
        
        users.forEach(user => {
            const fullName = `${user.nombres || ''} ${user.apellidos || ''}`.trim();
            console.log(`${user.id}\t${fullName.padEnd(30)}\t${user.cedula || 'SIN CÉDULA'}`);
        });

        console.log('\n📊 Resumen:');
        const [stats] = await connection.execute(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN cedula IS NULL OR cedula = '' THEN 1 ELSE 0 END) as sin_cedula,
                SUM(CASE WHEN LENGTH(cedula) < 10 THEN 1 ELSE 0 END) as cedula_corta
            FROM users 
            WHERE tipo_usuario = 3
        `);
        
        console.log(`Total clientes: ${stats[0].total}`);
        console.log(`Sin cédula: ${stats[0].sin_cedula}`);
        console.log(`Cédula corta (< 10 caracteres): ${stats[0].cedula_corta}`);

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        if (connection) await connection.end();
    }
}

checkCedulas();
