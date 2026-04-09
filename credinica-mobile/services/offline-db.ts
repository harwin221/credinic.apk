import * as SQLite from 'expo-sqlite';

// Usar la nueva API de expo-sqlite (SDK 54+)
const db = SQLite.openDatabaseSync('credinica_offline.db');

// Función para inicializar las tablas de la base de datos offline
export const initOfflineDatabase = () => {
    try {
        // Eliminar tablas existentes para recrearlas con la nueva estructura
        db.execSync('DROP TABLE IF EXISTS offline_clients;');
        db.execSync('DROP TABLE IF EXISTS offline_credits;');
        db.execSync('DROP TABLE IF EXISTS pending_payments;');
        db.execSync('DROP TABLE IF EXISTS pending_credits;');
        db.execSync('DROP TABLE IF EXISTS config;');
        
        // Crear tablas con la nueva estructura
        db.execSync(
            `CREATE TABLE offline_clients (
                id TEXT PRIMARY KEY NOT NULL,
                clientNumber TEXT,
                name TEXT,
                cedula TEXT,
                phone TEXT,
                address TEXT,
                neighborhood TEXT,
                municipality TEXT,
                department TEXT,
                isNew INTEGER DEFAULT 0
            );`
        );
        db.execSync(
            `CREATE TABLE offline_credits (
                id TEXT PRIMARY KEY NOT NULL,
                creditNumber TEXT,
                clientName TEXT,
                clientId TEXT,
                amount REAL,
                remainingBalance REAL,
                dueTodayAmount REAL,
                overdueAmount REAL,
                lateDays INTEGER,
                paymentFrequency TEXT,
                collectionsManager TEXT,
                details TEXT,
                paymentPlan TEXT
            );`
        );
        db.execSync(
            `CREATE TABLE pending_payments (
                timestamp INTEGER PRIMARY KEY NOT NULL,
                creditId TEXT NOT NULL,
                paymentData TEXT NOT NULL,
                userId TEXT NOT NULL
            );`
        );
        db.execSync(
            `CREATE TABLE pending_credits (
                timestamp INTEGER PRIMARY KEY NOT NULL,
                creditData TEXT NOT NULL,
                userId TEXT NOT NULL
            );`
        );
        db.execSync(
            `CREATE TABLE config (
                key TEXT PRIMARY KEY NOT NULL,
                value TEXT
            );`
        );
        
        console.log('[DB] Base de datos inicializada correctamente');
    } catch (error) {
        console.error('[DB] Error inicializando base de datos:', error);
    }
};

// Función para limpiar todas las tablas de la base de datos offline
export const clearOfflineDatabase = async () => {
    return new Promise<void>((resolve, reject) => {
        try {
            const tables = [
                'offline_clients',
                'offline_credits',
                'pending_payments',
                'pending_credits',
                'config'
            ];
            
            tables.forEach(table => {
                try {
                    db.execSync(`DELETE FROM ${table};`);
                    console.log(`[DB] Tabla ${table} limpiada`);
                } catch (error) {
                    console.error(`[DB] Error limpiando ${table}:`, error);
                }
            });
            
            console.log('Base de datos offline limpiada exitosamente.');
            resolve();
        } catch (error) {
            console.error('Error durante la limpieza de la base de datos offline:', error);
            reject(error);
        }
    });
};

// Llamar a la inicialización de la base de datos al cargar el módulo
initOfflineDatabase();

