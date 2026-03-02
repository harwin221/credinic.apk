const mysql = require('mysql2/promise');
require('dotenv').config();

async function diagnoseDates() {
  const connection = await mysql.createConnection({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    ssl: process.env.MYSQL_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
  });

  try {
    console.log('🕐 Diagnóstico de Fechas en la Aplicación\n');
    console.log('='.repeat(50));

    // 1. Verificar zona horaria del servidor MySQL
    console.log('\n1. 📍 Configuración de Zona Horaria:');
    const [timezoneInfo] = await connection.execute(`
      SELECT 
        @@global.time_zone as global_timezone,
        @@session.time_zone as session_timezone,
        NOW() as server_now,
        UTC_TIMESTAMP() as utc_now
    `);
    
    console.log(`   - Zona horaria global: ${timezoneInfo[0].global_timezone}`);
    console.log(`   - Zona horaria sesión: ${timezoneInfo[0].session_timezone}`);
    console.log(`   - Hora del servidor: ${timezoneInfo[0].server_now}`);
    console.log(`   - Hora UTC: ${timezoneInfo[0].utc_now}`);

    // 2. Verificar fechas en créditos
    console.log('\n2. 💳 Análisis de Fechas en Créditos:');
    const [credits] = await connection.execute(`
      SELECT 
        id,
        creditNumber,
        clientName,
        applicationDate,
        approvalDate,
        deliveryDate,
        firstPaymentDate,
        dueDate,
        status
      FROM credits 
      ORDER BY applicationDate DESC 
      LIMIT 5
    `);

    if (credits.length > 0) {
      console.log('   Últimos 5 créditos:');
      credits.forEach(credit => {
        console.log(`   📄 ${credit.creditNumber} (${credit.clientName})`);
        console.log(`      - Aplicación: ${credit.applicationDate}`);
        console.log(`      - Aprobación: ${credit.approvalDate || 'N/A'}`);
        console.log(`      - Entrega: ${credit.deliveryDate || 'N/A'}`);
        console.log(`      - Primer pago: ${credit.firstPaymentDate || 'N/A'}`);
        console.log(`      - Vencimiento: ${credit.dueDate}`);
        console.log('');
      });
    } else {
      console.log('   ✅ No hay créditos para analizar');
    }

    // 3. Verificar fechas en plan de pagos
    console.log('\n3. 📅 Análisis de Plan de Pagos:');
    const [paymentPlan] = await connection.execute(`
      SELECT 
        pp.creditId,
        c.creditNumber,
        pp.paymentNumber,
        pp.paymentDate,
        pp.amount
      FROM payment_plan pp
      JOIN credits c ON pp.creditId = c.id
      ORDER BY pp.paymentDate DESC
      LIMIT 10
    `);

    if (paymentPlan.length > 0) {
      console.log('   Últimas 10 cuotas programadas:');
      paymentPlan.forEach(payment => {
        const jsDate = new Date(payment.paymentDate);
        const localDate = jsDate.toLocaleDateString('es-NI');
        const isoDate = jsDate.toISOString().split('T')[0];
        
        console.log(`   💰 ${payment.creditNumber} - Cuota #${payment.paymentNumber}`);
        console.log(`      - Fecha BD: ${payment.paymentDate}`);
        console.log(`      - Fecha JS Local: ${localDate}`);
        console.log(`      - Fecha ISO: ${isoDate}`);
        console.log(`      - Monto: C$${payment.amount}`);
        console.log('');
      });
    } else {
      console.log('   ✅ No hay plan de pagos para analizar');
    }

    // 4. Verificar fechas en pagos registrados
    console.log('\n4. 💸 Análisis de Pagos Registrados:');
    const [payments] = await connection.execute(`
      SELECT 
        pr.id,
        pr.creditId,
        c.creditNumber,
        pr.paymentDate,
        pr.amount,
        pr.managedBy,
        pr.status
      FROM payments_registered pr
      JOIN credits c ON pr.creditId = c.id
      ORDER BY pr.paymentDate DESC
      LIMIT 5
    `);

    if (payments.length > 0) {
      console.log('   Últimos 5 pagos registrados:');
      payments.forEach(payment => {
        const jsDate = new Date(payment.paymentDate);
        const localDate = jsDate.toLocaleDateString('es-NI');
        const isoDate = jsDate.toISOString().split('T')[0];
        
        console.log(`   💵 ${payment.creditNumber} - ${payment.status}`);
        console.log(`      - Fecha BD: ${payment.paymentDate}`);
        console.log(`      - Fecha JS Local: ${localDate}`);
        console.log(`      - Fecha ISO: ${isoDate}`);
        console.log(`      - Monto: C$${payment.amount}`);
        console.log(`      - Gestionado por: ${payment.managedBy}`);
        console.log('');
      });
    } else {
      console.log('   ✅ No hay pagos registrados para analizar');
    }

    // 5. Verificar fechas de feriados
    console.log('\n5. 🎉 Análisis de Fechas de Feriados:');
    const [holidays] = await connection.execute(`
      SELECT id, name, date FROM holidays ORDER BY date
    `);

    if (holidays.length > 0) {
      console.log('   Feriados configurados:');
      holidays.forEach(holiday => {
        const jsDate = new Date(holiday.date + 'T00:00:00');
        const localDate = jsDate.toLocaleDateString('es-NI');
        
        console.log(`   🎊 ${holiday.name}`);
        console.log(`      - Fecha BD: ${holiday.date}`);
        console.log(`      - Fecha JS Local: ${localDate}`);
        console.log('');
      });
    } else {
      console.log('   ✅ No hay feriados configurados');
    }

    // 6. Pruebas de conversión de fechas
    console.log('\n6. 🧪 Pruebas de Conversión de Fechas:');
    
    const testDate = '2025-11-15';
    console.log(`   Fecha de prueba: ${testDate}`);
    
    // Simular diferentes formas de manejar fechas
    const jsDate1 = new Date(testDate);
    const jsDate2 = new Date(testDate + 'T00:00:00');
    const jsDate3 = new Date(testDate + 'T12:00:00');
    
    console.log(`   - new Date('${testDate}'): ${jsDate1.toLocaleDateString('es-NI')} (${jsDate1.toISOString()})`);
    console.log(`   - new Date('${testDate}T00:00:00'): ${jsDate2.toLocaleDateString('es-NI')} (${jsDate2.toISOString()})`);
    console.log(`   - new Date('${testDate}T12:00:00'): ${jsDate3.toLocaleDateString('es-NI')} (${jsDate3.toISOString()})`);

    // 7. Verificar diferencias de zona horaria
    console.log('\n7. 🌍 Análisis de Zona Horaria:');
    const now = new Date();
    const utcOffset = now.getTimezoneOffset();
    const localTime = now.toLocaleString('es-NI');
    const utcTime = now.toUTCString();
    
    console.log(`   - Offset UTC: ${utcOffset} minutos`);
    console.log(`   - Hora local: ${localTime}`);
    console.log(`   - Hora UTC: ${utcTime}`);
    console.log(`   - Zona horaria detectada: ${Intl.DateTimeFormat().resolvedOptions().timeZone}`);

    // 8. Recomendaciones
    console.log('\n8. 💡 Recomendaciones:');
    console.log('   ✅ Siempre usar fechas en formato ISO (YYYY-MM-DD) para almacenar');
    console.log('   ✅ Agregar "T00:00:00" al crear objetos Date para fechas sin hora');
    console.log('   ✅ Usar date-fns o similar para manipulación consistente de fechas');
    console.log('   ✅ Verificar que el servidor MySQL esté en UTC o zona horaria correcta');
    console.log('   ⚠️  Evitar new Date(string) sin especificar hora para fechas');
    
    if (utcOffset !== -360) { // Nicaragua es UTC-6 (-360 minutos)
      console.log('   ⚠️  ADVERTENCIA: La zona horaria del cliente no parece ser Nicaragua (UTC-6)');
    }

    console.log('\n🎉 Diagnóstico completado!');
    console.log('\nSi encuentras fechas incorrectas:');
    console.log('1. Verifica que las fechas se guarden como DATE (no DATETIME) para fechas sin hora');
    console.log('2. Al crear Date objects, usa: new Date(dateString + "T00:00:00")');
    console.log('3. Para mostrar fechas, usa: date.toLocaleDateString("es-NI")');

  } catch (error) {
    console.error('❌ Error durante el diagnóstico:', error.message);
  } finally {
    await connection.end();
  }
}

// Ejecutar solo si se llama directamente
if (require.main === module) {
  diagnoseDates().catch(console.error);
}

module.exports = { diagnoseDates };