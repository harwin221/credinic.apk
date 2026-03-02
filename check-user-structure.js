// Script para ver estructura de users
require('dotenv').config({ path: '.env' });
const mysql = require('mysql2/promise');

const oldDbConfig = {
    host: process.env.OLD_DB_HOST,
    user: process.env.OLD_DB_USER,
    password: process.env.OLD_DB_PASSWORD,
    database: process.env.OLD_DB_DATABASE,
    charset: 'utf8mb4'
};

async function checkStructure() {
    let connection;
    
    try {
        connection = await mysql.createConnection(oldDbConfig);
        
        console.log('📊 Estructura de tabla users:');
        const [cols] = await connection.execute('DESCRIBE users');
        console.log(cols);
        
        console.log('\n📊 Primeros 3 usuarios:');
        const [users] = await connection.execute('SELECT * FROM users LIMIT 3');
        console.log(users);
        
        console.log('\n📊 Estructura de tabla prestamos:');
        const [prestCols] = await connection.execute('DESCRIBE prestamos');
        console.log(prestCols);
        
        console.log('\n📊 Primeros 3 préstamos:');
        const [prest] = await connection.execute('SELECT * FROM prestamos LIMIT 3');
        console.log(prest);
        
        console.log('\n📊 Estructura de tabla abonos:');
        const [abonoCols] = await connection.execute('DESCRIBE abonos');
        console.log(abonoCols);
        
        console.log('\n📊 Primeros 5 abonos:');
        const [abonos] = await connection.execute('SELECT * FROM abonos LIMIT 5');
        console.log(abonos);
        
    } catch (error) {
        console.error('❌ ERROR:', error.message);
    } finally {
        if (connection) await connection.end();
    }
}

checkStructure();
