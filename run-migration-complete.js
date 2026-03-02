// SCRIPT COMPLETO DE MIGRACIÓN - EJECUTA LAS 3 FASES
// Optimizado con date-fns-tz para conversión correcta de zonas horarias

const { execSync } = require('child_process');
const fs = require('fs');

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║   🚀 MIGRACIÓN COMPLETA: BASE VIEJA → BASE NUEVA          ║');
console.log('║   Optimizado con date-fns-tz para zonas horarias          ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

// Verificar que existe .env
if (!fs.existsSync('.env')) {
    console.error('❌ ERROR: No se encontró el archivo .env');
    console.error('   Crea un archivo .env con las credenciales de las bases de datos.');
    process.exit(1);
}

const startTime = Date.now();

try {
    // FASE 1: USUARIOS Y CLIENTES
    console.log('\n┌─────────────────────────────────────────────────────────┐');
    console.log('│  FASE 1: MIGRANDO USUARIOS Y CLIENTES                  │');
    console.log('└─────────────────────────────────────────────────────────┘');
    const fase1Start = Date.now();
    execSync('node legacy-scripts/migration-scripts/migration-fase1.js', { stdio: 'inherit' });
    const fase1Time = ((Date.now() - fase1Start) / 1000).toFixed(2);
    console.log(`✅ Fase 1 completada en ${fase1Time}s\n`);

    // Verificar que se creó el mapa de traducción
    if (!fs.existsSync('./translation-map.json')) {
        throw new Error('No se generó translation-map.json en Fase 1');
    }

    // FASE 2: CRÉDITOS
    console.log('\n┌─────────────────────────────────────────────────────────┐');
    console.log('│  FASE 2: MIGRANDO CRÉDITOS Y PLANES DE PAGO            │');
    console.log('└─────────────────────────────────────────────────────────┘');
    const fase2Start = Date.now();
    execSync('node legacy-scripts/migration-scripts/migration-fase2.js', { stdio: 'inherit' });
    const fase2Time = ((Date.now() - fase2Start) / 1000).toFixed(2);
    console.log(`✅ Fase 2 completada en ${fase2Time}s\n`);

    // Verificar que se creó el mapa de créditos
    if (!fs.existsSync('./credit-map.json')) {
        throw new Error('No se generó credit-map.json en Fase 2');
    }

    // FASE 3: PAGOS
    console.log('\n┌─────────────────────────────────────────────────────────┐');
    console.log('│  FASE 3: MIGRANDO PAGOS CON CONVERSIÓN UTC             │');
    console.log('└─────────────────────────────────────────────────────────┘');
    const fase3Start = Date.now();
    execSync('node legacy-scripts/migration-scripts/migration-fase3.js', { stdio: 'inherit' });
    const fase3Time = ((Date.now() - fase3Start) / 1000).toFixed(2);
    console.log(`✅ Fase 3 completada en ${fase3Time}s\n`);

    // RESUMEN FINAL
    const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║              ✅ MIGRACIÓN COMPLETADA EXITOSAMENTE          ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log(`\n📊 RESUMEN DE TIEMPOS:`);
    console.log(`   Fase 1 (Usuarios/Clientes): ${fase1Time}s`);
    console.log(`   Fase 2 (Créditos):          ${fase2Time}s`);
    console.log(`   Fase 3 (Pagos):             ${fase3Time}s`);
    console.log(`   ─────────────────────────────────────`);
    console.log(`   TIEMPO TOTAL:               ${totalTime}s`);
    console.log(`\n✅ Todos los datos han sido migrados correctamente.`);
    console.log(`✅ Las fechas de pagos se convirtieron de Nicaragua a UTC.`);
    console.log(`✅ Los archivos de mapeo están en:`);
    console.log(`   - translation-map.json (usuarios/clientes)`);
    console.log(`   - credit-map.json (créditos)`);
    console.log(`\n🎉 ¡Migración exitosa! Puedes iniciar tu aplicación.\n`);

} catch (error) {
    console.error('\n╔════════════════════════════════════════════════════════════╗');
    console.error('║              ❌ ERROR EN LA MIGRACIÓN                      ║');
    console.error('╚════════════════════════════════════════════════════════════╝');
    console.error(`\n${error.message}`);
    console.error('\n📋 PASOS PARA SOLUCIONAR:');
    console.error('   1. Revisa el error arriba');
    console.error('   2. Verifica las credenciales en .env');
    console.error('   3. Asegúrate de que ambas bases de datos estén accesibles');
    console.error('   4. Ejecuta las fases individualmente para identificar el problema:');
    console.error('      - node legacy-scripts/migration-scripts/migration-fase1.js');
    console.error('      - node legacy-scripts/migration-scripts/migration-fase2.js');
    console.error('      - node legacy-scripts/migration-scripts/migration-fase3.js\n');
    process.exit(1);
}
