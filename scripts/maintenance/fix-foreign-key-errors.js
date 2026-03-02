const mysql = require('mysql2/promise');
require('dotenv').config();

async function fixForeignKeyErrors() {
    const connection = await mysql.createConnection({
        host: process.env.MYSQL_HOST,
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DATABASE,
        ssl: process.env.MYSQL_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
    });

    try {
        console.log('🔍 Diagnosticando problemas de foreign keys...\n');

        // 1. Verificar usuarios con supervisor_id inválido
        console.log('1. Verificando usuarios con supervisor_id inválido...');
        const [invalidSupervisors] = await connection.execute(`
      SELECT u1.id, u1.fullName, u1.supervisor_id 
      FROM users u1 
      LEFT JOIN users u2 ON u1.supervisor_id = u2.id 
      WHERE u1.supervisor_id IS NOT NULL AND u2.id IS NULL
    `);

        if (invalidSupervisors.length > 0) {
            console.log(`❌ Encontrados ${invalidSupervisors.length} usuarios con supervisor_id inválido:`);
            invalidSupervisors.forEach(user => {
                console.log(`   - Usuario: ${user.fullName} (ID: ${user.id}) -> supervisor_id: ${user.supervisor_id}`);
            });

            // Limpiar supervisor_id inválidos
            await connection.execute(`
        UPDATE users u1 
        LEFT JOIN users u2 ON u1.supervisor_id = u2.id 
        SET u1.supervisor_id = NULL, u1.supervisor_name = NULL 
        WHERE u1.supervisor_id IS NOT NULL AND u2.id IS NULL
      `);
            console.log('✅ Supervisor IDs inválidos limpiados\n');
        } else {
            console.log('✅ No se encontraron supervisor_id inválidos\n');
        }

        // 2. Verificar usuarios con sucursal_id inválido
        console.log('2. Verificando usuarios con sucursal_id inválido...');
        const [invalidBranches] = await connection.execute(`
      SELECT u.id, u.fullName, u.sucursal_id 
      FROM users u 
      LEFT JOIN sucursales s ON u.sucursal_id = s.id 
      WHERE u.sucursal_id IS NOT NULL AND s.id IS NULL
    `);

        if (invalidBranches.length > 0) {
            console.log(`❌ Encontrados ${invalidBranches.length} usuarios con sucursal_id inválido:`);
            invalidBranches.forEach(user => {
                console.log(`   - Usuario: ${user.fullName} (ID: ${user.id}) -> sucursal_id: ${user.sucursal_id}`);
            });

            // Crear sucursal principal si no existe
            await connection.execute(`
        INSERT IGNORE INTO sucursales (id, name) VALUES ('suc_main', 'SUCURSAL PRINCIPAL')
      `);

            // Asignar usuarios a sucursal principal
            await connection.execute(`
        UPDATE users u 
        LEFT JOIN sucursales s ON u.sucursal_id = s.id 
        SET u.sucursal_id = 'suc_main', u.sucursal_name = 'SUCURSAL PRINCIPAL' 
        WHERE u.sucursal_id IS NOT NULL AND s.id IS NULL
      `);
            console.log('✅ Usuarios asignados a SUCURSAL PRINCIPAL\n');
        } else {
            console.log('✅ No se encontraron sucursal_id inválidos\n');
        }

        // 3. Verificar si existe la columna created_by_id en clients
        console.log('3. Verificando estructura de tabla clients...');
        try {
            const [columns] = await connection.execute(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'clients' AND COLUMN_NAME = 'created_by_id'
      `);

            if (columns.length > 0) {
                console.log('   - Columna created_by_id encontrada, verificando referencias...');
                const [invalidCreatedBy] = await connection.execute(`
          SELECT c.id, c.name, c.created_by_id 
          FROM clients c 
          LEFT JOIN users u ON c.created_by_id = u.id 
          WHERE c.created_by_id IS NOT NULL AND u.id IS NULL
        `);

                if (invalidCreatedBy.length > 0) {
                    console.log(`❌ Encontrados ${invalidCreatedBy.length} clientes con created_by_id inválido:`);
                    invalidCreatedBy.forEach(client => {
                        console.log(`   - Cliente: ${client.name} (ID: ${client.id}) -> created_by_id: ${client.created_by_id}`);
                    });

                    // Limpiar created_by_id inválidos
                    await connection.execute(`
            UPDATE clients c 
            LEFT JOIN users u ON c.created_by_id = u.id 
            SET c.created_by_id = NULL 
            WHERE c.created_by_id IS NOT NULL AND u.id IS NULL
          `);
                    console.log('✅ created_by_id inválidos limpiados\n');
                } else {
                    console.log('✅ No se encontraron created_by_id inválidos\n');
                }
            } else {
                console.log('✅ Columna created_by_id no existe en la tabla clients\n');
            }
        } catch (error) {
            console.log('⚠️  Error verificando columna created_by_id, continuando...\n');
        }

        // 4. Verificar clientes con sucursal_id inválido
        console.log('4. Verificando clientes con sucursal_id inválido...');
        const [invalidClientBranches] = await connection.execute(`
      SELECT c.id, c.name, c.sucursal_id 
      FROM clients c 
      LEFT JOIN sucursales s ON c.sucursal_id = s.id 
      WHERE c.sucursal_id IS NOT NULL AND s.id IS NULL
    `);

        if (invalidClientBranches.length > 0) {
            console.log(`❌ Encontrados ${invalidClientBranches.length} clientes con sucursal_id inválido:`);
            invalidClientBranches.forEach(client => {
                console.log(`   - Cliente: ${client.name} (ID: ${client.id}) -> sucursal_id: ${client.sucursal_id}`);
            });

            // Asignar clientes a sucursal principal
            await connection.execute(`
        UPDATE clients c 
        LEFT JOIN sucursales s ON c.sucursal_id = s.id 
        SET c.sucursal_id = 'suc_main', c.sucursal_name = 'SUCURSAL PRINCIPAL' 
        WHERE c.sucursal_id IS NOT NULL AND s.id IS NULL
      `);
            console.log('✅ Clientes asignados a SUCURSAL PRINCIPAL\n');
        } else {
            console.log('✅ No se encontraron clientes con sucursal_id inválidos\n');
        }

        // 5. Mostrar resumen de sucursales
        console.log('5. Resumen de sucursales disponibles:');
        const [branches] = await connection.execute('SELECT id, name FROM sucursales ORDER BY name');
        if (branches.length === 0) {
            console.log('❌ No hay sucursales en la base de datos. Creando sucursal principal...');
            await connection.execute(`
        INSERT INTO sucursales (id, name) VALUES ('suc_main', 'SUCURSAL PRINCIPAL')
      `);
            console.log('✅ Sucursal principal creada');
        } else {
            branches.forEach(branch => {
                console.log(`   - ${branch.name} (ID: ${branch.id})`);
            });
        }

        console.log('\n🎉 Diagnóstico y reparación completados!');
        console.log('Ahora puedes intentar ejecutar tu aplicación nuevamente.');

    } catch (error) {
        console.error('❌ Error durante la reparación:', error.message);
    } finally {
        await connection.end();
    }
}

// Ejecutar solo si se llama directamente
if (require.main === module) {
    fixForeignKeyErrors().catch(console.error);
}

module.exports = { fixForeignKeyErrors };