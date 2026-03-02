// VERIFICAR ESTADO DE LA MIGRACIÓN
require('dotenv').config({ path: '.env' });
const mysql = require('mysql2/promise');

const newDbConfig = {
    host: process.env.NEW_DB_HOST,
    user: process.env.NEW_DB_USER,
    password: process.env.NEW_DB_PASSWORD,
    database: process.env.NEW_DB_DATABASE,
    charset: 'utf8mb4'
};

async function verificarMigracion() {
    console.log('🔍 VERIFICANDO ESTADO DE LA MIGRACIÓN\n');
    
    try {
        const connection = await mysql.createConnection(newDbConfig);
        
        // Verificar conteos
        const [clients] = await connection.execute('SELECT COUNT(*) as count FROM clients');
        const [credits] = await connection.execute('SELECT COUNT(*) as count FROM credits');
        const [payments] = await connection.execute('SELECT COUNT(*) as count FROM payments_registered');
        const [users] = await connection.execute('SELECT COUNT(*) as count FROM users');
        const [sucursales] = await connection.execute('SELECT COUNT(*) as count, GROUP_CONCAT(name) as names FROM sucursales');
        
        console.log(`👥 Clientes migrados: ${clients[0].count}`);
        console.log(`💳 Créditos migrados: ${credits[0].count}`);
        console.log(`💰 Pagos migrados: ${payments[0].count}`);
        console.log(`👤 Usuarios migrados: ${users[0].count}`);
        console.log(`🏢 Sucursales: ${sucursales[0].count} (${sucursales[0].names || 'ninguna'})`);
        
        // Verificar IDs bonitos
        const [sampleClients] = await connection.execute('SELECT id, clientNumber, name FROM clients LIMIT 3');
        const [sampleCredits] = await connection.execute('SELECT id, creditNumber, clientName FROM credits LIMIT 3');
        const [samplePayments] = await connection.execute('SELECT id, creditId, amount FROM payments_registered LIMIT 3');
        
        console.log('\n📋 EJEMPLOS DE IDs BONITOS:');
        console.log('Clientes:');
        sampleClients.forEach(c => console.log(`   ${c.id} | ${c.clientNumber} | ${c.name}`));
        
        console.log('Créditos:');
        sampleCredits.forEach(c => console.log(`   ${c.id} | ${c.creditNumber} | ${c.clientName}`));
        
        console.log('Pagos:');
        samplePayments.forEach(p => console.log(`   ${p.id} | Crédito: ${p.creditId} | C$${p.amount}`));
        
        // Verificar sucursales inteligentes
        const [leonClients] = await connection.execute('SELECT COUNT(*) as count FROM clients WHERE sucursal_name = "Sucursal León"');
        const [jinotepeClients] = await connection.execute('SELECT COUNT(*) as count FROM clients WHERE sucursal_name = "Sucursal Jinotepe"');
        
        console.log('\n🏢 DISTRIBUCIÓN POR SUCURSALES:');
        console.log(`   León: ${leonClients[0].count} clientes`);
        console.log(`   Jinotepe: ${jinotepeClients[0].count} clientes`);
        
        await connection.end();
        
        console.log('\n✅ VERIFICACIÓN COMPLETADA');
        
    } catch (error) {
        console.error('❌ Error al verificar:', error.message);
    }
}

verificarMigracion();