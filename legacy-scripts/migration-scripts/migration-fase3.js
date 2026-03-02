// MIGRACIÓN FASE 3: PAGOS (ABONOS)
require('dotenv').config({ path: '.env' });
const mysql = require('mysql2/promise');
const fs = require('fs');
const { toDate, formatInTimeZone } = require('date-fns-tz');
const { format, parseISO } = require('date-fns');

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
            let sourceDate;
            
            // Prioridad 1: fecha_pagado_real de prestamo_coutas (tiene hora exacta)
            if (payment.fecha_pagado_real) {
                sourceDate = payment.fecha_pagado_real instanceof Date 
                    ? payment.fecha_pagado_real 
                    : parseISO(String(payment.fecha_pagado_real));
            }
            // Prioridad 2: updated_at (hora de última actualización/aplicación del pago)
            else if (payment.updated_at) {
                sourceDate = payment.updated_at instanceof Date 
                    ? payment.updated_at 
                    : parseISO(String(payment.updated_at));
            }
            // Prioridad 3: created_at (hora de creación del pago)
            else if (payment.created_at) {
                sourceDate = payment.created_at instanceof Date 
                    ? payment.created_at 
                    : parseISO(String(payment.created_at));
            }
            else {
                throw new Error(`Pago ${payment.id} no tiene fecha_pagado_real, updated_at ni created_at`);
            }
            
            // La fecha viene de MySQL que está en Nicaragua, convertir a UTC para guardar
            // toDate interpreta la fecha como si estuviera en la zona horaria especificada
            const utcDate = toDate(sourceDate, { timeZone: 'America/Managua' });
            paymentDateTime = format(utcDate, 'yyyy-MM-dd HH:mm:ss');
        } catch (error) {
            console.log(`  ❌ ERROR CRÍTICO pago ${payment.id}: ${error.message}`);
            skippedCount++;
            continue;
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

    // Obtener pagos con fecha_pagado de prestamo_coutas que tiene la hora exacta
    const [payments] = await oldDbConnection.execute(`
        SELECT 
            a.*,
            (
                SELECT pc.fecha_pagado 
                FROM prestamo_coutas pc 
                WHERE pc.prestamo_id = a.prestamo_id 
                AND DATE(pc.fecha_cuota) = DATE(a.fecha_abono)
                AND pc.fecha_pagado IS NOT NULL
                ORDER BY pc.numero_cuota ASC
                LIMIT 1
            ) as fecha_pagado_real
        FROM abonos a
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