// Guardar clientes offline
export const saveClientsOffline = async (clients: any[]) => {
    try {
        db.execSync('DELETE FROM offline_clients;');
        
        const stmt = db.prepareSync(
            'INSERT INTO offline_clients (id, clientNumber, name, cedula, phone, address, neighborhood, municipality, department, isNew) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        );
        
        for (const client of clients) {
            stmt.executeSync([
                client.id,
                client.clientNumber || '',
                client.name || '',
                client.cedula || '',
                client.phone || '',
                client.address || '',
                client.neighborhood || '',
                client.municipality || '',
                client.department || '',
                client.isNew ? 1 : 0
            ]);
        }
        
        console.log(`[DB] ${clients.length} clientes guardados offline`);
    } catch (error) {
        console.error('[DB] Error guardando clientes:', error);
        throw error;
    }
};

// Guardar créditos offline
export const saveCreditsOffline = async (credits: any[]) => {
    try {
        db.execSync('DELETE FROM offline_credits;');
        
        const stmt = db.prepareSync(
            'INSERT INTO offline_credits (id, creditNumber, clientName, clientId, amount, remainingBalance, dueTodayAmount, overdueAmount, lateDays, paymentFrequency, collectionsManager, details, paymentPlan) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        );
        
        for (const credit of credits) {
            stmt.executeSync([
                credit.id,
                credit.creditNumber || '',
                credit.clientName || '',
                credit.clientId || '',
                credit.amount || 0,
                credit.remainingBalance || 0,
                credit.dueTodayAmount || 0,
                credit.overdueAmount || 0,
                credit.lateDays || 0,
                credit.paymentFrequency || '',
                credit.collectionsManager || '',
                JSON.stringify(credit.details || {}),
                JSON.stringify(credit.paymentPlan || [])
            ]);
        }
        
        console.log(`[DB] ${credits.length} créditos guardados offline`);
    } catch (error) {
        console.error('[DB] Error guardando créditos:', error);
        throw error;
    }
};

// Obtener pagos pendientes
export const getPendingPayments = async (): Promise<any[]> => {
    try {
        const result = db.getAllSync('SELECT * FROM pending_payments ORDER BY timestamp ASC');
        return result.map((row: any) => ({
            id: row.timestamp,
            creditId: row.creditId,
            ...JSON.parse(row.paymentData),
            managedBy: row.userId
        }));
    } catch (error) {
        console.error('[DB] Error obteniendo pagos pendientes:', error);
        return [];
    }
};

// Marcar pago como sincronizado
export const markPaymentAsSynced = async (timestamp: number) => {
    try {
        db.runSync('DELETE FROM pending_payments WHERE timestamp = ?', [timestamp]);
        console.log(`[DB] Pago ${timestamp} marcado como sincronizado`);
    } catch (error) {
        console.error('[DB] Error marcando pago como sincronizado:', error);
        throw error;
    }
};

// Obtener créditos pendientes
export const getPendingCredits = async (): Promise<any[]> => {
    try {
        const result = db.getAllSync('SELECT * FROM pending_credits ORDER BY timestamp ASC');
        return result.map((row: any) => ({
            id: row.timestamp,
            data: JSON.parse(row.creditData),
            userId: row.userId
        }));
    } catch (error) {
        console.error('[DB] Error obteniendo créditos pendientes:', error);
        return [];
    }
};

// Marcar crédito como sincronizado
export const markCreditAsSynced = async (timestamp: number) => {
    try {
        db.runSync('DELETE FROM pending_credits WHERE timestamp = ?', [timestamp]);
        console.log(`[DB] Crédito ${timestamp} marcado como sincronizado`);
    } catch (error) {
        console.error('[DB] Error marcando crédito como sincronizado:', error);
        throw error;
    }
};

// Guardar configuración
export const setConfig = async (key: string, value: string) => {
    try {
        db.runSync(
            'INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)',
            [key, value]
        );
        console.log(`[DB] Config ${key} guardada`);
    } catch (error) {
        console.error('[DB] Error guardando config:', error);
        throw error;
    }
};

// Obtener configuración
export const getConfig = async (key: string): Promise<string | null> => {
    try {
        const result = db.getFirstSync('SELECT value FROM config WHERE key = ?', [key]);
        return result ? (result as any).value : null;
    } catch (error) {
        console.error('[DB] Error obteniendo config:', error);
        return null;
    }
};

// Guardar pago pendiente
export const savePendingPayment = async (creditId: string, paymentData: any, userId: string) => {
    try {
        const timestamp = Date.now();
        db.runSync(
            'INSERT INTO pending_payments (timestamp, creditId, paymentData, userId) VALUES (?, ?, ?, ?)',
            [timestamp, creditId, JSON.stringify(paymentData), userId]
        );
        console.log(`[DB] Pago pendiente guardado: ${timestamp}`);
        return timestamp;
    } catch (error) {
        console.error('[DB] Error guardando pago pendiente:', error);
        throw error;
    }
};

// Guardar crédito pendiente
export const savePendingCredit = async (creditData: any, userId: string) => {
    try {
        const timestamp = Date.now();
        db.runSync(
            'INSERT INTO pending_credits (timestamp, creditData, userId) VALUES (?, ?, ?)',
            [timestamp, JSON.stringify(creditData), userId]
        );
        console.log(`[DB] Crédito pendiente guardado: ${timestamp}`);
        return timestamp;
    } catch (error) {
        console.error('[DB] Error guardando crédito pendiente:', error);
        throw error;
    }
};

// Obtener estadísticas offline
export const getOfflineStats = async () => {
    try {
        const pendingPaymentsResult = db.getFirstSync('SELECT COUNT(*) as count FROM pending_payments');
        const pendingCreditsResult = db.getFirstSync('SELECT COUNT(*) as count FROM pending_credits');
        const offlineClientsResult = db.getFirstSync('SELECT COUNT(*) as count FROM offline_clients');
        const offlineCreditsResult = db.getFirstSync('SELECT COUNT(*) as count FROM offline_credits');
        
        return {
            pendingPayments: (pendingPaymentsResult as any)?.count || 0,
            pendingCredits: (pendingCreditsResult as any)?.count || 0,
            offlineClients: (offlineClientsResult as any)?.count || 0,
            offlineCredits: (offlineCreditsResult as any)?.count || 0
        };
    } catch (error) {
        console.error('[DB] Error obteniendo estadísticas:', error);
        return {
            pendingPayments: 0,
            pendingCredits: 0,
            offlineClients: 0,
            offlineCredits: 0
        };
    }
};
