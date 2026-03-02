// MIGRACIÓN FASE 3: PAGOS (ABONOS)
require('dotenv').config({ path: '.env' });
const mysql = require('mysql2/promise');
const fs = require('fs');
const { zonedTimeToUtc, formatInTimeZone } = require('date-fns-tz');
const { format } = require('date-fns');

// --- CONFIGURACIÓN ---
const SIMULATION_MODE = false;
const BATCH_SIZE = 500; // Aumentado de 200 a 500 para mayor velocidad

// --- GENERADORES DE ID BONITOS ---
let paymentCounter = 1;
const generatePaymentId = () => `pay_${String(paymentCounter++).padStart(3, '0')}`;

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
const PAYMENT_STATUS_MAP = { 1: 'valido', 2: 'anulado' };

async function prepareSchema(newDbConnection) {
    console.log(`--- PREPARANDO ESQUEMA PARA PAGOS ---`);
    
    // Limpiar pagos existentes
    console.log(`  🗑️  Limpiando pagos existentes...`);
    await newDbConnection.execute('DELETE FROM payments_registered');
    console.log(`  ✅ Pagos eliminados.`);
    
    const checkSql = `SELECT COUNT(*) AS count FROM information_schema.columns WHERE table_schema = ? AND table_name = ? AND column_name = ?`;
    const [rows] = await newDbConnection.execute(checkSql, [newDbConfig.database, 'payments_registered', 'legacyId']);

    if (rows[0].count === 0) {
        if (!SIMULATION_MODE) {
            const addSql = `ALTER TABLE payments_registered ADD COLUMN legacyId INT`;
            await newDbConnection.execute(addSql);
            console.log(`  ✅ Columna 'legacyId' creada en 'payments_registered'.`);
        }
    }
}

async function reconnectIfNeeded(connection, config) {
    try {
        await connection.ping();
        return connection;
    } catch (error) {
        console.log('  🔄 Reconectando a la base de datos...');
        await connection.end();
        const newConnection = await mysql.createConnection(config);
        await newConnection.beginTransaction();
        return newConnection;
    }
}

