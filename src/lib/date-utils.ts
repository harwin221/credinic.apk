/**
 * Utilidades para manejo consistente de fechas en formato ISO
 * con conversión automática a hora local de Managua, Nicaragua
 */

import { format, parseISO, isValid } from 'date-fns';
import { toZonedTime, fromZonedTime, formatInTimeZone } from 'date-fns-tz';
import { es } from 'date-fns/locale';

export const NICARAGUA_TIMEZONE = 'America/Managua';

/**
 * Convierte cualquier entrada de fecha a un string ISO válido
 * Maneja Date objects, strings, números y valores nulos/undefined
 */
export const toISOString = (dateInput: any): string | null => {
    if (!dateInput) return null;

    try {
        let date: Date;

        if (dateInput instanceof Date) {
            date = dateInput;
        } else if (typeof dateInput === 'number') {
            date = new Date(dateInput);
        } else if (typeof dateInput === 'string') {
            // Si es solo fecha (YYYY-MM-DD), agregar hora para evitar problemas de zona horaria
            if (/^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
                date = new Date(`${dateInput}T00:00:00`);
            } else {
                date = parseISO(dateInput);
            }
        } else {
            // Si no es un tipo reconocido, intentar convertir a string primero
            const stringValue = String(dateInput);
            if (stringValue && stringValue !== 'null' && stringValue !== 'undefined') {
                date = parseISO(stringValue);
            } else {
                return null;
            }
        }

        if (!isValid(date)) return null;

        return date.toISOString();
    } catch (error) {
        console.error('Error converting to ISO string:', error, 'Input:', dateInput);
        return null;
    }
};

/**
 * Obtiene la fecha/hora actual como ISO string (UTC)
 * El servidor siempre debe trabajar en UTC internamente
 */
export const nowInNicaragua = (): string => {
    return new Date().toISOString();
};

/**
 * Convierte una fecha UTC a hora local de Nicaragua
 */
export const toNicaraguaTime = (utcDate: string | Date): Date => {
    const date = typeof utcDate === 'string' ? parseISO(utcDate) : utcDate;
    return toZonedTime(date, NICARAGUA_TIMEZONE);
};

/**
 * Convierte una fecha local de Nicaragua a UTC
 */
export const fromNicaraguaTime = (localDate: Date): Date => {
    return fromZonedTime(localDate, NICARAGUA_TIMEZONE);
};

/**
 * Formatea una fecha para mostrar al usuario en hora de Nicaragua
 * CORRECTO: Las fechas de MySQL vienen en UTC, convertir a Nicaragua para mostrar
 */
export const formatDateForUser = (
    dateInput: string | Date | null | undefined,
    formatString: string = 'dd/MM/yyyy'
): string => {
    if (!dateInput) return 'N/A';

    try {
        let date: Date;

        if (typeof dateInput === 'string') {
            let dateString = dateInput.trim();

            // Si es formato MySQL solo fecha (YYYY-MM-DD) sin hora
            if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
                // Para fechas sin hora, NO convertir zona horaria, solo formatear
                // Esto evita el problema de "un día antes"
                date = parseISO(dateString + 'T12:00:00'); // Usar mediodía para evitar problemas de zona horaria
                return format(date, formatString, { locale: es });
            }

            // Si es formato MySQL con hora (YYYY-MM-DD HH:MM:SS)
            if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(dateString)) {
                // MySQL devuelve fechas en UTC, agregar Z para indicarlo
                dateString = dateString.replace(' ', 'T') + 'Z';
            }

            date = parseISO(dateString);
        } else if (dateInput instanceof Date) {
            date = dateInput;
        } else {
            const stringValue = String(dateInput);
            if (stringValue && stringValue !== 'null' && stringValue !== 'undefined') {
                date = parseISO(stringValue);
            } else {
                return 'N/A';
            }
        }

        if (!isValid(date)) return 'Fecha Inválida';

        // Convertir de UTC a hora de Nicaragua y formatear
        return formatInTimeZone(date, NICARAGUA_TIMEZONE, formatString, { locale: es });
    } catch (error) {
        console.error('Error formatting date:', error, 'Input:', dateInput);
        return 'Fecha Inválida';
    }
};

/**
 * Formatea fecha y hora para mostrar al usuario
 */
export const formatDateTimeForUser = (
    dateInput: string | Date | null | undefined
): string => {
    return formatDateForUser(dateInput, 'dd/MM/yyyy HH:mm:ss');
};

/**
 * Convierte una fecha de input del usuario (asumida como hora local de Nicaragua) a ISO string
 * IMPORTANTE: Para fechas sin hora, mantener la fecha exacta sin conversión de zona horaria
 */
