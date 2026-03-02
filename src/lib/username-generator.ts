/**
 * Generador inteligente de nombres de usuario
 * Crea usuarios únicos basados en nombres completos
 */

import { query } from './mysql';

/**
 * Normaliza un nombre removiendo acentos y caracteres especiales
 */
function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remover acentos
    .replace(/[^a-z0-9\s]/g, '') // Solo letras, números y espacios
    .trim();
}

/**
 * Extrae el primer nombre y primer apellido de un nombre completo
 */
function extractFirstNameAndLastName(fullName: string): { firstName: string; lastName: string } {
  const normalized = normalizeString(fullName);
  const parts = normalized.split(/\s+/).filter(part => part.length > 0);
  
  if (parts.length === 0) {
    throw new Error('Nombre inválido');
  }
  
  const firstName = parts[0];
  const lastName = parts.length > 1 ? parts[1] : '';
  
  return { firstName, lastName };
}

/**
 * Genera variaciones de nombre de usuario
 */
function generateUsernameVariations(firstName: string, lastName: string): string[] {
  const variations: string[] = [];
  
  if (firstName && lastName) {
    // Combinaciones principales
    variations.push(`${firstName}.${lastName}`);
    variations.push(`${firstName}${lastName}`);
    variations.push(`${firstName}_${lastName}`);
    variations.push(`${firstName}${lastName.charAt(0)}`);
    variations.push(`${firstName.charAt(0)}${lastName}`);
    
    // Con números
    for (let i = 1; i <= 99; i++) {
      variations.push(`${firstName}.${lastName}${i}`);
      variations.push(`${firstName}${lastName}${i}`);
      variations.push(`${firstName}_${lastName}${i}`);
    }
  } else if (firstName) {
    // Solo primer nombre
    variations.push(firstName);
    for (let i = 1; i <= 99; i++) {
      variations.push(`${firstName}${i}`);
    }
  }
  
  return variations;
}

/**
 * Verifica si un nombre de usuario ya existe en la base de datos
 */
async function isUsernameAvailable(username: string): Promise<boolean> {
  try {
    const result: any = await query('SELECT id FROM users WHERE username = ? LIMIT 1', [username]);
    return result.length === 0;
  } catch (error) {
    console.error('Error checking username availability:', error);
    return false;
  }
}

/**
 * Genera un nombre de usuario único basado en el nombre completo
 * 
 * Ejemplos:
 * - "Harwin Manuel Rueda Herrera" → "harwin.rueda"
 * - "María José González" → "maria.gonzalez"
 * - "José" → "jose"
 * - Si "harwin.rueda" existe → "harwin.rueda1", "harwin.rueda2", etc.
 */
export async function generateUniqueUsername(fullName: string): Promise<string> {
  try {
    const { firstName, lastName } = extractFirstNameAndLastName(fullName);
    const variations = generateUsernameVariations(firstName, lastName);
    
    // Buscar la primera variación disponible
    for (const username of variations) {
      if (await isUsernameAvailable(username)) {
        return username;
      }
    }
    
    // Si todas las variaciones están ocupadas, usar timestamp como último recurso
    const timestamp = Date.now().toString().slice(-6);
    const fallbackUsername = `${firstName}${timestamp}`;
    
    if (await isUsernameAvailable(fallbackUsername)) {
      return fallbackUsername;
    }
    
    // Último recurso: UUID corto
    const { randomUUID } = await import('crypto');
    return `user${randomUUID().slice(0, 8)}`;
    
  } catch (error) {
    console.error('Error generating username:', error);
    throw new Error('No se pudo generar un nombre de usuario único');
  }
}

/**
 * Valida que un nombre de usuario tenga el formato correcto
 */
export function validateUsername(username: string): { valid: boolean; error?: string } {
  if (!username || username.length < 3) {
    return { valid: false, error: 'El usuario debe tener al menos 3 caracteres' };
  }
  
  if (username.length > 50) {
    return { valid: false, error: 'El usuario no puede exceder 50 caracteres' };
  }
  
  if (!/^[a-zA-Z0-9._-]+$/.test(username)) {
    return { valid: false, error: 'El usuario solo puede contener letras, números, puntos, guiones y guiones bajos' };
  }
  
  if (username.startsWith('.') || username.endsWith('.')) {
    return { valid: false, error: 'El usuario no puede empezar o terminar con punto' };
  }
  
  if (username.includes('..')) {
    return { valid: false, error: 'El usuario no puede contener puntos consecutivos' };
  }
  
  return { valid: true };
}

/**
 * Sugiere nombres de usuario alternativos si el deseado no está disponible
 */
export async function suggestAlternativeUsernames(desiredUsername: string, fullName?: string): Promise<string[]> {
  const suggestions: string[] = [];
  
  // Si se proporciona el nombre completo, generar basado en él
  if (fullName) {
    try {
      const { firstName, lastName } = extractFirstNameAndLastName(fullName);
      const variations = generateUsernameVariations(firstName, lastName).slice(0, 5);
      
      for (const variation of variations) {
        if (await isUsernameAvailable(variation)) {
          suggestions.push(variation);
        }
      }
    } catch (error) {
      // Continuar con sugerencias basadas en el usuario deseado
    }
  }
  
  // Sugerencias basadas en el usuario deseado
  const baseUsername = desiredUsername.replace(/\d+$/, ''); // Remover números al final
  
  for (let i = 1; i <= 10 && suggestions.length < 5; i++) {
    const suggestion = `${baseUsername}${i}`;
    if (await isUsernameAvailable(suggestion)) {
      suggestions.push(suggestion);
    }
  }
  
  // Sugerencias con guiones bajos y puntos
  if (suggestions.length < 5) {
    const alternatives = [
      `${baseUsername}_1`,
      `${baseUsername}.1`,
      `${baseUsername}_user`,
      `user_${baseUsername}`,
      `${baseUsername}${new Date().getFullYear().toString().slice(-2)}`
    ];
    
    for (const alt of alternatives) {
      if (suggestions.length >= 5) break;
      if (await isUsernameAvailable(alt)) {
        suggestions.push(alt);
      }
    }
  }
  
  return suggestions;
}