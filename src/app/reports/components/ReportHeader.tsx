'use client';

import * as React from 'react';
import { AppLogo } from '@/components/AppLogo';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

interface ReportHeaderProps {
  title: string;
  dateFrom?: string | null;
  dateTo?: string | null;
}

const formatDate = (dateString?: string | null) => {
    if (!dateString) return null;
    try {
        // Agregar mediodía para fechas sin hora para evitar problemas de zona horaria
        const dateToFormat = /^\d{4}-\d{2}-\d{2}$/.test(dateString) ? dateString + 'T12:00:00' : dateString;
        return format(parseISO(dateToFormat), 'dd/MM/yyyy', { locale: es });
    } catch {
        return 'Fecha Inválida';
    }
};

export function ReportHeader({ title, dateFrom, dateTo }: ReportHeaderProps) {
  const formattedFrom = formatDate(dateFrom);
  const formattedTo = formatDate(dateTo);
  const [generatedAt, setGeneratedAt] = React.useState('');

  React.useEffect(() => {
    // Generate date on the client side to prevent hydration mismatch
    setGeneratedAt(format(new Date(), 'dd/MM/yyyy HH:mm:ss'));
  }, []);
  
  return (
    <header className="mb-4 print:mb-2 relative flex flex-col items-center text-center">
      <div className="absolute left-0 top-0 print:scale-90">
        <AppLogo collapsed={false} />
      </div>
      <div>
        <h1 className="text-sm font-bold mt-2 print:mt-1">{title}</h1>
        {(formattedFrom || formattedTo) && (
        <p className="text-xs text-muted-foreground">
            {formattedFrom && `Desde ${formattedFrom}`} {formattedTo && `hasta ${formattedTo}`}
        </p>
        )}
      </div>
      <div className="absolute top-0 right-0">
        <p className="text-xs text-muted-foreground print:hidden">
            {generatedAt && `Generado: ${generatedAt}`}
        </p>
      </div>
      <hr className="my-2 print:my-1 w-full border-t border-gray-300 print:border-gray-600" />
    </header>
  );
}
