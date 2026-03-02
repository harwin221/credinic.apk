/**
 * Componente de input de fecha con manejo automático de zona horaria
 * REESCRITO para eliminar bucles infinitos, siguiendo un patrón de componente controlado estándar.
 */
import React from 'react';
import { Input } from './input';
import { cn } from '@/lib/utils';
import { formatDateForUser, userInputToISO } from '@/lib/date-utils';

interface DateInputProps {
  value?: string | null;
  onChange?: (isoValue: string | null) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  minDate?: string;
  maxDate?: string;
  error?: string;
}

export const DateInput: React.FC<DateInputProps> = ({
  value,
  onChange,
  placeholder = 'Seleccionar fecha',
  disabled = false,
  className,
  minDate,
  maxDate,
  error: externalError
}) => {
  // Derivamos el valor a mostrar en el input ('yyyy-MM-dd') a partir del `value` del padre.
  const displayValue = React.useMemo(() => {
    if (!value) return ''; // Si el valor del padre es null o '', el input se muestra vacío.
    const formatted = formatDateForUser(value, 'yyyy-MM-dd');
    // Si la fecha es inválida, devolvemos un string vacío para no mostrar texto de error en el input.
    return (formatted && formatted !== 'N/A' && formatted !== 'Fecha Inválida') ? formatted : '';
  }, [value]);

  // Cuando el usuario cambia la fecha en el input.
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!onChange) return;

    const newDisplayValue = e.target.value; // Formato 'yyyy-MM-dd' o ''.

    if (!newDisplayValue) {
      // Si el input se vacía, notificamos al padre con un string vacío,
      // que es lo que el formulario espera.
      onChange('');
    } else {
      // Si se selecciona una fecha, la convertimos a ISO y notificamos al padre.
      const newIsoValue = userInputToISO(newDisplayValue);
      onChange(newIsoValue);
    }
  };

  return (
    <div className="space-y-1">
      <div className="relative">
        <Input
          type="date"
          value={displayValue}
          onChange={handleChange}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            className,
            externalError && "border-red-500 focus:border-red-500"
          )}
          min={minDate}
          max={maxDate}
        />
      </div>
      {externalError && (
        <p className="text-sm text-red-600">{externalError}</p>
      )}
    </div>
  );
};

// Componente para fecha y hora
interface DateTimeInputProps extends DateInputProps {
  showTime?: boolean;
}

export const DateTimeInput: React.FC<DateTimeInputProps> = ({
  showTime = true,
  ...props
}) => {
  // Para datetime-local input
  const inputType = showTime ? 'datetime-local' : 'date';
  
  return (
    <div className="space-y-1">
      <Input
        type={inputType}
        {...props}
        className={cn(
          props.className,
          props.error && "border-red-500 focus:border-red-500"
        )}
      />
      {props.error && (
        <p className="text-sm text-red-600">{props.error}</p>
      )}
    </div>
  );
};