
'use server';

import { query, getNextSequenceValue } from '@/lib/mysql';
import type { Client, AppUser as User, ClientInteraction, CreditDetail } from '@/lib/types';
import { normalizeString, calculateCreditStatusDetails, decodeData, encodeData, calculateAveragePaymentDelay } from '@/lib/utils';
import { createLog } from './audit-log-service';
import { revalidatePath } from 'next/cache';
import { getCreditsAdmin, getCredit } from './credit-service-server';
import { getPaidCreditsForGestor } from './portfolio-service';
import { nowInNicaragua, isoToMySQLDateTime, isoToMySQLDateTimeNoon, toISOString } from '@/lib/date-utils';

export async function createClient(
    clientData: Omit<Client, 'id' | 'clientNumber' | 'createdAt'>,
    actor: User,
): Promise<{ success: boolean; clientId?: string; error?: string }> {
    try {
        // GESTOR no puede crear clientes
        if (actor.role.toUpperCase() === 'GESTOR') {
            return { success: false, error: 'Los gestores no tienen permisos para crear clientes. Solo pueden crear solicitudes de crédito para clientes existentes en su cartera.' };
        }

        const newClientId = `cli_${Date.now()}`;
        const sequence = await getNextSequenceValue('clientNumber');
        const clientNumber = `CLI-${String(sequence).padStart(4, '0')}`;

        const { name, firstName, lastName, cedula, phone, sex, civilStatus, employmentType, sucursal, sucursalName: providedSucursalName, department, municipality, neighborhood, address, references, asalariadoInfo, comercianteInfo, tags, interactions } = clientData;

        // Fetch sucursal name if not provided
        let finalSucursalName = providedSucursalName;
        if (sucursal && !finalSucursalName) {
            const sucursalResult: any = await query('SELECT name FROM sucursales WHERE id = ?', [sucursal]);
            if (sucursalResult.length > 0) {
                finalSucursalName = sucursalResult[0].name;
            }
        }

        // Obtener fecha actual en Nicaragua
        const createdAtNicaragua = isoToMySQLDateTimeNoon(nowInNicaragua());

        const clientSql = `
        INSERT INTO clients (id, clientNumber, name, firstName, lastName, cedula, phone, sex, civilStatus, employmentType, sucursal_id, sucursal_name, department, municipality, neighborhood, address, tags, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

        await query(clientSql, [
            newClientId, clientNumber, name, firstName, lastName, cedula, phone, sex, civilStatus, employmentType, sucursal, finalSucursalName, department, municipality, neighborhood, address, JSON.stringify(tags || []), createdAtNicaragua, createdAtNicaragua
        ]);

        if (employmentType === 'asalariado' && asalariadoInfo) {
            await query('INSERT INTO asalariado_info (clientId, companyName, jobAntiquity, companyAddress) VALUES (?, ?, ?, ?)', [newClientId, asalariadoInfo.companyName, asalariadoInfo.jobAntiquity, asalariadoInfo.companyAddress]);
        } else if (employmentType === 'comerciante' && comercianteInfo) {
            await query('INSERT INTO comerciante_info (clientId, businessAntiquity, businessAddress, economicActivity) VALUES (?, ?, ?, ?)', [newClientId, comercianteInfo.businessAntiquity, comercianteInfo.businessAddress, comercianteInfo.economicActivity]);
        }

        if (references && references.length > 0) {
            for (const ref of references) {
                const newRefId = `ref_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
                await query('INSERT INTO personal_references (id, clientId, name, phone, address, relationship) VALUES (?, ?, ?, ?, ?, ?)',
                    [newRefId, newClientId, ref.name, ref.phone, ref.address, ref.relationship]
                );
            }
        }

        await createLog(actor, 'client:create', `Creó el cliente ${name} con código ${clientNumber}.`, { targetId: newClientId });

        revalidatePath('/clients');
        return { success: true, clientId: newClientId };

    } catch (error: any) {
        console.error("Error al crear el cliente en MySQL:", error);
        return { success: false, error: error.message || 'No se pudo crear el cliente.' };
    }
}

