
const mysql = require('mysql2/promise');
require('dotenv').config();

async function run() {
    const connection = await mysql.createConnection({
        host: process.env.MYSQL_HOST || process.env.DB_HOST || 'localhost',
        user: process.env.MYSQL_USER || process.env.DB_USERNAME || 'root',
        password: process.env.MYSQL_PASSWORD || process.env.DB_PASSWORD || '',
        database: process.env.MYSQL_DATABASE || process.env.DB_DATABASE || 'credinicam_db',
    });

    try {
        console.log('Verificando columna ipAddress en audit_logs...');
        const [columns] = await connection.execute('SHOW COLUMNS FROM audit_logs LIKE "ipAddress"');

        if (columns.length === 0) {
            console.log('Agregando columna ipAddress a audit_logs...');
            await connection.execute('ALTER TABLE audit_logs ADD COLUMN ipAddress VARCHAR(45) AFTER userName');
            console.log('Columna agregada exitosamente.');
        } else {
            console.log('La columna ipAddress ya existe.');
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await connection.end();
    }
}

run();
