/**
 * Tests para verificar que las utilidades de fecha funcionan correctamente
 */

import { 
  toISOString, 
  nowInNicaragua, 
  formatDateForUser, 
  formatDateTimeForUser,
  userInputToISO,
  todayInNicaragua,
  isoToMySQLDateTime,
  isoToMySQLDate,
  isValidISODate
} from '../date-utils';

describe('Date Utils', () => {
  
  describe('toISOString', () => {
    it('should convert Date object to ISO string', () => {
      const date = new Date('2025-10-31T14:30:00.000Z');
      const result = toISOString(date);
      expect(result).toBe('2025-10-31T14:30:00.000Z');
    });

    it('should convert string date to ISO string', () => {
      const result = toISOString('2025-10-31');
      expect(result).toMatch(/^2025-10-31T00:00:00\.000Z$/);
    });

    it('should return null for invalid input', () => {
      expect(toISOString(null)).toBe(null);
      expect(toISOString(undefined)).toBe(null);
      expect(toISOString('invalid')).toBe(null);
    });
  });

  describe('nowInNicaragua', () => {
    it('should return current time in ISO format', () => {
      const result = nowInNicaragua();
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });
  });

  describe('formatDateForUser', () => {
    it('should format ISO date for user display', () => {
      const isoDate = '2025-10-31T20:30:00.000Z';
      const result = formatDateForUser(isoDate);
      // Debería mostrar en hora local de Nicaragua
      expect(result).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
    });

    it('should return N/A for null input', () => {
      expect(formatDateForUser(null)).toBe('N/A');
      expect(formatDateForUser(undefined)).toBe('N/A');
    });

    it('should handle custom format', () => {
      const isoDate = '2025-10-31T20:30:00.000Z';
      const result = formatDateForUser(isoDate, 'yyyy-MM-dd');
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('formatDateTimeForUser', () => {
    it('should format ISO datetime for user display', () => {
      const isoDate = '2025-10-31T20:30:00.000Z';
      const result = formatDateTimeForUser(isoDate);
      expect(result).toMatch(/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2}$/);
    });
  });

  describe('userInputToISO', () => {
    it('should convert user date input to ISO', () => {
      const result = userInputToISO('2025-10-31');
      expect(result).toMatch(/^2025-10-31T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it('should return null for invalid input', () => {
      expect(userInputToISO('')).toBe(null);
      expect(userInputToISO('invalid')).toBe(null);
    });
  });

  describe('todayInNicaragua', () => {
    it('should return today in Nicaragua timezone', () => {
      const result = todayInNicaragua();
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('isoToMySQLDateTime', () => {
    it('should convert ISO to MySQL DATETIME format', () => {
      const isoDate = '2025-10-31T14:30:00.000Z';
      const result = isoToMySQLDateTime(isoDate);
      expect(result).toBe('2025-10-31 14:30:00');
    });

    it('should return empty string for invalid input', () => {
      expect(isoToMySQLDateTime('')).toBe('');
      expect(isoToMySQLDateTime('invalid')).toBe('');
    });
  });

  describe('isoToMySQLDate', () => {
    it('should convert ISO to MySQL DATE format', () => {
      const isoDate = '2025-10-31T14:30:00.000Z';
      const result = isoToMySQLDate(isoDate);
      expect(result).toBe('2025-10-31');
    });
  });

  describe('isValidISODate', () => {
    it('should validate ISO date strings', () => {
      expect(isValidISODate('2025-10-31T14:30:00.000Z')).toBe(true);
      expect(isValidISODate('2025-10-31')).toBe(true);
      expect(isValidISODate('invalid')).toBe(false);
      expect(isValidISODate('')).toBe(false);
    });
  });

});

// Test de integración para verificar el flujo completo
describe('Date Integration Flow', () => {
  it('should handle complete date flow: input -> storage -> display', () => {
    // 1. Usuario ingresa fecha
    const userInput = '2025-10-31';
    
    // 2. Se convierte a ISO para almacenamiento
    const isoForStorage = userInputToISO(userInput);
    expect(isoForStorage).toBeTruthy();
    
    // 3. Se convierte a formato MySQL para DB
    const mysqlFormat = isoToMySQLDateTime(isoForStorage!);
    expect(mysqlFormat).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
    
    // 4. Se recupera de DB y se muestra al usuario
    const displayFormat = formatDateForUser(isoForStorage!);
    expect(displayFormat).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
  });
});