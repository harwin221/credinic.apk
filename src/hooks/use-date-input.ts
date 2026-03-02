/**
 * Hook para manejar inputs de fecha con conversión automática a ISO
 */

import { useState, useCallback } from 'react';
import { userInputToISO, formatDateForUser, todayInNicaragua } from '@/lib/date-utils';

interface UseDateInputOptions {
  initialValue?: string | null;
  required?: boolean;
  minDate?: string;
  maxDate?: string;
}

export const useDateInput = (options: UseDateInputOptions = {}) => {
  const { initialValue, required = false, minDate, maxDate } = options;
  
  // Estado interno para el valor mostrado al usuario (formato local)
  const [displayValue, setDisplayValue] = useState(() => {
    if (!initialValue) return '';
    return formatDateForUser(initialValue, 'yyyy-MM-dd');
  });
  
  // Estado para errores de validación
  const [error, setError] = useState<string | null>(null);
  
  // Función para obtener el valor en formato ISO
  const getISOValue = useCallback((): string | null => {
    if (!displayValue) return null;
    return userInputToISO(displayValue);
  }, [displayValue]);
  
  // Función para validar la fecha
  const validate = useCallback((value: string): string | null => {
    if (required && !value) {
      return 'Este campo es requerido';
    }
    
    if (value && !userInputToISO(value)) {
      return 'Formato de fecha inválido';
    }
    
    if (value && minDate) {
      const inputDate = new Date(value);
      const minDateTime = new Date(minDate);
      if (inputDate < minDateTime) {
        return `La fecha debe ser posterior a ${formatDateForUser(minDate)}`;
      }
    }
    
    if (value && maxDate) {
      const inputDate = new Date(value);
      const maxDateTime = new Date(maxDate);
      if (inputDate > maxDateTime) {
        return `La fecha debe ser anterior a ${formatDateForUser(maxDate)}`;
      }
    }
    
    return null;
  }, [required, minDate, maxDate]);
  
  // Función para manejar cambios en el input
  const handleChange = useCallback((value: string) => {
    setDisplayValue(value);
    const validationError = validate(value);
    setError(validationError);
  }, [validate]);
  
  // Función para establecer la fecha actual
  const setToday = useCallback(() => {
    const today = todayInNicaragua();
    setDisplayValue(today);
    setError(null);
  }, []);
  
  // Función para limpiar el valor
  const clear = useCallback(() => {
    if (displayValue !== '') {
      setDisplayValue('');
    }
    if (error !== null) {
      setError(null);
    }
  }, [displayValue, error]);
  
  // Función para establecer un valor específico desde ISO
  const setFromISO = useCallback((isoString: string | null) => {
    if (!isoString) {
      clear();
      return;
    }
    
    try {
      const formatted = formatDateForUser(isoString, 'yyyy-MM-dd');
      if (formatted && formatted !== 'N/A' && formatted !== 'Fecha Inválida') {
        setDisplayValue(formatted);
        setError(null);
      } else {
        clear();
      }
    } catch (error) {
      console.error('Error setting date from ISO:', error, 'Input:', isoString);
      clear();
    }
  }, [clear]);
  
  return {
    displayValue,
    isoValue: getISOValue(),
    error,
    isValid: !error && (displayValue ? !!getISOValue() : !required),
    handleChange,
    setToday,
    clear,
    setFromISO,
    validate: () => validate(displayValue)
  };
};