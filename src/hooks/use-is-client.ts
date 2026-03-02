
'use client';

import * as React from 'react';

// Este hook previene errores de hidratación asegurando que un componente solo se renderice en el lado del cliente.
// Algunas librerías, como react-beautiful-dnd, no son compatibles con SSR y fallarán si se renderizan en el servidor.
export function useIsClient() {
  const [isClient, setIsClient] = React.useState(false);

  React.useEffect(() => {
    setIsClient(true);
  }, []);

  return isClient;
}