export const userInputToISO = (dateInput: string | any): string | null => {
    if (!dateInput) return null;

    try {
        // Asegurar que tenemos un string
        const dateString = typeof dateInput === 'string' ? dateInput : String(dateInput);

        if (!dateString || dateString === 'null' || dateString === 'undefined') {
            return null;
        }

        // Si es solo fecha (YYYY-MM-DD), NO convertir zona horaria
        // Simplemente devolver la fecha con hora 00:00:00 en formato ISO
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
            // Usar mediodía para evitar problemas de zona horaria al guardar
            return `${dateString}T12:00:00.000Z`;
        }

        // Si tiene hora, entonces sí convertir de Nicaragua a UTC
        const localDate = parseISO(dateString);
        if (!isValid(localDate)) return null;

        // Convertir de hora local de Nicaragua a UTC
        const utcDate = fromZonedTime(localDate, NICARAGUA_TIMEZONE);
        return utcDate.toISOString();
    } catch (error) {
        console.error('Error converting user input to ISO:', error, 'Input:', dateInput);
        return null;
    }
};

/**
 * Obtiene la fecha actual en Nicaragua en formato YYYY-MM-DD
 */
export const todayInNicaragua = (): string => {
    return formatInTimeZone(new Date(), NICARAGUA_TIMEZONE, 'yyyy-MM-dd');
};

/**
 * Obtiene la fecha y hora actual en Nicaragua en formato YYYY-MM-DD HH:mm:ss
 */
export const nowInNicaraguaFormatted = (): string => {
    return formatInTimeZone(new Date(), NICARAGUA_TIMEZONE, 'yyyy-MM-dd HH:mm:ss');
};

/**
 * Valida si una fecha está en formato ISO válido
 */
export const isValidISODate = (dateString: string): boolean => {
    if (!dateString) return false;
    const date = parseISO(dateString);
    return isValid(date);
};

/**
 * Para uso en bases de datos MySQL - convierte ISO string a formato DATETIME
 * La fecha ISO ya viene en UTC, solo formateamos para MySQL
 */
export const isoToMySQLDateTime = (isoString: string | any): string => {
    if (!isoString) return '';

    try {
        const dateString = typeof isoString === 'string' ? isoString : String(isoString);
        if (!dateString || dateString === 'null' || dateString === 'undefined') {
            return '';
        }

        const date = parseISO(dateString);
        if (!isValid(date)) return '';

        // La fecha ISO ya está en UTC, formateamos específicamente en UTC para MySQL
        // Esto asegura que los números guardados en el DATETIME sean los de UTC
        return formatInTimeZone(date, 'UTC', 'yyyy-MM-dd HH:mm:ss');
    } catch (error) {
        console.error('Error converting ISO to MySQL DateTime:', error, 'Input:', isoString);
        return '';
    }
};

/**
 * Para uso en bases de datos MySQL - convierte ISO string a formato DATE
 * NOTA: Preferir usar isoToMySQLDateTime para evitar problemas de zona horaria
 */
export const isoToMySQLDate = (isoString: string | any): string => {
    if (!isoString) return '';

    try {
        const dateString = typeof isoString === 'string' ? isoString : String(isoString);
        if (!dateString || dateString === 'null' || dateString === 'undefined') {
            return '';
        }

        const date = parseISO(dateString);
        if (!isValid(date)) return '';
        return format(date, 'yyyy-MM-dd');
    } catch (error) {
        console.error('Error converting ISO to MySQL Date:', error, 'Input:', isoString);
        return '';
    }
};

/**
 * Convierte una fecha ISO a formato DATETIME de MySQL con hora 00:00:00
 * Útil para campos que antes eran DATE pero ahora son DATETIME
 */
export const isoToMySQLDateTimeStart = (isoString: string | any): string => {
    if (!isoString) return '';

    try {
        const dateString = typeof isoString === 'string' ? isoString : String(isoString);
        if (!dateString || dateString === 'null' || dateString === 'undefined') {
            return '';
        }

        const date = parseISO(dateString);
        if (!isValid(date)) return '';
        return format(date, 'yyyy-MM-dd 00:00:00');
    } catch (error) {
        console.error('Error converting ISO to MySQL DateTime Start:', error, 'Input:', isoString);
        return '';
    }
};

/**
 * Convierte una fecha ISO a formato DATETIME de MySQL con hora 12:00:00 (mediodía)
 * Usar para fechas que representan "días completos" sin hora específica
 * Ejemplos: firstPaymentDate, deliveryDate, dueDate, fechas del plan de pagos
 */
export const isoToMySQLDateTimeNoon = (isoString: string | any): string => {
    if (!isoString) return '';

    try {
        const dateString = typeof isoString === 'string' ? isoString : String(isoString);
        if (!dateString || dateString === 'null' || dateString === 'undefined') {
            return '';
        }

        // Si solo es fecha (YYYY-MM-DD), agregar mediodía
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
            return `${dateString} 12:00:00`;
        }

        // Si ya tiene hora, convertir a zona horaria de Nicaragua primero
        const date = parseISO(dateString);
        if (!isValid(date)) return '';

        // Convertir a zona horaria de Nicaragua y extraer solo la fecha
        const nicaraguaDate = toZonedTime(date, NICARAGUA_TIMEZONE);
        return format(nicaraguaDate, 'yyyy-MM-dd') + ' 12:00:00';
    } catch (error) {
        console.error('Error converting ISO to MySQL DateTime Noon:', error, 'Input:', isoString);
        return '';
    }
};