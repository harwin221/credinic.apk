// Script para verificar el estado de la migración
require('dotenv').config({ path: '.env' });
const mysql = require('mysql2/promise');

async function checkMigrationStatus() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || process.env.MYSQL_HOST,
        user: process.env.DB_USERNAME || process.env.MYSQL_USER,
        password: process.env.DB_PASSWORD || process.env.MYSQL_PASSWORD,
        database: process.env.DB_DATABASE || process.env.MYSQL_DATABASE,
        port: process.env.DB_PORT || 3306
    });

    try {
        console.log('📊 VERIFICANDO ESTADO DE LA MIGRACIÓN\n');
        console.log('=====================================');

        // Verificar usuarios
        const [users] = await connection.execute('SELECT COUNT(*) as count FROM users');
        console.log(`👥 Usuarios: ${users[0].count}`);

        // Verificar clientes
        const [clients] = await connection.execute('SELECT COUNT(*) as count FROM clients');
        console.log(`👤 Clientes: ${clients[0].count}`);

        // Verificar créditos
        const [credits] = await connection.execute('SELECT COUNT(*) as count FROM credits');
        console.log(`💳 Créditos: ${credits[0].count}`);

        // Verificar pagos
        const [payments] = await connection.execute('SELECT COUNT(*) as count FROM payments_registered');
        console.log(`💰 Pagos: ${payments[0].count}`);

        // Verificar admin
        const [admin] = await connection.execute('SELECT * FROM users WHERE username = ?', ['admin']);
        console.log(`🔐 Usuario Admin: ${admin.length > 0 ? '✅ Existe' : '❌ No existe'}`);

        console.log('=====================================\n');

        // Verificar si hay datos
        if (users[0].count === 0 || clients[0].count === 0) {
            console.log('⚠️  La base de datos está vacía o la migración no se completó');
            console.log('💡 Ejecuta: node run-full-migration.js');
        } else if (credits[0].count === 0) {
            console.log('⚠️  Fase 1 completada, pero faltan créditos');
            console.log('💡 Ejecuta desde Fase 2: node legacy-scripts/migration-scripts/migration-fase2.js');
        } else if (payments[0].count === 0) {
            console.log('⚠️  Fases 1 y 2 completadas, pero faltan pagos');
            console.log('💡 Ejecuta Fase 3: node legacy-scripts/migration-scripts/migration-fase3.js');
        } else if (admin.length === 0) {
            console.log('⚠️  Migración completa, pero falta crear admin');
            console.log('💡 Ejecuta: node legacy-scripts/migration-scripts/crear-admin.js');
        } else {
            console.log('✅ MIGRACIÓN COMPLETA - Todos los datos están presentes');
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await connection.end();
    }
}

checkMigrationStatus();
