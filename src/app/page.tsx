
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/hooks/use-user';
import { Loader2 } from 'lucide-react';

/**
 * La única responsabilidad de RootPage es redirigir a los usuarios autenticados al panel.
 * Los usuarios no autenticados son manejados por el middleware.
 */
export default function RootPage() {
  const { user, loading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (user) {
        router.push('/dashboard');
      } else {
        // Si no hay usuario, el middleware ya debería haber redirigido a /login.
        // Esto es una red de seguridad.
        router.push('/login');
      }
    }
  }, [user, loading, router]);
  
  // Muestra un cargador mientras se verifica la sesión.
  return (
    <div className="flex h-screen w-full items-center justify-center bg-background">
      <Loader2 className="h-10 w-10 animate-spin text-primary" />
    </div>
  );
}
