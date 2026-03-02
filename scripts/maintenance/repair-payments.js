const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env' });

async function repair() {
    console.log("🛠️ Iniciando reparación de datos de pagos...");

    const dbConfig = {
        host: process.env.NEW_DB_HOST,
        user: process.env.NEW_DB_USER,
        password: process.env.NEW_DB_PASSWORD,
        database: process.env.NEW_DB_DATABASE,
    };

    try {
        const conn = await mysql.createConnection(dbConfig);

        // 1. Obtener mapa de nombres de usuario
        console.log("  🔍 Obteniendo nombres de usuarios...");
        const [users] = await conn.execute("SELECT id, fullName FROM users");

        // 2. Actualizar managedBy por cada usuario
        console.log("  ✍️ Actualizando gestores...");
        for (const user of users) {
            const [result] = await conn.execute(
                "UPDATE payments_registered SET managedBy = ? WHERE managedBy = ?",
                [user.fullName, user.id]
            );
            if (result.affectedRows > 0) {
                console.log(`    ✅ Actualizados ${result.affectedRows} pagos para el gestor: ${user.fullName}`);
            }
        }

        // 3. Actualizar números de transacción si están vacíos
        console.log("  ✍️ Generando números de transacción...");
        const [txResult] = await conn.execute(
            "UPDATE payments_registered SET transactionNumber = CONCAT('REC-', LPAD(legacyId, 6, '0')) WHERE transactionNumber IS NULL OR transactionNumber = ''"
        );
        console.log(`    ✅ Se generaron ${txResult.affectedRows} números de transacción.`);

        await conn.end();
        console.log("🎉 Reparación completada correctamente.");
    } catch (e) {
        console.error("❌ Error durante la reparación:", e);
    }
}

repair();
