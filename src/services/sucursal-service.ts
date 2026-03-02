
'use server';

import { query } from '@/lib/mysql';
import type { Sucursal, User } from '@/lib/types';
import { createLog } from './audit-log-service';
import { revalidatePath } from 'next/cache';

export const getSucursales = async (): Promise<Sucursal[]> => {
    const rows: any = await query('SELECT * FROM sucursales ORDER BY name ASC');
    return rows as Sucursal[];
};

export const addSucursal = async (sucursalData: Omit<Sucursal, 'id'>, actor: User): Promise<{ success: boolean, id?: string, error?: string }> => {
    try {
        const newId = `suc_${Date.now()}`;
        await query('INSERT INTO sucursales (id, name, managerId, managerName) VALUES (?, ?, ?, ?)', [newId, sucursalData.name, sucursalData.managerId, sucursalData.managerName]);
        await createLog(actor, 'settings:branch_add', `Creó la sucursal ${sucursalData.name}.`, { targetId: newId });
        revalidatePath('/settings/sucursales');
        return { success: true, id: newId };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

export const updateSucursal = async (id: string, sucursalData: Partial<Sucursal>, actor: User): Promise<{ success: boolean, error?: string }> => {
    try {
        await query('UPDATE sucursales SET name = ?, managerId = ?, managerName = ? WHERE id = ?', [sucursalData.name, sucursalData.managerId, sucursalData.managerName, id]);
        await createLog(actor, 'settings:branch_update', `Actualizó la sucursal ${sucursalData.name}.`, { targetId: id, details: sucursalData });
        revalidatePath('/settings/sucursales');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

export const deleteSucursal = async (id: string, actor: User): Promise<{ success: boolean, error?: string }> => {
    try {
        await query('DELETE FROM sucursales WHERE id = ?', [id]);
        await createLog(actor, 'settings:branch_delete', `Eliminó la sucursal con ID ${id}.`, { targetId: id });
        revalidatePath('/settings/sucursales');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};
