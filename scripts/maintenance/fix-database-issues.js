const mysql = require('mysql2/promise');
require('dotenv').config();

async function fixDatabaseIssues() {
  const connection = await mysql.createConnection({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    ssl: process.env.MYSQL_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
  });

  try {
    console.log('🔧 Reparando problemas de base de datos...\n');

    // 1. Asegurar que existe la sucursal principal
    console.log('1. Verificando sucursal principal...');
    const [existingSucursal] = await connection.execute(`
      SELECT id FROM sucursales WHERE id = 'suc_1761721008127'
    `);
    
    if (existingSucursal.length === 0) {
      await connection.execute(`
        INSERT INTO sucursales (id, name, managerId, managerName) 
        VALUES ('suc_1761721008127', 'SUCURSAL PRINCIPAL', 'user_admin_01', 'ADMINISTRADOR DEL SISTEMA')
      `);
      console.log('✅ Sucursal principal creada');
    } else {
      console.log('✅ Sucursal principal ya existe');
    }

    // 2. Verificar usuarios con sucursal_id NULL (esto es normal para ADMIN y FINANZAS)
    console.log('\n2. Verificando usuarios con acceso a todas las sucursales...');
    const [usersWithAllBranches] = await connection.execute(`
      SELECT id, fullName, role, sucursal_id, sucursal_name 
      FROM users 
      WHERE sucursal_id IS NULL
    `);

    if (usersWithAllBranches.length > 0) {
      console.log(`   Encontrados ${usersWithAllBranches.length} usuarios con acceso global:`);
      usersWithAllBranches.forEach(user => {
        console.log(`   - ${user.fullName} (${user.role}) -> sucursal_name: ${user.sucursal_name}`);
      });

      // Asegurar que usuarios ADMINISTRADOR y FINANZAS tengan sucursal_name = 'TODAS'
      await connection.execute(`
        UPDATE users 
        SET sucursal_name = 'TODAS' 
        WHERE sucursal_id IS NULL AND role IN ('ADMINISTRADOR', 'FINANZAS') AND sucursal_name != 'TODAS'
      `);
      
      // Para otros roles que no deberían tener sucursal_id NULL, asignarles una sucursal
      const [otherRolesWithNull] = await connection.execute(`
        SELECT id, fullName, role 
        FROM users 
        WHERE sucursal_id IS NULL AND role NOT IN ('ADMINISTRADOR', 'FINANZAS')
      `);
      
      if (otherRolesWithNull.length > 0) {
        console.log(`   ⚠️  Usuarios que necesitan sucursal específica:`);
        otherRolesWithNull.forEach(user => {
          console.log(`     - ${user.fullName} (${user.role})`);
        });
        
        await connection.execute(`
          UPDATE users 
          SET sucursal_id = 'suc_1761721008127', sucursal_name = 'SUCURSAL PRINCIPAL' 
          WHERE sucursal_id IS NULL AND role NOT IN ('ADMINISTRADOR', 'FINANZAS')
        `);
        console.log('   ✅ Usuarios asignados a sucursal específica');
      }
      
      console.log('✅ Configuración de sucursales verificada');
    } else {
      console.log('✅ No hay usuarios con acceso global');
    }

    // 3. Actualizar clientes con sucursal_id NULL
    console.log('\n3. Actualizando clientes sin sucursal asignada...');
    const [clientsWithoutBranch] = await connection.execute(`
      SELECT id, name, sucursal_id FROM clients WHERE sucursal_id IS NULL
    `);

    if (clientsWithoutBranch.length > 0) {
      console.log(`   Encontrados ${clientsWithoutBranch.length} clientes sin sucursal:`);
      clientsWithoutBranch.forEach(client => {
        console.log(`   - ${client.name} (ID: ${client.id})`);
      });

      // Asignar sucursal principal a clientes sin sucursal
      await connection.execute(`
        UPDATE clients 
        SET sucursal_id = 'suc_1761721008127', sucursal_name = 'SUCURSAL PRINCIPAL' 
        WHERE sucursal_id IS NULL
      `);
      console.log('✅ Clientes asignados a SUCURSAL PRINCIPAL');
    } else {
      console.log('✅ Todos los clientes tienen sucursal asignada');
    }

    // 4. Verificar y limpiar supervisor_id inválidos
    console.log('\n4. Verificando referencias de supervisores...');
    const [invalidSupervisors] = await connection.execute(`
      SELECT u1.id, u1.fullName, u1.supervisor_id 
      FROM users u1 
      LEFT JOIN users u2 ON u1.supervisor_id = u2.id 
      WHERE u1.supervisor_id IS NOT NULL AND u2.id IS NULL
    `);

    if (invalidSupervisors.length > 0) {
      console.log(`   Encontrados ${invalidSupervisors.length} usuarios con supervisor inválido:`);
      invalidSupervisors.forEach(user => {
        console.log(`   - ${user.fullName} -> supervisor_id: ${user.supervisor_id}`);
      });

      // Limpiar supervisor_id inválidos
      await connection.execute(`
        UPDATE users u1 
        LEFT JOIN users u2 ON u1.supervisor_id = u2.id 
        SET u1.supervisor_id = NULL, u1.supervisor_name = NULL 
        WHERE u1.supervisor_id IS NOT NULL AND u2.id IS NULL
      `);
      console.log('✅ Referencias de supervisores inválidas limpiadas');
    } else {
      console.log('✅ Todas las referencias de supervisores son válidas');
    }

    // 5. Mostrar resumen final
    console.log('\n📊 Resumen final:');
    const [userCount] = await connection.execute('SELECT COUNT(*) as count FROM users');
    const [clientCount] = await connection.execute('SELECT COUNT(*) as count FROM clients');
    const [branchCount] = await connection.execute('SELECT COUNT(*) as count FROM sucursales');
    
    console.log(`   - Usuarios: ${userCount[0].count}`);
    console.log(`   - Clientes: ${clientCount[0].count}`);
    console.log(`   - Sucursales: ${branchCount[0].count}`);

    console.log('\n🎉 ¡Reparación completada exitosamente!');
    console.log('Tu base de datos ahora debería funcionar sin errores de foreign key.');

  } catch (error) {
    console.error('❌ Error durante la reparación:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    await connection.end();
  }
}

// Ejecutar solo si se llama directamente
if (require.main === module) {
  fixDatabaseIssues().catch(console.error);
}

module.exports = { fixDatabaseIssues };