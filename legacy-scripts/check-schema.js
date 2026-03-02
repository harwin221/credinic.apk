const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env' });

async function check() {
    const oldDbConfig = {
        host: process.env.OLD_DB_HOST,
        user: process.env.OLD_DB_USER,
        password: process.env.OLD_DB_PASSWORD,
        database: process.env.OLD_DB_DATABASE,
    };
    const newDbConfig = {
        host: process.env.NEW_DB_HOST,
        user: process.env.NEW_DB_USER,
        password: process.env.NEW_DB_PASSWORD,
        database: process.env.NEW_DB_DATABASE,
    };

    try {
        const oldConn = await mysql.createConnection(oldDbConfig);
        const [oldCols] = await oldConn.execute("SHOW COLUMNS FROM abonos");
        console.log("OLD ABONOS COLUMNS:", oldCols.map(c => c.Field));
        const [sample] = await oldConn.execute("SELECT * FROM abonos LIMIT 1");
        console.log("OLD ABONOS SAMPLE:", sample[0]);
        await oldConn.end();

        const newConn = await mysql.createConnection(newDbConfig);
        const [newCols] = await newConn.execute("SHOW COLUMNS FROM payments_registered");
        console.log("NEW PAYMENTS_REGISTERED COLUMNS:", newCols.map(c => c.Field));
        await newConn.end();
    } catch (e) {
        console.error(e);
    }
}

check();
