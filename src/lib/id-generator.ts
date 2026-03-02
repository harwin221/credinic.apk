/**
 * Generador de IDs únicos para el sistema CrediNica
 * Utiliza crypto.randomUUID() para garantizar unicidad
 */

import { randomUUID } from 'crypto';

/**
 * Genera un ID único para créditos
 * Formato: cred_uuid
 */
export function generateCreditId(): string {
  return `cred_${randomUUID()}`;
}

/**
 * Genera un ID único para clientes
 * Formato: cli_uuid
 */
export function generateClientId(): string {
  return `cli_${randomUUID()}`;
}

/**
 * Genera un ID único para usuarios
 * Formato: user_uuid
 */
export function generateUserId(): string {
  return `user_${randomUUID()}`;
}

/**
 * Genera un ID único para sucursales
 * Formato: suc_uuid
 */
export function generateSucursalId(): string {
  return `suc_${randomUUID()}`;
}

/**
 * Genera un ID único para garantías
 * Formato: gar_uuid
 */
export function generateGuaranteeId(): string {
  return `gar_${randomUUID()}`;
}

/**
 * Genera un ID único para fiadores
 * Formato: gua_uuid
 */
export function generateGuarantorId(): string {
  return `gua_${randomUUID()}`;
}

/**
 * Genera un ID único para pagos
 * Formato: pay_uuid
 */
export function generatePaymentId(): string {
  return `pay_${randomUUID()}`;
}

/**
 * Genera un ID único para cierres de caja
 * Formato: closure_uuid
 */
export function generateClosureId(): string {
  return `closure_${randomUUID()}`;
}

/**
 * Genera un ID único genérico con prefijo personalizado
 * Formato: prefix_uuid
 */
export function generateId(prefix: string): string {
  return `${prefix}_${randomUUID()}`;
}