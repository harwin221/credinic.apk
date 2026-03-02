const mysql = require('mysql2/promise');
require('dotenv').config();

async function fixNullAmounts() {
  console.log('🔧 CORRIGIENDO MONTOS NULL EN CRÉDITOS...');
  
  const connection = await mysql.createConnection({
    host: process.env.NEW_DB_HOST,
    user: process.env.NEW_DB_USER,
    password: process.env.NEW_DB_PASSWORD,
    database: process.env.NEW_DB_DATABASE
  });

  try {
    // Buscar créditos con amount NULL
    const [nullAmounts] = await connection.execute('SELECT id, creditNumber, principalAmount FROM credits WHERE amount IS NULL');
    
    console.log(`📊 Encontrados ${nullAmounts.length} créditos con amount NULL`);
    
    if (nullAmounts.length > 0) {
      console.log('🔄 Corrigiendo montos...');
      
      for (const credit of nullAmounts) {
        // Usar principalAmount como amount si está disponible
        if (credit.principalAmount) {
          await connection.execute(
            'UPDATE credits SET amount = ? WHERE id = ?', 
            [credit.principalAmount, credit.id]
          );
          console.log(`   ✅ ${credit.creditNumber}: ${credit.principalAmount}`);
        } else {
          console.log(`   ⚠️  ${credit.creditNumber}: Sin principalAmount disponible`);
        }
      }
    }

    // Verificar resultado
    const [stillNull] = await connection.execute('SELECT COUNT(*) as count FROM credits WHERE amount IS NULL');
    console.log(`\n📊 Créditos con amount NULL restantes: ${stillNull[0].count}`);

    // Mostrar algunos ejemplos corregidos
    const [examples] = await connection.execute('SELECT creditNumber, amount, principalAmount FROM credits WHERE amount IS NOT NULL LIMIT 5');
    console.log('\n📋 Ejemplos corregidos:');
    examples.forEach(ex => {
      console.log(`   ${ex.creditNumber}: amount=${ex.amount}, principal=${ex.principalAmount}`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await connection.end();
  }
}

fixNullAmounts();