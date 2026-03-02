

'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';

// Esta página está obsoleta y la lógica se ha movido a /reports/overdue-credits.
// Este componente ahora solo redirige al nuevo reporte, más detallado.

export default function DailyCollectionReportPage() {
  const router = useRouter();
  
  React.useEffect(() => {
    const newUrl = '/reports/overdue-credits'; 
    const params = new URLSearchParams(window.location.search);
    router.replace(`${newUrl}?${params.toString()}`);
  }, [router]);
  
  return (
    <div className="flex h-screen items-center justify-center">
      <p>Redirigiendo al nuevo reporte...</p>
    </div>
  );
}
