/**
 * Componente para mostrar fechas consistentemente en hora local de Nicaragua
 */

import React from 'react';
import { formatDateForUser, formatDateTimeForUser } from '@/lib/date-utils';

interface DateDisplayProps {
  date: string | Date | null | undefined;
  format?: 'date' | 'datetime' | 'custom';
  customFormat?: string;
  fallback?: string;
  className?: string;
}

export const DateDisplay: React.FC<DateDisplayProps> = ({
  date,
  format = 'date',
  customFormat,
  fallback = 'N/A',
  className
}) => {
  const getFormattedDate = () => {
    if (!date) return fallback;
    
    try {
      switch (format) {
        case 'datetime':
          return formatDateTimeForUser(date);
        case 'custom':
          return customFormat ? formatDateForUser(date, customFormat) : formatDateForUser(date);
        case 'date':
        default:
          return formatDateForUser(date);
      }
    } catch (error) {
      console.error('Error in DateDisplay:', error, 'Date input:', date);
      return fallback;
    }
  };

  return (
    <span className={className} title={date ? new Date(date).toISOString() : undefined}>
      {getFormattedDate()}
    </span>
  );
};

// Componentes específicos para casos comunes
export const DateOnly: React.FC<Omit<DateDisplayProps, 'format'>> = (props) => (
  <DateDisplay {...props} format="date" />
);

export const DateTime: React.FC<Omit<DateDisplayProps, 'format'>> = (props) => (
  <DateDisplay {...props} format="datetime" />
);

export const DateCustom: React.FC<DateDisplayProps & { customFormat: string }> = (props) => (
  <DateDisplay {...props} format="custom" />
);