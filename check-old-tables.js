// Script para ver las tablas de la base vieja
require('dotenv').config({ path: '.env' });
const mysql = require('mysql2/promise');

const oldDbConfig = {
    host: process.env.OLD_DB_HOST,
    user: process.env.OLD_DB_USER,
    password: process.env.OLD_DB_PASSWORD,
    database: process.env.OLD_DB_DATABASE,
    charset: 'utf8mb4'
};

async function checkTables() {
    let connection;
    
    try {
        console.log('🔌 Conectando a base de datos vieja...\n');
        connection = await mysql.createConnection(oldDbConfig);
        
        const [tables] = await connection.execute('SHOW TABLES');
        console.log('📊 Tablas en la base de datos vieja:');
        console.log(tables);
        
    } catch (error) {
        console.error('❌ ERROR:', error.message);
    } finally {
        if (connection) await connection.end();
    }
}

checkTables();
