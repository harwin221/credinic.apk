// MIGRACIÓN FASE 2: CRÉDITOS
require('dotenv').config({ path: '.env' });
const mysql = require('mysql2/promise');
const fs = require('fs');
const { addWeeks, addDays, differenceInDays, format, parseISO } = require('date-fns');

// --- CONFIGURACIÓN ---
const SIMULATION_MODE = false;

// --- GENERADORES DE ID BONITOS ---
let creditCounter = 1;
let creditNumberSequence = 1;

const generateCreditId = () => `cred_${String(creditCounter++).padStart(3, '0')}`;
const generateCreditNumber = () => `CRE-${String(creditNumberSequence++).padStart(5, '0')}`;

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
const CREDIT_STATUS_MAP = { 1: 'Active', 2: 'Paid', 3: 'Expired', 4: 'Rejected' };
const PAYMENT_FREQ_MAP = { 1: 'Diario', 2: 'Semanal', 3: 'Quincenal', 4: 'Catorcenal' };
const CURRENCY_MAP = { 0: 'Cordobas' };

// --- UTILIDADES DE PLAN DE PAGOS (Replicadas de src/lib/utils.ts) ---
function adjustToNextBusinessDay(date, frequency, holidays = []) {
    let newDate = new Date(date.getTime());
    const isHoliday = (d) => {
        const dateString = format(d, 'yyyy-MM-dd');
        return holidays.includes(dateString);
    };

    let adjusted = true;
    let iterations = 0;
    while (adjusted && iterations < 30) {
        adjusted = false;
        iterations++;
        const dayOfWeek = newDate.getDay(); // 0 = Domingo, 6 = Sábado

        if (dayOfWeek === 0) {
            newDate = addDays(newDate, 1);
            adjusted = true;
            continue;
        }

        if (dayOfWeek === 6) {
            if (frequency === 'Diario' || frequency === 'Catorcenal') {
                newDate = addDays(newDate, 2);
                adjusted = true;
                continue;
            }
        }

        if (isHoliday(newDate)) {
            newDate = addDays(newDate, 1);
            adjusted = true;
        }
    }
    return newDate;
}

function generatePaymentSchedule(data) {
    let { loanAmount, monthlyInterestRate, termMonths, paymentFrequency, startDate: dateInput, holidays = [] } = data;

    // Asegurar tipos numéricos
    loanAmount = Number(loanAmount) || 0;
    monthlyInterestRate = Number(monthlyInterestRate) || 0;
    termMonths = Number(termMonths) || 0;

    if (!dateInput) return null;

    let initialDate;
    try {
        if (typeof dateInput === 'string') {
            if (dateInput.includes('T')) {
                initialDate = parseISO(dateInput);
            } else if (dateInput.includes(' ')) {
                // Formato YYYY-MM-DD HH:mm:ss -> Convertir a ISO
                initialDate = parseISO(dateInput.replace(' ', 'T'));
            } else {
                initialDate = parseISO(`${dateInput}T12:00:00`);
            }
        } else {
            initialDate = new Date(dateInput);
        }

        if (isNaN(initialDate.getTime())) return null;
    } catch (e) {
        return null;
    }

    let numberOfPayments;
    switch (paymentFrequency) {
        case 'Diario': numberOfPayments = Math.round(termMonths * 20); break;
        case 'Semanal': numberOfPayments = Math.round(termMonths * 4); break;
        case 'Catorcenal': numberOfPayments = Math.round(termMonths * 2); break;
        case 'Quincenal': numberOfPayments = Math.round(termMonths * 2); break;
        default: return null;
    }

    if (numberOfPayments <= 0) return null;

    const totalInterest = loanAmount * (monthlyInterestRate / 100) * termMonths;
    const totalPayment = loanAmount + totalInterest;
    const periodicPayment = totalPayment / numberOfPayments;
    const periodicInterest = totalInterest / numberOfPayments;
    const periodicPrincipal = loanAmount / numberOfPayments;

    const schedule = [];
    let remainingBalance = totalPayment;
    let theoreticalDate = initialDate;

    for (let i = 1; i <= numberOfPayments; i++) {
        let adjustedDate = adjustToNextBusinessDay(theoreticalDate, paymentFrequency, holidays);
        remainingBalance -= periodicPayment;

        schedule.push({
            paymentNumber: i,
            paymentDate: format(adjustedDate, 'yyyy-MM-dd'),
            amount: periodicPayment,
            principal: periodicPrincipal,
            interest: periodicInterest,
            balance: Math.max(0, remainingBalance),
        });

        if (paymentFrequency === 'Quincenal') {
            const startDay = initialDate.getDate();
            const isStartSecondHalf = startDay > 15;
            const day1 = isStartSecondHalf ? startDay - 15 : startDay;
            const day2 = isStartSecondHalf ? startDay : startDay + 15;
            const baseIndex = i + (isStartSecondHalf ? 1 : 0);
            const monthOffset = Math.floor(baseIndex / 2);
            const isTargetSecondHalf = (baseIndex % 2) === 1;

            theoreticalDate = new Date(initialDate.getFullYear(), initialDate.getMonth() + monthOffset, isTargetSecondHalf ? day2 : day1);
            const expectedMonth = (initialDate.getMonth() + monthOffset) % 12;
            if (theoreticalDate.getMonth() !== expectedMonth) {
                theoreticalDate = new Date(initialDate.getFullYear(), initialDate.getMonth() + monthOffset + 1, 0);
            }
        } else {
            switch (paymentFrequency) {
                case 'Diario': theoreticalDate = addDays(theoreticalDate, 1); break;
                case 'Semanal': theoreticalDate = addWeeks(theoreticalDate, 1); break;
                case 'Catorcenal': theoreticalDate = addDays(theoreticalDate, 14); break;
            }
        }
    }
    return schedule;
}

