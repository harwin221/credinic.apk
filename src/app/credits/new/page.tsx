

'use client';

import * as React from 'react';
import { CreditForm } from '@/app/credits/components/CreditForm';
import { PageHeader } from '@/components/PageHeader';
import { useUser } from '@/hooks/use-user';
import { AccessDenied } from '@/components/AccessDenied';
import type { UserRole } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

const ALLOWED_ROLES: UserRole[] = ['ADMINISTRADOR', 'OPERATIVO', 'GERENTE', 'GESTOR'];

export default function NewCreditPage() {
  const { user } = useUser();
  const router = useRouter();
  const [isClient, setIsClient] = React.useState(false);

  React.useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return (
       <div className="space-y-6">
        <PageHeader title="Nueva Solicitud de Crédito" />
        <div className="shadow-md w-full max-w-4xl mx-auto p-6 space-y-6">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
        </div>
      </div>
    );
  }

  if (!user || !ALLOWED_ROLES.includes(user.role.toUpperCase() as UserRole)) {
    return <AccessDenied />;
  }

  return (
    <div className="space-y-6">
       {/* El componente CreditForm ahora maneja su propia lógica de encabezado */}
      <CreditForm />
    </div>
  );
}