async function migratePaymentsBatch(oldDbConnection, newDbConnection, creditMap, userClientMap, userNameMap, payments, startIndex, endIndex) {
    const batch = payments.slice(startIndex, endIndex);
    let processedCount = 0;
    let skippedCount = 0;

    // Preparar todos los valores para INSERT múltiple
    const valuesToInsert = [];

    for (const payment of batch) {
        const newCreditId = creditMap[payment.prestamo_id];
        if (!newCreditId) {
            skippedCount++;
            continue;
        }

        const newId = `pay_${String(payment.id).padStart(6, '0')}`;
        const newUserId = userClientMap[payment.created_user_id] || userClientMap[1];
        const managedBy = userNameMap[newUserId] || "Administrador Sistema";
        const transactionNumber = `REC-${String(payment.id).padStart(6, '0')}`;

        // ✅ CONVERSIÓN CORRECTA: Nicaragua → UTC usando date-fns-tz
        let paymentDateTime;
        try {
            if (payment.fecha_pagado) {
                // La base vieja guardaba en hora Nicaragua
                let nicaraguaTimeString;
                
                if (payment.fecha_pagado instanceof Date) {
                    // Si es Date object, formatear en zona horaria Nicaragua
                    nicaraguaTimeString = formatInTimeZone(payment.fecha_pagado, 'America/Managua', 'yyyy-MM-dd HH:mm:ss');
                } else if (typeof payment.fecha_pagado === 'string') {
                    nicaraguaTimeString = payment.fecha_pagado;
                } else {
                    nicaraguaTimeString = String(payment.fecha_pagado);
                }
                
                // Convertir explícitamente de Nicaragua a UTC
                const utcDate = zonedTimeToUtc(nicaraguaTimeString, 'America/Managua');
                paymentDateTime = formatInTimeZone(utcDate, 'UTC', 'yyyy-MM-dd HH:mm:ss');
            } else if (payment.created_at) {
                // Fallback: usar created_at
                let nicaraguaTimeString;
                
                if (payment.created_at instanceof Date) {
                    nicaraguaTimeString = formatInTimeZone(payment.created_at, 'America/Managua', 'yyyy-MM-dd HH:mm:ss');
                } else if (typeof payment.created_at === 'string') {
                    nicaraguaTimeString = payment.created_at;
                } else {
                    nicaraguaTimeString = String(payment.created_at);
                }
                
                const utcDate = zonedTimeToUtc(nicaraguaTimeString, 'America/Managua');
                paymentDateTime = formatInTimeZone(utcDate, 'UTC', 'yyyy-MM-dd HH:mm:ss');
            } else {
                // Último fallback: fecha actual
                paymentDateTime = format(new Date(), 'yyyy-MM-dd HH:mm:ss');
            }
        } catch (error) {
            console.log(`  ⚠️  Error convirtiendo fecha para pago ${payment.id}, usando fecha actual`);
            paymentDateTime = format(new Date(), 'yyyy-MM-dd HH:mm:ss');
        }

        valuesToInsert.push([
            newId,
            payment.id,
            newCreditId,
            paymentDateTime,
            payment.total_efectivo,
            managedBy,
            transactionNumber,
            PAYMENT_STATUS_MAP[payment.estado] || 'valido'
        ]);
    }

    // INSERT múltiple para mayor velocidad
    if (valuesToInsert.length > 0 && !SIMULATION_MODE) {
        try {
            const placeholders = valuesToInsert.map(() => '(?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
            const sql = `INSERT INTO payments_registered (id, legacyId, creditId, paymentDate, amount, managedBy, transactionNumber, status) VALUES ${placeholders}`;
            const flatValues = valuesToInsert.flat();
            
            await newDbConnection.execute(sql, flatValues);
            processedCount = valuesToInsert.length;
        } catch (error) {
            console.log(`  ❌ Error en lote: ${error.message}`);
            // Fallback: insertar uno por uno
            for (const values of valuesToInsert) {
                try {
                    const sql = `INSERT INTO payments_registered (id, legacyId, creditId, paymentDate, amount, managedBy, transactionNumber, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
                    await newDbConnection.execute(sql, values);
                    processedCount++;
                } catch (err) {
                    console.log(`  ❌ Error al importar pago ID ${values[1]}: ${err.message}`);
                }
            }
        }
    }

    return { processedCount, skippedCount };
}

async function getUserNamesMap(newDbConnection) {
    console.log(`  🔍 Obteniendo mapa de nombres de usuarios...`);
    const [rows] = await newDbConnection.execute("SELECT id, fullName FROM users");
    const map = {};
    rows.forEach(row => {
        map[row.id] = row.fullName;
    });
    return map;
}

async function migratePayments(oldDbConnection, newDbConnection, creditMap, userClientMap) {
    console.log(`--- FASE 3: MIGRANDO PAGOS EN LOTES ---`);

    const userNameMap = await getUserNamesMap(newDbConnection);

    // JOIN con prestamo_coutas para obtener fecha_pagado con hora exacta
    const [payments] = await oldDbConnection.execute(`
        SELECT 
            a.*,
            pc.fecha_pagado
        FROM abonos a
        LEFT JOIN prestamo_coutas pc ON a.prestamo_id = pc.prestamo_id 
            AND a.id = (
                SELECT MIN(a2.id) 
                FROM abonos a2 
                WHERE a2.prestamo_id = pc.prestamo_id 
                AND DATE(a2.fecha_abono) = DATE(pc.fecha_cuota)
                AND a2.estado = 1
                LIMIT 1
            )
        ORDER BY a.id
    `);
    console.log(`  📊 Total de pagos a procesar: ${payments.length}`);

    let totalProcessed = 0;
    let totalSkipped = 0;
    const totalBatches = Math.ceil(payments.length / BATCH_SIZE);

    for (let i = 0; i < payments.length; i += BATCH_SIZE) {
        const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
        const startIndex = i;
        const endIndex = Math.min(i + BATCH_SIZE, payments.length);

        console.log(`  📦 Procesando lote ${batchNumber}/${totalBatches} (${startIndex + 1}-${endIndex})...`);

        // Reconectar si es necesario
        newDbConnection = await reconnectIfNeeded(newDbConnection, newDbConfig);

        const { processedCount, skippedCount } = await migratePaymentsBatch(
            oldDbConnection, newDbConnection, creditMap, userClientMap, userNameMap,
            payments, startIndex, endIndex
        );

        totalProcessed += processedCount;
        totalSkipped += skippedCount;

        console.log(`    ✅ Lote ${batchNumber}: ${processedCount} procesados, ${skippedCount} omitidos`);

        // Sin pausa para máxima velocidad
    }

    if (totalSkipped > 0) console.log(`  ⚠️  Se omitieron ${totalSkipped} pagos por no encontrar su crédito.`);
    console.log(`  ✅ ${totalProcessed} pagos migrados exitosamente en ${totalBatches} lotes.`);

    return newDbConnection;
}

async function runFase3() {
    let oldDbConnection, newDbConnection;
    console.log('🚀 INICIANDO MIGRACIÓN FASE 3: PAGOS');

    try {
        // Cargar mapas de las fases anteriores
        if (!fs.existsSync('./translation-map.json')) {
            throw new Error('❌ No se encontró translation-map.json. Ejecuta primero la Fase 1.');
        }
        if (!fs.existsSync('./credit-map.json')) {
            throw new Error('❌ No se encontró credit-map.json. Ejecuta primero la Fase 2.');
        }

        const userClientMap = JSON.parse(fs.readFileSync('./translation-map.json', 'utf8'));
        const creditMap = JSON.parse(fs.readFileSync('./credit-map.json', 'utf8'));

        console.log(`📋 Mapa de usuarios/clientes: ${Object.keys(userClientMap).length} registros.`);
        console.log(`📋 Mapa de créditos: ${Object.keys(creditMap).length} registros.`);

        console.log('🔌 Conectando a bases de datos...');
        oldDbConnection = await mysql.createConnection(oldDbConfig);
        newDbConnection = await mysql.createConnection(newDbConfig);
        console.log('✅ Conexiones exitosas.');

        await newDbConnection.beginTransaction();

        await prepareSchema(newDbConnection);
        newDbConnection = await migratePayments(oldDbConnection, newDbConnection, creditMap, userClientMap);

        // --- SINCRONIZAR CONTADORES ---
        if (!SIMULATION_MODE) {
            const [paymentRows] = await newDbConnection.execute("SELECT COUNT(*) as count FROM payments_registered");
            const totalPayments = paymentRows[0].count;
            await newDbConnection.execute("UPDATE counters SET reciboNumber = ? WHERE id = 'main'", [totalPayments]);
            console.log(`  📊 Contador 'reciboNumber' actualizado a: ${totalPayments}`);
        }

        if (!SIMULATION_MODE) {
            await newDbConnection.commit();
            console.log('\n💾 FASE 3 COMPLETADA Y GUARDADA');
        } else {
            await newDbConnection.rollback();
            console.log('\n⏪ SIMULACIÓN COMPLETADA');
        }

    } catch (error) {
        console.error('\n❌ ERROR EN FASE 3:', error.message);
        if (newDbConnection) {
            try {
                await newDbConnection.rollback();
            } catch (rollbackError) {
                console.error('Error en rollback:', rollbackError.message);
            }
        }
    } finally {
        if (oldDbConnection) await oldDbConnection.end();
        if (newDbConnection) await newDbConnection.end();
        console.log('\n🚪 Fase 3 finalizada.');
    }
}

runFase3();