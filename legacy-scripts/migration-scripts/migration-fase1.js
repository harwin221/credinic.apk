// MIGRACIÓN FASE 1: USUARIOS Y CLIENTES
require('dotenv').config({ path: '.env' });
const mysql = require('mysql2/promise');

// --- CONFIGURACIÓN ---
const SIMULATION_MODE = false;

// --- GENERADORES DE ID BONITOS ---
let clientCounter = 1;
let userCounter = 1;
let clientNumberSequence = 1;

const generateClientId = () => `cli_${String(clientCounter++).padStart(3, '0')}`;
const generateUserId = () => `user_${String(userCounter++).padStart(3, '0')}`;
const generateClientNumber = () => `CLI-${String(clientNumberSequence++).padStart(4, '0')}`;

// --- CONFIGURACIÓN DE CONEXIONES ---
const oldDbConfig = {
    host: process.env.OLD_DB_HOST,
    user: process.env.OLD_DB_USER,
    password: process.env.OLD_DB_PASSWORD,
    database: process.env.OLD_DB_DATABASE,
    charset: 'utf8mb4'
};

const newDbConfig = {
    host: process.env.NEW_DB_HOST,
    user: process.env.NEW_DB_USER,
    password: process.env.NEW_DB_PASSWORD,
    database: process.env.NEW_DB_DATABASE,
    charset: 'utf8mb4',
    timezone: '+00:00'
};

// --- DICCIONARIOS ---
const SEX_MAP = { 0: 'Masculino', 1: 'Femenino' };
const CIVIL_STATUS_MAP = { 0: 'Soltero', 1: 'Casado', 2: 'Union Libre', 3: 'Viudo(a)', 4: 'Divorciado' };
const USER_ROLE_MAP = { 1: 'ADMINISTRADOR', 2: 'FINANZAS', 4: 'GESTOR' };

async function prepareSchema(newDbConnection) {
    console.log(`--- PREPARANDO ESQUEMA ---`);
    const tablesToUpdate = [
        { tableName: 'users', columnName: 'legacyId', columnType: 'INT' },
        { tableName: 'clients', columnName: 'legacyId', columnType: 'INT' }
    ];

    for (const table of tablesToUpdate) {
        const { tableName, columnName, columnType } = table;
        const checkSql = `SELECT COUNT(*) AS count FROM information_schema.columns WHERE table_schema = ? AND table_name = ? AND column_name = ?`;
        const [rows] = await newDbConnection.execute(checkSql, [newDbConfig.database, tableName, columnName]);

        if (rows[0].count === 0) {
            if (!SIMULATION_MODE) {
                const addSql = `ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnType}`;
                await newDbConnection.execute(addSql);
                console.log(`  ✅ Columna '${columnName}' creada en '${tableName}'.`);
            }
        }
    }
}

async function cleanTables(newDbConnection) {
    console.log(`--- LIMPIANDO TABLAS ---`);
    if (SIMULATION_MODE) {
        console.log("  [SIM] Se limpiarían las tablas.");
        return;
    }

    await newDbConnection.execute('SET FOREIGN_KEY_CHECKS = 0;');
    await newDbConnection.execute('TRUNCATE TABLE payments_registered;');
    await newDbConnection.execute('TRUNCATE TABLE payment_plan;');
    await newDbConnection.execute('TRUNCATE TABLE guarantees;');
    await newDbConnection.execute('TRUNCATE TABLE guarantors;');
    await newDbConnection.execute('TRUNCATE TABLE credits;');
    await newDbConnection.execute('TRUNCATE TABLE clients;');
    await newDbConnection.execute('TRUNCATE TABLE users;');
    await newDbConnection.execute('TRUNCATE TABLE sucursales;');
    await newDbConnection.execute('TRUNCATE TABLE counters;');
    await newDbConnection.execute('INSERT INTO counters (id, clientNumber, creditNumber, reciboNumber) VALUES ("main", 0, 0, 0);');
    await newDbConnection.execute('SET FOREIGN_KEY_CHECKS = 1;');
    console.log('  ✅ Tablas limpiadas y contadores reseteados.');
}

async function getGeoMaps(oldDbConnection, newDbConnection) {
    const [oldDepts] = await oldDbConnection.execute("SELECT id, nombre FROM departamento");
    const [oldMunis] = await oldDbConnection.execute("SELECT id, nombre, departamento_id FROM departamento_municipio");
    const [newDepts] = await newDbConnection.execute("SELECT id, name FROM departments");
    const [newMunis] = await newDbConnection.execute("SELECT id, name FROM municipalities");

    const newDeptNameToId = newDepts.reduce((acc, row) => ({ ...acc, [row.name]: row.id }), {});
    const newMuniNameToId = newMunis.reduce((acc, row) => ({ ...acc, [row.name]: row.id }), {});

    return {
        oldDepartmentMap: oldDepts.reduce((acc, row) => ({ ...acc, [row.id]: row.nombre }), {}),
        oldMunicipalityMap: oldMunis.reduce((acc, row) => ({
            ...acc,
            [row.id]: {
                nombre: row.nombre,
                departamento_id: row.departamento_id
            }
        }), {}),
        newDeptNameToId,
        newMuniNameToId
    };
}

