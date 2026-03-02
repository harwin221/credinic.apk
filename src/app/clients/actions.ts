
'use server';

import { 
    createClient as createClientService, 
    updateClient as updateClientService, 
    deleteClient as deleteClientService,
    addInteraction as addInteractionToClient
} from '@/services/client-service-server';
import type { Client, AppUser as User, ClientInteraction } from '@/lib/types';
import { revalidatePath } from 'next/cache';
import { encodeData } from '@/lib/utils';
import { query } from '@/lib/mysql';


export async function createClient(
  clientData: Omit<Client, 'id' | 'clientNumber' | 'createdAt'>,
  actor: User,
): Promise<{ success: boolean; clientId?: string; error?: string }> {
    return createClientService(clientData, actor);
}


export async function updateClient(
    id: string, 
    clientData: Partial<Client>,
    actor: User,
): Promise<{ success: boolean; error?: string }> {
    return updateClientService(id, clientData, actor);
}

export async function deleteClient(
    clientId: string,
    actor: User,
): Promise<{ success: boolean; error?: string }> {
    return deleteClientService(clientId, actor);
}

export async function addInteraction(
    clientId: string, 
    interaction: Omit<ClientInteraction, 'id'>, 
    actor: User
): Promise<{ success: boolean; error?: string }> {
    return addInteractionToClient(clientId, interaction, actor);
}

/**
 * Verificación del lado del servidor para la existencia de la cédula en MySQL.
 * @param cedula La cédula a verificar.
 * @param currentId ID opcional del cliente que se está editando, para excluirlo de la verificación.
 * @returns Una promesa que se resuelve a true si la cédula existe para otro cliente.
 */
export async function checkCedulaExists(cedula: string, currentId?: string): Promise<boolean> {
  let sql = 'SELECT id FROM clients WHERE cedula = ? LIMIT 1';
  const params: any[] = [cedula];

  if (currentId) {
    sql = 'SELECT id FROM clients WHERE cedula = ? AND id != ? LIMIT 1';
    params.push(currentId);
  }

  const rows: any = await query(sql, params);
  
  return rows.length > 0;
};
