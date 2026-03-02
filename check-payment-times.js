// Script para verificar las horas de los pagos en ambas bases de datos
require('dotenv').config({ path: '.env' });
const mysql = require('mysql2/promise');

const oldDbConfig = {
    host: process.env.OLD_DB_HOST,
    user: process.env.OLD_DB_USER,
    password: process.env.OLD_DB_PASSWORD,
    database: process.env.OLD_DB_DATABASE,
    charset: 'utf8mb4'
};

const newDbConfig = {
    host: process.env.NEW_DB_HOST,
    user: process.env.NEW_DB_USER,
    password: process.env.NEW_DB_PASSWORD,
    database: process.env.NEW_DB_DATABASE,
    charset: 'utf8mb4',
    timezone: '+00:00'
};

async function checkPaymentTimes() {
    let oldDbConnection, newDbConnection;
    
    try {
        console.log('🔌 Conectando a bases de datos...\n');
        oldDbConnection = await mysql.createConnection(oldDbConfig);
        newDbConnection = await mysql.createConnection(newDbConfig);
        
        // 1. Ver usuario ID 1 en base vieja (users table)
        console.log('📊 BASE DE DATOS VIEJA:');
        console.log('========================\n');
        
        const [oldUser] = await oldDbConnection.execute(
            'SELECT id, name, email FROM users WHERE id = 1'
        );
        console.log('Usuario:', oldUser[0]);
        
        // 2. Ver sus préstamos
        const [oldPrestamos] = await oldDbConnection.execute(
            'SELECT id, user_id, monto FROM prestamos WHERE user_id = 1 LIMIT 3'
        );
        console.log('\nPréstamos del usuario:');
        console.log(oldPrestamos);
        
        // 3. Ver pagos del primer préstamo con HORA EXACTA
        if (oldPrestamos.length > 0) {
            const prestamoId = oldPrestamos[0].id;
            console.log(`\n📅 PAGOS DEL PRÉSTAMO ID ${prestamoId} (BASE VIEJA):`);
            console.log('================================================\n');
            
            const [oldPagos] = await oldDbConnection.execute(
                `SELECT 
                    id, 
                    prestamo_id, 
                    total_efectivo as monto,
                    fecha_abono,
                    DATE_FORMAT(fecha_abono, '%Y-%m-%d %H:%i:%s') as fecha_formateada,
                    estado
                FROM abonos 
                WHERE prestamo_id = ? 
                ORDER BY fecha_abono 
                LIMIT 10`,
                [prestamoId]
            );
            
            oldPagos.forEach(pago => {
                console.log(`ID: ${pago.id}`);
                console.log(`  Monto: C$${pago.monto}`);
                console.log(`  Fecha (raw): ${pago.fecha_abono}`);
                console.log(`  Fecha (formatted): ${pago.fecha_formateada}`);
                console.log(`  Estado: ${pago.estado}`);
                console.log('');
            });
            
            // 4. Ver los mismos pagos en la base nueva
            console.log('\n📅 PAGOS MIGRADOS (BASE NUEVA):');
            console.log('================================\n');
            
            // Buscar el crédito migrado
            const [newCredito] = await newDbConnection.execute(
                'SELECT id, clientId FROM credits WHERE clientId LIKE ? LIMIT 1',
                ['cli_000001%']
            );
            
            if (newCredito.length > 0) {
                console.log('Crédito migrado:', newCredito[0]);
                
                const [newPagos] = await newDbConnection.execute(
                    `SELECT 
                        id,
                        creditId,
                        amount,
                        paymentDate,
                        DATE_FORMAT(paymentDate, '%Y-%m-%d %H:%i:%s') as fecha_formateada,
                        status,
                        legacyId
                    FROM payments_registered 
                    WHERE creditId = ?
                    ORDER BY paymentDate
                    LIMIT 10`,
                    [newCredito[0].id]
                );
                
                console.log(`\nTotal pagos migrados: ${newPagos.length}\n`);
                
                newPagos.forEach(pago => {
                    console.log(`ID: ${pago.id} (Legacy ID: ${pago.legacyId})`);
                    console.log(`  Monto: C$${pago.amount}`);
                    console.log(`  Fecha (raw): ${pago.paymentDate}`);
                    console.log(`  Fecha (formatted): ${pago.fecha_formateada}`);
                    console.log(`  Estado: ${pago.status}`);
                    console.log('');
                });
                
                // 5. Comparar un pago específico
                if (oldPagos.length > 0 && newPagos.length > 0) {
                    console.log('\n🔍 COMPARACIÓN DETALLADA:');
                    console.log('=========================\n');
                    
                    for (let i = 0; i < Math.min(3, oldPagos.length); i++) {
                        const oldPago = oldPagos[i];
                        const newPago = newPagos.find(p => p.legacyId === oldPago.id);
                        
                        if (newPago) {
                            console.log(`Pago Legacy ID: ${oldPago.id}`);
                            console.log(`  VIEJA: ${oldPago.fecha_formateada}`);
                            console.log(`  NUEVA: ${newPago.fecha_formateada}`);
                            console.log(`  ¿Coinciden? ${oldPago.fecha_formateada === newPago.fecha_formateada ? '✅ SÍ' : '❌ NO'}`);
                            console.log('');
                        }
                    }
                }
            } else {
                console.log('❌ No se encontró el crédito migrado');
            }
        }
        
    } catch (error) {
        console.error('❌ ERROR:', error.message);
    } finally {
        if (oldDbConnection) await oldDbConnection.end();
        if (newDbConnection) await newDbConnection.end();
        console.log('\n✅ Verificación completada');
    }
}

checkPaymentTimes();
