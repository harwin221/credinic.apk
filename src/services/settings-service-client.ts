
'use server';

import { getSystemSettings as getSettingsDb, updateSystemStatus as updateSystemDb, updateBranchStatus as updateBranchDb, type SystemSettings } from './settings-service';
import { revalidatePath } from 'next/cache';

export async function getSystemSettings(): Promise<SystemSettings> {
    return await getSettingsDb();
}

export async function updateSystemStatus(isOpen: boolean): Promise<void> {
    await updateSystemDb(isOpen);
    revalidatePath('/settings/access-control');
}

export async function updateBranchStatus(branchId: string, isOpen: boolean): Promise<void> {
    await updateBranchDb(branchId, isOpen);
    revalidatePath('/settings/access-control');
}

export type { SystemSettings };