async function prepareSchema(newDbConnection) {
    console.log(`--- PREPARANDO ESQUEMA PARA CRÉDITOS ---`);
    const checkSql = `SELECT COUNT(*) AS count FROM information_schema.columns WHERE table_schema = ? AND table_name = ? AND column_name = ?`;
    const [rows] = await newDbConnection.execute(checkSql, [newDbConfig.database, 'credits', 'legacyId']);

    if (rows[0].count === 0) {
        if (!SIMULATION_MODE) {
            const addSql = `ALTER TABLE credits ADD COLUMN legacyId INT`;
            await newDbConnection.execute(addSql);
            console.log(`  ✅ Columna 'legacyId' creada en 'credits'.`);
        }
    }
}

async function migrateCredits(oldDbConnection, newDbConnection, userClientMap) {
    console.log(`--- FASE 2: MIGRANDO CRÉDITOS ---`);
    const [credits] = await oldDbConnection.execute("SELECT * FROM prestamos");

    // Obtener gestores
    const [gestores] = await oldDbConnection.execute("SELECT id, nombres, apellidos FROM users WHERE tipo_usuario = 4");
    const gestorMap = gestores.reduce((acc, gestor) => {
        const fullName = `${gestor.nombres || ''} ${gestor.apellidos || ''}`.trim();
        return { ...acc, [gestor.id]: fullName };
    }, {});

    // Obtener feriados para el plan de pagos
    const [holidaysRows] = await newDbConnection.execute("SELECT date FROM holidays");
    const holidays = holidaysRows.map(h => format(new Date(h.date), 'yyyy-MM-dd'));

    const creditMap = {};
    let skippedCount = 0;
    let processedCount = 0;

    console.log(`  📊 Total de créditos a procesar: ${credits.length}`);

    for (const credit of credits) {
        const newClientId = userClientMap[credit.user_id];
        if (!newClientId) {
            skippedCount++;
            continue;
        }

        const newId = generateCreditId();
        const creditNumber = generateCreditNumber();
        creditMap[credit.id] = newId;

        const gestorName = gestorMap[credit.agente_id] || 'Administrador Administrador';

        // Obtener sucursal del cliente
        const [clientSucursal] = await newDbConnection.execute('SELECT sucursal_id, sucursal_name FROM clients WHERE id = ?', [newClientId]);
        const sucursalId = clientSucursal[0]?.sucursal_id || 'suc_002';
        const sucursalName = clientSucursal[0]?.sucursal_name || 'Sucursal Jinotepe';

        // Corregir decimales innecesarios
        const interestRate = credit.tasa_prestamo && credit.tasa_prestamo.toString().endsWith('.00')
            ? parseInt(credit.tasa_prestamo)
            : (credit.tasa_prestamo || 0);

        const termMonths = credit.plazo_pago && credit.plazo_pago.toString().endsWith('.00')
            ? parseInt(credit.plazo_pago)
            : (credit.plazo_pago || 0);

        // Función para convertir fechas de "día completo" a mediodía (12:00:00)
        const convertToNoonDate = (dateValue) => {
            if (!dateValue) return null;
            const date = new Date(dateValue);
            if (isNaN(date.getTime())) return null;
            const dateOnly = date.toISOString().split('T')[0];
            return `${dateOnly} 12:00:00`;
        };

        const deliveryDate = convertToNoonDate(credit.fecha_desembolso) || convertToNoonDate(new Date());

        // Calcular fecha de vencimiento estimada (deliveryDate + termMonths)
        const calcDueDate = () => {
            if (!credit.fecha_desembolso) return deliveryDate;
            const d = new Date(credit.fecha_desembolso);
            const months = parseInt(termMonths) || 1;
            d.setMonth(d.getMonth() + months);
            return convertToNoonDate(d);
        };
        const dueDate = calcDueDate();

        const sql = `INSERT INTO credits (id, legacyId, creditNumber, clientId, clientName, status, applicationDate, approvalDate, amount, principalAmount, interestRate, termMonths, paymentFrequency, currencyType, totalAmount, totalInterest, totalInstallmentAmount, firstPaymentDate, deliveryDate, dueDate, collectionsManager, branch, branchName, createdAt, updatedAt) VALUES (?, ?, ?, ?, (SELECT name FROM clients WHERE id = ?), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        const values = [
            newId, credit.id, creditNumber, newClientId, newClientId,
            CREDIT_STATUS_MAP[credit.estado] || 'Active', deliveryDate,
            convertToNoonDate(credit.fecha_desembolso), credit.monto_prestamo || 0, credit.monto_prestamo || 0,
            interestRate, termMonths, PAYMENT_FREQ_MAP[credit.forma_pago_tipo] || 'Diario',
            CURRENCY_MAP[credit.moneda_prestamo] || 'Cordobas', credit.monto_financiado || 0,
            credit.interes_total_pagar || 0, credit.monto_cuota || 0, convertToNoonDate(credit.fecha_primer_pago),
            deliveryDate, dueDate, gestorName, sucursalId, sucursalName,
            credit.created_at || new Date(), credit.updated_at || new Date()
        ];

        try {
            if (!SIMULATION_MODE) {
                await newDbConnection.execute(sql, values);

                // --- GENERAR E INSERTAR PLAN DE PAGOS ---
                const schedule = generatePaymentSchedule({
                    loanAmount: credit.monto_prestamo || 0,
                    monthlyInterestRate: interestRate,
                    termMonths: termMonths,
                    paymentFrequency: PAYMENT_FREQ_MAP[credit.forma_pago_tipo] || 'Diario',
                    startDate: convertToNoonDate(credit.fecha_primer_pago) || deliveryDate,
                    holidays: holidays
                });

                if (schedule && schedule.length > 0) {
                    for (const p of schedule) {
                        const pSql = `INSERT INTO payment_plan (id, creditId, paymentNumber, paymentDate, amount, principal, interest, balance) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
                        const pValues = [
                            `${newId}_${p.paymentNumber}`, newId, p.paymentNumber,
                            p.paymentDate, p.amount, p.principal, p.interest, p.balance
                        ];
                        await newDbConnection.execute(pSql, pValues);
                    }
                } else {
                    console.log(`  ⚠️  No se pudo generar plan de pagos para crédito ${creditNumber} (ID Legacy: ${credit.id})`);
                }

                processedCount++;

                if (processedCount % 50 === 0) {
                    console.log(`  📈 Progreso: ${processedCount}/${credits.length - skippedCount} créditos procesados...`);
                }
            } else {
                console.log(`  💳 Crédito: ${creditNumber} - Gestor: ${gestorName} - Tasa: ${interestRate}% - Plazo: ${termMonths} meses`);
            }
        } catch (error) {
            console.log(`  ❌ Error al importar crédito ID ${credit.id}: ${error.message}`);
            continue;
        }
    }

    if (skippedCount > 0) console.log(`  ⚠️  Se omitieron ${skippedCount} créditos por no encontrar su cliente.`);
    console.log(`  ✅ ${processedCount} créditos migrados exitosamente.`);
    return creditMap;
}

