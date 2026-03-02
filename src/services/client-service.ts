
'use client';

import type { Client, User } from '@/lib/types';
import { getClient as getClientServer } from './client-service-server';
import { updateClient as updateClientServer } from '@/app/clients/actions';

/**
 * Obtiene un cliente por su ID. Llama a una Server Action.
 */
export const getClient = async (id: string): Promise<Client | null> => {
  try {
    return await getClientServer(id);
  } catch (error) {
    console.error("Error fetching client (client-side service):", error);
    return null;
  }
};

/**
 * Actualiza los datos de un cliente. Llama a una Server Action.
 */
export const updateClient = async (id: string, clientData: Partial<Client>, actor: User): Promise<void> => {
    const result = await updateClientServer(id, clientData, actor);
    if (!result.success) {
      throw new Error(result.error || 'Failed to update client.');
    }
};
