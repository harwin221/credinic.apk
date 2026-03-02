const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkCounters() {
  console.log('🔍 VERIFICANDO ESTRUCTURA DE COUNTERS...');
  
  const connection = await mysql.createConnection({
    host: process.env.NEW_DB_HOST,
    user: process.env.NEW_DB_USER,
    password: process.env.NEW_DB_PASSWORD,
    database: process.env.NEW_DB_DATABASE
  });

  try {
    // Ver estructura de la tabla
    const [structure] = await connection.execute('DESCRIBE counters');
    console.log('📋 Estructura de tabla counters:');
    structure.forEach(col => {
      console.log(`   ${col.Field}: ${col.Type}`);
    });

    // Ver contenido actual
    const [counters] = await connection.execute('SELECT * FROM counters');
    console.log('\n📊 Contenido actual:');
    counters.forEach(counter => {
      console.log(`   ${JSON.stringify(counter)}`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await connection.end();
  }
}

checkCounters();