async function runFase2() {
    let oldDbConnection, newDbConnection;
    console.log('🚀 INICIANDO MIGRACIÓN FASE 2: CRÉDITOS');

    try {
        // Cargar mapa de traducción de la Fase 1
        if (!fs.existsSync('./translation-map.json')) {
            throw new Error('❌ No se encontró translation-map.json. Ejecuta primero la Fase 1.');
        }
        const userClientMap = JSON.parse(fs.readFileSync('./translation-map.json', 'utf8'));
        console.log(`📋 Mapa de traducción cargado: ${Object.keys(userClientMap).length} registros.`);

        console.log('🔌 Conectando a bases de datos...');
        oldDbConnection = await mysql.createConnection(oldDbConfig);
        newDbConnection = await mysql.createConnection(newDbConfig);
        console.log('✅ Conexiones exitosas.');

        await newDbConnection.beginTransaction();

        await prepareSchema(newDbConnection);
        const creditMap = await migrateCredits(oldDbConnection, newDbConnection, userClientMap);

        // --- SINCRONIZAR CONTADORES ---
        if (!SIMULATION_MODE) {
            const [creditRows] = await newDbConnection.execute("SELECT COUNT(*) as count FROM credits");
            const totalCredits = creditRows[0].count;
            await newDbConnection.execute("UPDATE counters SET creditNumber = ? WHERE id = 'main'", [totalCredits]);
            console.log(`  📊 Contador 'creditNumber' actualizado a: ${totalCredits}`);
        }

        if (!SIMULATION_MODE) {
            await newDbConnection.commit();
            console.log('\n💾 FASE 2 COMPLETADA Y GUARDADA');
        } else {
            await newDbConnection.rollback();
            console.log('\n⏪ SIMULACIÓN COMPLETADA');
        }

        // Guardar mapa de créditos para la Fase 3
        fs.writeFileSync('./credit-map.json', JSON.stringify(creditMap, null, 2));
        console.log('📋 Mapa de créditos guardado en credit-map.json');

    } catch (error) {
        console.error('\n❌ ERROR EN FASE 2:', error.message);
        if (newDbConnection) await newDbConnection.rollback();
    } finally {
        if (oldDbConnection) await oldDbConnection.end();
        if (newDbConnection) await newDbConnection.end();
        console.log('\n🚪 Fase 2 finalizada.');
    }
}

runFase2();