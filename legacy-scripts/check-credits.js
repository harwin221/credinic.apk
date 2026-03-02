const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env' });

async function check() {
    const dbConfig = {
        host: process.env.NEW_DB_HOST,
        user: process.env.NEW_DB_USER,
        password: process.env.NEW_DB_PASSWORD,
        database: process.env.NEW_DB_DATABASE,
    };

    try {
        const conn = await mysql.createConnection(dbConfig);
        const [rows] = await conn.execute("SELECT COUNT(*) as count FROM credits");
        console.log("CREDITS COUNT:", rows[0].count);
        const [sample] = await conn.execute("SELECT * FROM credits LIMIT 1");
        console.log("CREDITS SAMPLE:", sample[0]);
        await conn.end();
    } catch (e) {
        console.error("DEBUG ERROR:", e);
    }
}

check();
