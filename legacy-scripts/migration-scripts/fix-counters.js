const mysql = require('mysql2/promise');
require('dotenv').config();

async function fixCounters() {
  console.log('🔧 CORRIGIENDO CONTADORES...');
  
  const connection = await mysql.createConnection({
    host: process.env.NEW_DB_HOST,
    user: process.env.NEW_DB_USER,
    password: process.env.NEW_DB_PASSWORD,
    database: process.env.NEW_DB_DATABASE
  });

  try {
    // Obtener el máximo número de crédito actual
    const [maxCredit] = await connection.execute('SELECT MAX(CAST(SUBSTRING(creditNumber, 5) AS UNSIGNED)) as maxNum FROM credits');
    const maxCreditNum = maxCredit[0].maxNum || 0;

    // Obtener el máximo número de cliente actual  
    const [maxClient] = await connection.execute('SELECT MAX(CAST(SUBSTRING(clientNumber, 5) AS UNSIGNED)) as maxNum FROM clients');
    const maxClientNum = maxClient[0].maxNum || 0;

    // Obtener el máximo número de recibo actual
    const [maxReceipt] = await connection.execute('SELECT MAX(CAST(SUBSTRING(transactionNumber, 5) AS UNSIGNED)) as maxNum FROM payments_registered WHERE transactionNumber LIKE "PAY-%"');
    const maxReceiptNum = maxReceipt[0].maxNum || 0;

    console.log('📊 Números máximos encontrados:');
    console.log('   Créditos:', maxCreditNum);
    console.log('   Clientes:', maxClientNum);
    console.log('   Recibos:', maxReceiptNum);

    // Actualizar contadores (la tabla tiene una sola fila con id="main")
    await connection.execute('UPDATE counters SET creditNumber = ?, clientNumber = ?, reciboNumber = ? WHERE id = "main"', [maxCreditNum, maxClientNum, maxReceiptNum]);

    // Verificar actualización
    const [counters] = await connection.execute('SELECT * FROM counters');
    
    console.log('✅ Contadores actualizados exitosamente:');
    counters.forEach(counter => {
      console.log(`   creditNumber: ${counter.creditNumber}`);
      console.log(`   clientNumber: ${counter.clientNumber}`);
      console.log(`   reciboNumber: ${counter.reciboNumber}`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await connection.end();
  }
}

fixCounters();