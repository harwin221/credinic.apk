const mysql = require('mysql2/promise');
require('dotenv').config();

async function fixDateIssues() {
  const connection = await mysql.createConnection({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    ssl: process.env.MYSQL_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
  });

  try {
    console.log('🔧 Reparando Problemas de Fechas\n');
    console.log('='.repeat(40));

    // 1. Verificar y corregir fechas NULL o inválidas en créditos
    console.log('\n1. 🔍 Verificando fechas en créditos...');
    
    const [invalidDates] = await connection.execute(`
      SELECT 
        id, 
        creditNumber, 
        clientName,
        applicationDate,
        firstPaymentDate,
        dueDate
      FROM credits 
      WHERE 
        applicationDate IS NULL 
        OR firstPaymentDate IS NULL 
        OR dueDate IS NULL
        OR applicationDate = '0000-00-00'
        OR firstPaymentDate = '0000-00-00'
        OR dueDate = '0000-00-00'
    `);

    if (invalidDates.length > 0) {
      console.log(`   ❌ Encontrados ${invalidDates.length} créditos con fechas inválidas:`);
      invalidDates.forEach(credit => {
        console.log(`      - ${credit.creditNumber}: ${credit.clientName}`);
        console.log(`        Aplicación: ${credit.applicationDate}`);
        console.log(`        Primer pago: ${credit.firstPaymentDate}`);
        console.log(`        Vencimiento: ${credit.dueDate}`);
      });
      
      console.log('\n   🔧 Corrigiendo fechas inválidas...');
      // Corregir fechas usando la fecha actual como base
      await connection.execute(`
        UPDATE credits 
        SET 
          applicationDate = COALESCE(NULLIF(applicationDate, '0000-00-00'), CURDATE()),
          firstPaymentDate = COALESCE(NULLIF(firstPaymentDate, '0000-00-00'), DATE_ADD(CURDATE(), INTERVAL 7 DAY)),
          dueDate = COALESCE(NULLIF(dueDate, '0000-00-00'), DATE_ADD(CURDATE(), INTERVAL 1 YEAR))
        WHERE 
          applicationDate IS NULL 
          OR firstPaymentDate IS NULL 
          OR dueDate IS NULL
          OR applicationDate = '0000-00-00'
          OR firstPaymentDate = '0000-00-00'
          OR dueDate = '0000-00-00'
      `);
      console.log('   ✅ Fechas corregidas');
    } else {
      console.log('   ✅ No se encontraron fechas inválidas en créditos');
    }

    // 2. Verificar fechas en plan de pagos
    console.log('\n2. 📅 Verificando fechas en plan de pagos...');
    
    const [invalidPaymentDates] = await connection.execute(`
      SELECT COUNT(*) as count
      FROM payment_plan 
      WHERE 
        paymentDate IS NULL 
        OR paymentDate = '0000-00-00'
    `);

    if (invalidPaymentDates[0].count > 0) {
      console.log(`   ❌ Encontradas ${invalidPaymentDates[0].count} fechas inválidas en plan de pagos`);
      console.log('   🔧 Eliminando registros con fechas inválidas...');
      
      await connection.execute(`
        DELETE FROM payment_plan 
        WHERE 
          paymentDate IS NULL 
          OR paymentDate = '0000-00-00'
      `);
      console.log('   ✅ Registros con fechas inválidas eliminados');
    } else {
      console.log('   ✅ No se encontraron fechas inválidas en plan de pagos');
    }

    // 3. Verificar fechas en pagos registrados
    console.log('\n3. 💸 Verificando fechas en pagos registrados...');
    
    const [invalidRegisteredPayments] = await connection.execute(`
      SELECT COUNT(*) as count
      FROM payments_registered 
      WHERE 
        paymentDate IS NULL
    `);

    if (invalidRegisteredPayments[0].count > 0) {
      console.log(`   ❌ Encontradas ${invalidRegisteredPayments[0].count} fechas inválidas en pagos`);
      console.log('   🔧 Corrigiendo fechas de pagos...');
      
      await connection.execute(`
        UPDATE payments_registered 
        SET paymentDate = NOW()
        WHERE paymentDate IS NULL
      `);
      console.log('   ✅ Fechas de pagos corregidas');
    } else {
      console.log('   ✅ No se encontraron fechas inválidas en pagos registrados');
    }

    // 4. Optimizar zona horaria de la sesión
    console.log('\n4. 🌍 Configurando zona horaria...');
    
    try {
      // Configurar zona horaria para Nicaragua (UTC-6)
      await connection.execute("SET time_zone = '-06:00'");
      console.log('   ✅ Zona horaria configurada a UTC-6 (Nicaragua)');
    } catch (error) {
      console.log('   ⚠️  No se pudo configurar zona horaria automáticamente');
    }

    // 5. Verificar consistencia de fechas
    console.log('\n5. 🔍 Verificando consistencia de fechas...');
    
    const [inconsistentDates] = await connection.execute(`
      SELECT 
        id,
        creditNumber,
        clientName,
        applicationDate,
        approvalDate,
        deliveryDate,
        firstPaymentDate,
        dueDate
      FROM credits 
      WHERE 
        (approvalDate IS NOT NULL AND approvalDate < applicationDate)
        OR (deliveryDate IS NOT NULL AND deliveryDate < approvalDate)
        OR (firstPaymentDate < applicationDate)
        OR (dueDate < applicationDate)
      LIMIT 10
    `);

    if (inconsistentDates.length > 0) {
      console.log(`   ⚠️  Encontrados ${inconsistentDates.length} créditos con fechas inconsistentes:`);
      inconsistentDates.forEach(credit => {
        console.log(`      - ${credit.creditNumber}: ${credit.clientName}`);
        console.log(`        Aplicación: ${credit.applicationDate}`);
        console.log(`        Aprobación: ${credit.approvalDate}`);
        console.log(`        Entrega: ${credit.deliveryDate}`);
        console.log(`        Primer pago: ${credit.firstPaymentDate}`);
        console.log(`        Vencimiento: ${credit.dueDate}`);
        console.log('');
      });
    } else {
      console.log('   ✅ No se encontraron fechas inconsistentes');
    }

    // 6. Generar reporte de fechas próximas
    console.log('\n6. 📊 Reporte de fechas próximas...');
    
    const [upcomingPayments] = await connection.execute(`
      SELECT 
        c.creditNumber,
        c.clientName,
        pp.paymentDate,
        pp.amount,
        DATEDIFF(pp.paymentDate, CURDATE()) as days_until
      FROM payment_plan pp
      JOIN credits c ON pp.creditId = c.id
      WHERE c.status = 'Active'
        AND pp.paymentDate BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)
      ORDER BY pp.paymentDate
      LIMIT 10
    `);

    if (upcomingPayments.length > 0) {
      console.log('   📅 Próximos pagos (próximos 7 días):');
      upcomingPayments.forEach(payment => {
        console.log(`      - ${payment.creditNumber} (${payment.clientName})`);
        console.log(`        Fecha: ${payment.paymentDate} (en ${payment.days_until} días)`);
        console.log(`        Monto: C$${payment.amount}`);
      });
    } else {
      console.log('   ✅ No hay pagos próximos en los siguientes 7 días');
    }

    // 7. Consejos finales
    console.log('\n7. 💡 Consejos para evitar problemas de fechas:');
    console.log('   ✅ En JavaScript: usar new Date(dateString + "T00:00:00") para fechas');
    console.log('   ✅ En MySQL: usar tipo DATE para fechas sin hora, DATETIME para fechas con hora');
    console.log('   ✅ Siempre validar fechas antes de guardar en base de datos');
    console.log('   ✅ Usar bibliotecas como date-fns para manipulación de fechas');
    console.log('   ✅ Configurar zona horaria consistente en servidor y cliente');

    console.log('\n🎉 Reparación de fechas completada!');

  } catch (error) {
    console.error('❌ Error durante la reparación:', error.message);
  } finally {
    await connection.end();
  }
}

// Ejecutar solo si se llama directamente
if (require.main === module) {
  fixDateIssues().catch(console.error);
}

module.exports = { fixDateIssues };