export async function updateClient(
    id: string,
    clientData: Partial<Client>,
    actor: User
): Promise<{ success: boolean; error?: string }> {
    try {
        // Verificar permisos de edición
        const actorRole = actor.role.toUpperCase();
        if (!['ADMINISTRADOR', 'GERENTE', 'OPERATIVO'].includes(actorRole)) {
            return { success: false, error: 'No tienes permisos para editar clientes.' };
        }

        // Si es GERENTE u OPERATIVO, verificar que el cliente pertenece a su sucursal
        if (['GERENTE', 'OPERATIVO'].includes(actorRole)) {
            const clientRows: any = await query('SELECT sucursal_id FROM clients WHERE id = ? LIMIT 1', [id]);
            if (clientRows.length === 0) {
                return { success: false, error: 'Cliente no encontrado.' };
            }

            if (clientRows[0].sucursal_id !== actor.sucursal) {
                return { success: false, error: 'No tienes permisos para editar este cliente.' };
            }
        }
        const { references, asalariadoInfo, comercianteInfo, tags, interactions, sucursal, sucursalName, ...clientFields } = clientData;

        // Build the dynamic UPDATE query for the main 'clients' table
        const fieldsToUpdate: { [key: string]: any } = { ...clientFields };
        if (sucursal !== undefined) fieldsToUpdate.sucursal_id = sucursal;
        if (sucursalName !== undefined) fieldsToUpdate.sucursal_name = sucursalName;

        if (tags !== undefined) {
            fieldsToUpdate['tags'] = JSON.stringify(tags || []);
        }

        // Asegurar que updatedAt se guarde a las 12:00:00 para evitar problemas de zona horaria
        fieldsToUpdate['updatedAt'] = isoToMySQLDateTimeNoon(nowInNicaragua());

        if (Object.keys(fieldsToUpdate).length > 0) {
            // No codificar la cédula - guardarla tal cual
            const updateSetClause = Object.keys(fieldsToUpdate).map(key => `${key} = ?`).join(', ');
            const updateValues = Object.values(fieldsToUpdate);
            await query(`UPDATE clients SET ${updateSetClause} WHERE id = ?`, [...updateValues, id]);
        }

        // Handle related tables with a "delete and re-insert" strategy
        await query('DELETE FROM asalariado_info WHERE clientId = ?', [id]);
        if (clientFields.employmentType === 'asalariado' && asalariadoInfo) {
            await query('INSERT INTO asalariado_info (clientId, companyName, jobAntiquity, companyAddress) VALUES (?, ?, ?, ?)', [id, asalariadoInfo.companyName, asalariadoInfo.jobAntiquity, asalariadoInfo.companyAddress]);
        }

        await query('DELETE FROM comerciante_info WHERE clientId = ?', [id]);
        if (clientFields.employmentType === 'comerciante' && comercianteInfo) {
            await query('INSERT INTO comerciante_info (clientId, businessAntiquity, businessAddress, economicActivity) VALUES (?, ?, ?, ?)', [id, comercianteInfo.businessAntiquity, comercianteInfo.businessAddress, comercianteInfo.economicActivity]);
        }

        await query('DELETE FROM personal_references WHERE clientId = ?', [id]);
        if (references && references.length > 0) {
            for (const ref of references) {
                const newRefId = `ref_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
                await query(
                    'INSERT INTO personal_references (id, clientId, name, phone, address, relationship) VALUES (?, ?, ?, ?, ?, ?)',
                    [newRefId, id, ref.name, ref.phone, ref.address, ref.relationship]
                );
            }
        }

        await createLog(actor, 'client:update', `Actualizó los datos del cliente ${clientData.name || ''}.`, { targetId: id, details: clientData });
        revalidatePath(`/clients/${id}`);
        revalidatePath('/clients');
        return { success: true };

    } catch (error: any) {
        console.error(`Error al actualizar cliente ${id}:`, error);
        return { success: false, error: 'Ocurrió un error al procesar la solicitud a la base de datos.' };
    }
}


export async function deleteClient(
    clientId: string,
    actor: User,
): Promise<{ success: boolean; error?: string }> {
    try {
        // Solo ADMINISTRADOR puede eliminar clientes
        if (actor.role.toUpperCase() !== 'ADMINISTRADOR') {
            return { success: false, error: 'Solo los administradores pueden eliminar clientes.' };
        }

        const credits: any = await query('SELECT id FROM credits WHERE clientId = ? LIMIT 1', [clientId]);
        if (credits.length > 0) {
            return { success: false, error: 'No se puede eliminar un cliente con créditos asociados.' };
        }

        // Eliminar de las tablas relacionadas primero para evitar errores de integridad
        await query('DELETE FROM asalariado_info WHERE clientId = ?', [clientId]);
        await query('DELETE FROM comerciante_info WHERE clientId = ?', [clientId]);
        await query('DELETE FROM personal_references WHERE clientId = ?', [clientId]);
        await query('DELETE FROM interactions WHERE clientId = ?', [clientId]);

        await query('DELETE FROM clients WHERE id = ?', [clientId]);
        await createLog(actor, 'client:delete', `Eliminó al cliente con ID ${clientId}.`, { targetId: clientId });

        revalidatePath('/clients');
        return { success: true };

    } catch (error: any) {
        console.error(`Error al eliminar el cliente ${clientId}:`, error);
        return { success: false, error: error.message };
    }
}

export const getClient = async (id: string): Promise<Client | null> => {
    const clientRows: any = await query('SELECT * FROM clients WHERE id = ? LIMIT 1', [id]);
    if (clientRows.length === 0) return null;

    let client = clientRows[0];

    // Decodificar la cédula
    client.cedula = decodeData(client.cedula);

    const [asalariadoRows, comercianteRows, referenceRows, interactionRows]: any = await Promise.all([
        query('SELECT * FROM asalariado_info WHERE clientId = ?', [id]),
        query('SELECT * FROM comerciante_info WHERE clientId = ?', [id]),
        query('SELECT * FROM personal_references WHERE clientId = ?', [id]),
        query('SELECT * FROM interactions WHERE clientId = ? ORDER BY date DESC', [id])
    ]);

    return {
        ...client,
        sucursal: client.sucursal_id,
        sucursalName: client.sucursal_name,
        tags: client.tags && typeof client.tags === 'string' ? JSON.parse(client.tags) : [],
        asalariadoInfo: asalariadoRows[0] || null,
        comercianteInfo: comercianteRows[0] || null,
        references: referenceRows,
        interactions: interactionRows.map((row: any) => ({ ...row, date: isoToMySQLDateTime(row.date) || nowInNicaragua() })),
    } as Client;
};

export const getClients = async (options: { searchTerm?: string; user?: User, forSearch?: boolean }): Promise<{
    clients: Client[],
    reloanClients?: Client[],
    renewalClients?: Client[],
    allGestorClients?: (Client & { latestCreditId?: string })[]
}> => {
    const { searchTerm, user, forSearch = false } = options;

    // Si es un gestor y está haciendo una búsqueda general, no filtramos por su cartera.
    const isGestorGlobalSearch = user?.role === 'GESTOR' && forSearch;

    let baseSql = 'SELECT c.* FROM clients c';
    const params: any[] = [];
    let whereClauses: string[] = [];

    // Lógica de búsqueda principal
    if (searchTerm) {
        whereClauses.push(`(c.name LIKE ? OR c.cedula LIKE ? OR c.clientNumber LIKE ?)`);
        params.push(`%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`);
    }

    // Filtrado por rol de usuario
    if (user && !isGestorGlobalSearch) {
        const userRole = user.role.toUpperCase();
        if (userRole === 'GESTOR') {
            const gestorCredits: any[] = await query('SELECT DISTINCT clientId FROM credits WHERE collectionsManager = ?', [user.fullName]);
            const clientIds = gestorCredits.map(c => c.clientId);
            if (clientIds.length > 0) {
                const placeholders = clientIds.map(() => '?').join(',');
                whereClauses.push(`c.id IN (${placeholders})`);
                params.push(...clientIds);
            } else {
                whereClauses.push('1 = 0');
            }
        } else if (userRole === 'GERENTE' || userRole === 'OPERATIVO') {
            // GERENTE y OPERATIVO solo ven clientes de su sucursal
            if (user.sucursal) {
                whereClauses.push('c.sucursal_id = ?');
                params.push(user.sucursal);
            } else {
                // Si no tienen sucursal asignada, no pueden ver ningún cliente
                whereClauses.push('1 = 0');
            }
        }
        // ADMINISTRADOR y FINANZAS pueden ver todos los clientes (sin filtro adicional)
    }

    if (whereClauses.length > 0) {
        baseSql += ' WHERE ' + whereClauses.join(' AND ');
    }
    baseSql += ' ORDER BY c.createdAt DESC';

    const clientRows: any = await query(baseSql, params);

    const clients = clientRows.map((c: any) => {
        console.log('Raw cedula from DB:', c.cedula);
        const decodedCedula = decodeData(c.cedula);
        console.log('Decoded cedula:', decodedCedula);

        return {
            ...c,
            sucursal: c.sucursal_id,
            sucursalName: c.sucursal_name,
            cedula: decodedCedula,
            tags: c.tags && typeof c.tags === 'string' ? JSON.parse(c.tags) : [],
        };
    }) as Client[];

    if (user?.role === 'GESTOR' && !forSearch) {
        // 1. Obtener créditos básicos activos del gestor
        const { credits: basicActiveCredits } = await getCreditsAdmin({ gestorName: user.fullName, status: 'Active', user });
        const activeCreditIds = basicActiveCredits.map(c => c.id);

        // 2. Obtener créditos pagados recientes (para Renovación)
        const paidCredits = await getPaidCreditsForGestor(user.fullName, 30);
        const paidCreditIds = paidCredits.map(c => c.id);

        // Unificar IDs de créditos que nos interesan procesar
        const interestCreditIds = [...new Set([...activeCreditIds, ...paidCreditIds])];

        let reloanClients: Client[] = [];
        let renewalClients: Client[] = [];

        if (interestCreditIds.length > 0) {
            const placeholders = interestCreditIds.map(() => '?').join(',');

            // CARGA MASIVA: Traer todos los planes de pago de una sola vez
            const allPaymentPlansRows: any[] = await query(
                `SELECT * FROM payment_plan WHERE creditId IN (${placeholders}) ORDER BY creditId, paymentNumber`,
                interestCreditIds
            );

            // CARGA MASIVA: Traer todos los pagos registrados de una sola vez
            const allPaymentsRows: any[] = await query(
                `SELECT * FROM payments_registered WHERE creditId IN (${placeholders}) ORDER BY creditId, paymentDate DESC`,
                interestCreditIds
            );

            // Organizar datos por CreditId para acceso rápido (O(1))
            const plansMap: Record<string, any[]> = {};
            allPaymentPlansRows.forEach(p => {
                const cid = p.creditId;
                if (!plansMap[cid]) plansMap[cid] = [];
                plansMap[cid].push({ ...p, paymentDate: toISOString(p.paymentDate) });
            });

            const paymentsMap: Record<string, any[]> = {};
            allPaymentsRows.forEach(p => {
                const cid = p.creditId;
                if (!paymentsMap[cid]) paymentsMap[cid] = [];
                paymentsMap[cid].push({ ...p, paymentDate: toISOString(p.paymentDate) });
            });

            // Función auxiliar para "armar" un crédito completo en memoria
            const assembleCredit = (basic: any) => {
                return {
                    ...basic,
                    paymentPlan: plansMap[basic.id] || [],
                    registeredPayments: paymentsMap[basic.id] || []
                } as CreditDetail;
            };

            // Lógica de Représtamo (sobre créditos Activos)
            const eligibleReloanClientIds = new Set<string>();
            activeCreditIds.forEach(id => {
                const basic = basicActiveCredits.find(c => c.id === id);
                if (!basic) return;
                const credit = assembleCredit(basic);

                const { remainingBalance } = calculateCreditStatusDetails(credit);
                const totalPaid = credit.totalAmount - remainingBalance;
                const paidPercentage = credit.totalAmount > 0 ? (totalPaid / credit.totalAmount) * 100 : 0;

                if (paidPercentage >= 75) {
                    const { avgLateDaysForCredit } = calculateAveragePaymentDelay(credit);
                    if (avgLateDaysForCredit <= 2.5) {
                        eligibleReloanClientIds.add(credit.clientId);
                    }
                }
            });
            reloanClients = clients.filter(c => eligibleReloanClientIds.has(c.id));

            // Lógica de Renovación (sobre créditos Pagados)
            const activeClientIdsSet = new Set(basicActiveCredits.map(c => c.clientId));
            const eligibleRenewalClientIds = new Set<string>();
            paidCreditIds.forEach(id => {
                const basic = paidCredits.find(c => c.id === id);
                if (!basic) return;
                const credit = assembleCredit(basic);

                const { avgLateDaysForCredit } = calculateAveragePaymentDelay(credit);
                if (avgLateDaysForCredit <= 2.5 && !activeClientIdsSet.has(credit.clientId)) {
                    eligibleRenewalClientIds.add(credit.clientId);
                }
            });
            renewalClients = clients.filter(c => eligibleRenewalClientIds.has(c.id));
        }

        const gestorClientIds = new Set(clients.map(c => c.id));
        const allGestorClientsData = clients.filter(c => gestorClientIds.has(c.id)).map(client => {
            const latestCredit = basicActiveCredits.find((ac: any) => ac.clientId === client.id);
            return { ...client, latestCreditId: latestCredit?.id };
        });

        return { clients: [], reloanClients, renewalClients, allGestorClients: allGestorClientsData };
    }

    return { clients };
};

export async function addInteraction(
    clientId: string,
    interaction: Omit<ClientInteraction, 'id'>,
    actor: User
): Promise<{ success: boolean, error?: string }> {
    try {
        const sql = 'INSERT INTO interactions (clientId, date, user, type, notes) VALUES (?, ?, ?, ?, ?)';
        const interactionDate = isoToMySQLDateTime(interaction.date);
        await query(sql, [clientId, interactionDate, interaction.user, interaction.type, interaction.notes]);

        revalidatePath(`/clients/${clientId}`);
        return { success: true };
    } catch (error: any) {
        console.error(`Error adding interaction for client ${clientId}:`, error);
        return { success: false, error: error.message };
    }
}
