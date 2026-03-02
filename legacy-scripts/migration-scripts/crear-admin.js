// CREAR/RESETEAR USUARIO ADMINISTRADOR
require('dotenv').config({ path: '.env' });
const mysql = require('mysql2/promise');

const newDbConfig = {
    host: process.env.NEW_DB_HOST,
    user: process.env.NEW_DB_USER,
    password: process.env.NEW_DB_PASSWORD,
    database: process.env.NEW_DB_DATABASE,
    charset: 'utf8mb4'
};

async function crearAdmin() {
    console.log('🔐 CREANDO/RESETEANDO USUARIO ADMINISTRADOR');
    
    try {
        const connection = await mysql.createConnection(newDbConfig);
        
        // Datos del admin
        const adminData = {
            username: 'admin',
            email: 'admin@credinica.com',
            fullName: 'Administrador Sistema',
            password: 'Leon123',
            // Hash real para Leon123 generado con bcrypt
            hashedPassword: '$2a$10$2OcJvsdZEdaa18cWK7Aa5OtVmZ.VLj47c3p34flLqAilDFYP82Zu.',
            phone: '8888-8888',
            role: 'ADMINISTRADOR'
        };
        
        // Verificar si ya existe un admin
        const [existingAdmin] = await connection.execute(
            'SELECT id, email FROM users WHERE role = "ADMINISTRADOR" LIMIT 1'
        );
        
        if (existingAdmin.length > 0) {
            // Actualizar admin existente
            await connection.execute(
                'UPDATE users SET username = ?, email = ?, fullName = ?, hashed_password = ?, phone = ? WHERE role = "ADMINISTRADOR"',
                [adminData.username, adminData.email, adminData.fullName, adminData.hashedPassword, adminData.phone]
            );
            
            console.log('✅ Usuario administrador actualizado:');
            console.log(`   👤 Username: ${adminData.username}`);
            console.log(`   📧 Email: ${adminData.email}`);
            console.log(`   🔑 Contraseña: ${adminData.password}`);
            console.log(`   📝 Nombre: ${adminData.fullName}`);
            console.log(`   📞 Teléfono: ${adminData.phone}`);
            
        } else {
            // Crear nuevo admin
            const adminId = 'user_admin_001';
            
            await connection.execute(
                'INSERT INTO users (id, username, fullName, email, hashed_password, phone, role, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())',
                [adminId, adminData.username, adminData.fullName, adminData.email, adminData.hashedPassword, adminData.phone, adminData.role]
            );
            
            console.log('✅ Usuario administrador creado:');
            console.log(`   🆔 ID: ${adminId}`);
            console.log(`   👤 Username: ${adminData.username}`);
            console.log(`   📧 Email: ${adminData.email}`);
            console.log(`   🔑 Contraseña: ${adminData.password}`);
            console.log(`   📝 Nombre: ${adminData.fullName}`);
            console.log(`   📞 Teléfono: ${adminData.phone}`);
        }
        
        // Verificar resultado
        const [adminCheck] = await connection.execute(
            'SELECT id, username, email, fullName, phone, role FROM users WHERE role = "ADMINISTRADOR"'
        );
        
        console.log('\n📋 USUARIOS ADMINISTRADOR EN SISTEMA:');
        adminCheck.forEach(admin => {
            console.log(`   ${admin.id} | ${admin.username} | ${admin.email} | ${admin.fullName} | ${admin.phone} | ${admin.role}`);
        });
        
        await connection.end();
        console.log('\n🎉 PROCESO COMPLETADO');
        console.log('\n⚠️  NOTA: Cambiar contraseña desde la aplicación para mayor seguridad');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

crearAdmin();