const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env' });

async function check() {
    const oldDbConfig = {
        host: process.env.OLD_DB_HOST,
        user: process.env.OLD_DB_USER,
        password: process.env.OLD_DB_PASSWORD,
        database: process.env.OLD_DB_DATABASE,
    };
    try {
        const oldConn = await mysql.createConnection(oldDbConfig);
        const [oldCols] = await oldConn.execute("SHOW COLUMNS FROM prestamos");
        console.log("OLD PRESTAMOS COLUMNS:", oldCols.map(c => c.Field));
        await oldConn.end();
    } catch (e) {
        console.error(e);
    }
}
check();
