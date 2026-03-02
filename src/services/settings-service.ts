
import { query } from '@/lib/mysql';
import { Sucursal } from '@/lib/types';

export interface SystemSettings {
    isSystemOpen: boolean;
    branchSettings: Record<string, boolean>; // branchId -> isOpen
}

const DEFAULT_SETTINGS: SystemSettings = {
    isSystemOpen: true,
    branchSettings: {},
};

const SETTING_KEY = 'access_control';

// Helper to ensure table exists
async function ensureTableExists() {
    const sql = `
    CREATE TABLE IF NOT EXISTS system_settings (
      setting_key VARCHAR(50) PRIMARY KEY,
      setting_value JSON NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `;
    await query(sql, []);
}

export async function getSystemSettings(): Promise<SystemSettings> {
    await ensureTableExists();

    const rows: any[] = await query('SELECT setting_value FROM system_settings WHERE setting_key = ?', [SETTING_KEY]);

    if (rows.length > 0) {
        const data = rows[0].setting_value;
        // Parse if it comes as string (depends on driver version sometimes), but usually JSON type is auto-parsed or stringified
        return typeof data === 'string' ? JSON.parse(data) : data;
    }

    // If not exists, create default
    await query('INSERT INTO system_settings (setting_key, setting_value) VALUES (?, ?)', [SETTING_KEY, JSON.stringify(DEFAULT_SETTINGS)]);
    return DEFAULT_SETTINGS;
}

export async function updateSystemStatus(isOpen: boolean): Promise<void> {
    const settings = await getSystemSettings();
    settings.isSystemOpen = isOpen;
    await query('UPDATE system_settings SET setting_value = ? WHERE setting_key = ?', [JSON.stringify(settings), SETTING_KEY]);
}

export async function updateBranchStatus(branchId: string, isOpen: boolean): Promise<void> {
    const settings = await getSystemSettings();
    if (!settings.branchSettings) settings.branchSettings = {};
    settings.branchSettings[branchId] = isOpen;
    await query('UPDATE system_settings SET setting_value = ? WHERE setting_key = ?', [JSON.stringify(settings), SETTING_KEY]);
}

export async function checkAccess(role: string, branchId?: string): Promise<{ allowed: boolean; reason?: string }> {
    // 1. Admins and Managers always allowed
    if (['ADMINISTRADOR', 'GERENTE'].includes(role.toUpperCase())) {
        return { allowed: true };
    }

    const settings = await getSystemSettings();

    // 2. Check Global Status
    if (!settings.isSystemOpen) {
        return { allowed: false, reason: 'El sistema está cerrado temporalmente por el administrador.' };
    }

    // 3. Check Branch Status (if user belongs to a branch)
    if (branchId) {
        // If branch setting exists and is false, deny
        // If branch setting doesn't exist, assume open (default)
        if (settings.branchSettings && settings.branchSettings[branchId] === false) {
            return { allowed: false, reason: 'El acceso a su sucursal está cerrado temporalmente.' };
        }
    }

    return { allowed: true };
}
