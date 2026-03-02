// Script para ver estructura de prestamo_coutas
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
        
        console.log('📊 Estructura de tabla prestamo_coutas:');
        const [cols] = await connection.execute('DESCRIBE prestamo_coutas');
        console.log(cols);
        
        console.log('\n📊 Primeros 10 registros con fecha_pagado:');
        const [rows] = await connection.execute(`
            SELECT 
                id,
                prestamo_id,
                numero_cuota,
                monto_cuota,
                fecha_cuota,
                fecha_pagado,
                DATE_FORMAT(fecha_pagado, '%Y-%m-%d %H:%i:%s') as fecha_pagado_formatted,
                estado
            FROM prestamo_coutas 
            WHERE fecha_pagado IS NOT NULL
            ORDER BY fecha_pagado
            LIMIT 10
        `);
        console.log(rows);
        
        console.log('\n📊 Estructura de tabla prestamo_cuota_abono:');
        const [cols2] = await connection.execute('DESCRIBE prestamo_cuota_abono');
        console.log(cols2);
        
        console.log('\n📊 Primeros 10 registros de prestamo_cuota_abono:');
        const [rows2] = await connection.execute('SELECT * FROM prestamo_cuota_abono LIMIT 10');
        console.log(rows2);
        
    } catch (error) {
        console.error('❌ ERROR:', error.message);
    } finally {
        if (connection) await connection.end();
    }
}

checkStructure();