async function migrateUsersAndClients(oldDbConnection, newDbConnection, geoMaps) {
    console.log(`--- FASE 1: MIGRANDO USUARIOS Y CLIENTES ---`);
    const [users] = await oldDbConnection.execute("SELECT * FROM users");
    const translationMap = {};

    // Crear sucursales
    const sucursales = [
        { id: 'suc_001', name: 'Sucursal León' },
        { id: 'suc_002', name: 'Sucursal Jinotepe' }
    ];

    for (const sucursal of sucursales) {
        console.log(`  🏢 Creando sucursal: ${sucursal.name}`);
        if (!SIMULATION_MODE) {
            await newDbConnection.execute(
                'INSERT INTO sucursales (id, name) VALUES (?, ?)',
                [sucursal.id, sucursal.name]
            );
        }
    }

    let userCount = 0;
    let clientCount = 0;

    for (const user of users) {
        const userRole = USER_ROLE_MAP[user.tipo_usuario];

        if (userRole) { // Usuario del Sistema
            const newId = generateUserId();
            translationMap[user.id] = newId;
            const fullName = `${user.nombres || ''} ${user.apellidos || ''}`.trim();
            const email = user.username || `legacy_user_${user.id}@placeholder.com`;

            const sql = `INSERT INTO users (id, legacyId, fullName, email, hashed_password, phone, role, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
            const values = [
                newId, user.id, fullName, email, user.password || 'default_password_hash',
                user.telefono1 || null, userRole || 'GESTOR', user.created_at, user.updated_at
            ];

            console.log(`  👤 Usuario: ${fullName} (${newId})`);
            if (!SIMULATION_MODE) await newDbConnection.execute(sql, values);
            userCount++;

        } else if (user.tipo_usuario === 3) { // Cliente
            const newId = generateClientId();
            const clientNumber = generateClientNumber();
            translationMap[user.id] = newId;
            const fullName = `${user.nombres || ''} ${user.apellidos || ''}`.trim();

            // Geografía
            const municipalityInfo = geoMaps.oldMunicipalityMap[user.dep_mun];
            const municipalityName = municipalityInfo ? municipalityInfo.nombre : null;
            const departmentName = municipalityInfo ? geoMaps.oldDepartmentMap[municipalityInfo.departamento_id] : null;
            const departmentId = departmentName ? geoMaps.newDeptNameToId[departmentName] : null;
            const municipalityId = municipalityName ? geoMaps.newMuniNameToId[municipalityName] : null;

            // Lógica inteligente de sucursales
            let sucursalId = 'suc_002';
            let sucursalName = 'Sucursal Jinotepe';

            const direccion = (user.direccion || '').toLowerCase();
            const departamento = (departmentName || '').toLowerCase();
            const municipio = (municipalityName || '').toLowerCase();

            if (direccion.includes('león') || departamento.includes('león') || municipio.includes('león')) {
                sucursalId = 'suc_001';
                sucursalName = 'Sucursal León';
            }

            const sql = `INSERT INTO clients (id, legacyId, clientNumber, name, firstName, lastName, cedula, phone, sex, civilStatus, department, municipality, departmentId, municipalityId, address, sucursal_id, sucursal_name, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
            const values = [
                newId, user.id, clientNumber, fullName, user.nombres || '', user.apellidos || '',
                user.cedula || '', user.telefono1 || '', SEX_MAP[user.sexo] || 'Masculino',
                CIVIL_STATUS_MAP[user.estado_civil] || 'Soltero', departmentName || '',
                municipalityName || '', departmentId || null, municipalityId || null,
                user.direccion || '', sucursalId, sucursalName, user.created_at || new Date(),
                user.updated_at || new Date()
            ];

            console.log(`  👥 Cliente: ${fullName} (${clientNumber}) → ${sucursalName}`);
            if (!SIMULATION_MODE) await newDbConnection.execute(sql, values);
            clientCount++;
        }
    }

    console.log(`  ✅ ${userCount} usuarios y ${clientCount} clientes migrados.`);
    return translationMap;
}

async function runFase1() {
    let oldDbConnection, newDbConnection;
    console.log('🚀 INICIANDO MIGRACIÓN FASE 1: USUARIOS Y CLIENTES');

    try {
        console.log('🔌 Conectando a bases de datos...');
        oldDbConnection = await mysql.createConnection(oldDbConfig);
        newDbConnection = await mysql.createConnection(newDbConfig);
        console.log('✅ Conexiones exitosas.');

        await newDbConnection.beginTransaction();

        await prepareSchema(newDbConnection);
        await cleanTables(newDbConnection);
        const geoMaps = await getGeoMaps(oldDbConnection, newDbConnection);
        const translationMap = await migrateUsersAndClients(oldDbConnection, newDbConnection, geoMaps);

        // --- SINCRONIZAR CONTADORES ---
        if (!SIMULATION_MODE) {
            // Contar cuántos clientes se insertaron para actualizar el contador 'main'
            const [clientRows] = await newDbConnection.execute("SELECT COUNT(*) as count FROM clients");
            const totalClients = clientRows[0].count;
            await newDbConnection.execute("UPDATE counters SET clientNumber = ? WHERE id = 'main'", [totalClients]);
            console.log(`  📊 Contador 'clientNumber' actualizado a: ${totalClients}`);
        }

        if (!SIMULATION_MODE) {
            await newDbConnection.commit();
            console.log('\n💾 FASE 1 COMPLETADA Y GUARDADA');
        } else {
            await newDbConnection.rollback();
            console.log('\n⏪ SIMULACIÓN COMPLETADA');
        }

        // Guardar mapa de traducción para las siguientes fases
        const fs = require('fs');
        fs.writeFileSync('./translation-map.json', JSON.stringify(translationMap, null, 2));
        console.log('📋 Mapa de traducción guardado en translation-map.json');

    } catch (error) {
        console.error('\n❌ ERROR EN FASE 1:', error.message);
        console.error('📋 Detalles del error:', error);
        if (newDbConnection) await newDbConnection.rollback();
    } finally {
        if (oldDbConnection) await oldDbConnection.end();
        if (newDbConnection) await newDbConnection.end();
        console.log('\n🚪 Fase 1 finalizada.');
    }
}

runFase1();