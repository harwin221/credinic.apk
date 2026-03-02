const mysql = require('mysql2/promise');
require('dotenv').config();

async function addManualEditFlag() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306
  });

  try {
    console.log('🔧 Agregando campo manuallyEdited a la tabla payment_plan...');

    // Agregar campo manuallyEdited a payment_plan
    await connection.execute(`
      ALTER TABLE payment_plan 
      ADD COLUMN manuallyEdited BOOLEAN DEFAULT FALSE
    `);

    console.log('✅ Campo manuallyEdited agregado exitosamente');

    // Agregar campo manuallyEditedBy para auditoría
    await connection.execute(`
      ALTER TABLE payment_plan 
      ADD COLUMN manuallyEditedBy VARCHAR(255) NULL
    `);

    console.log('✅ Campo manuallyEditedBy agregado exitosamente');

    // Agregar campo manuallyEditedAt para timestamp
    await connection.execute(`
      ALTER TABLE payment_plan 
      ADD COLUMN manuallyEditedAt DATETIME NULL
    `);

    console.log('✅ Campo manuallyEditedAt agregado exitosamente');

    console.log('🎉 Migración completada. Los planes de pago ahora pueden marcarse como editados manualmente.');

  } catch (error) {
    console.error('❌ Error en la migración:', error);
  } finally {
    await connection.end();
  }
}

addManualEditFlag();