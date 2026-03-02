// SCRIPT MAESTRO - EJECUTA TODAS LAS MIGRACIONES EN ORDEN
require('dotenv').config({ path: '.env' });
const { execSync } = require('child_process');

console.log('🚀 INICIANDO MIGRACIÓN COMPLETA');
console.log('================================');
console.log('⚠️  ADVERTENCIA: Este proceso eliminará TODOS los datos existentes');
console.log('    y los reemplazará con los datos de la base antigua.');
console.log('================================\n');

const startTime = Date.now();

try {
    // FASE 1: Usuarios y Clientes (incluye limpieza de TODAS las tablas)
    console.log('🗑️  LIMPIANDO BASE DE DATOS...');
    console.log('� FASE 1: Migrando Usuarios y Clientes...');
    execSync('node legacy-scripts/migration-scripts/migration-fase1.js', { stdio: 'inherit' });
    console.log('✅ Fase 1 completada\n');

    // FASE 2: Créditos
    console.log('� FASE 2: Migrando Créditos...');
    execSync('node legacy-scripts/migration-scripts/migration-fase2.js', { stdio: 'inherit' });
    console.log('✅ Fase 2 completada\n');

    // FASE 3: Pagos
    console.log('💰 FASE 3: Migrando Pagos...');
    execSync('node legacy-scripts/migration-scripts/migration-fase3.js', { stdio: 'inherit' });
    console.log('✅ Fase 3 completada\n');

    // Crear Admin
    console.log('👤 Creando usuario administrador...');
    execSync('node legacy-scripts/migration-scripts/crear-admin.js', { stdio: 'inherit' });
    console.log('✅ Admin creado\n');

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    console.log('\n🎉 MIGRACIÓN COMPLETA EXITOSA');
    console.log('================================');
    console.log(`⏱️  Tiempo total: ${duration} segundos`);
    console.log('\n📊 RESUMEN:');
    console.log('   ✅ Usuarios y Clientes migrados');
    console.log('   ✅ Créditos y Planes de Pago migrados');
    console.log('   ✅ Pagos migrados con hora correcta');
    console.log('   ✅ Usuario admin creado/actualizado');
    console.log('\n🔐 CREDENCIALES ADMIN:');
    console.log('   Usuario: admin');
    console.log('   Email: admin@credinica.com');
    console.log('   Contraseña: Leon123');
    console.log('================================\n');

} catch (error) {
    console.error('\n❌ ERROR EN LA MIGRACIÓN:', error.message);
    console.error('💡 Revisa los logs arriba para ver qué falló');
    process.exit(1);
}
