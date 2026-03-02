
'use client';

import * as React from 'react';
import { ClientForm } from '@/components/clients/ClientForm';
import { useUser } from '@/hooks/use-user';
import { AccessDenied } from '@/components/AccessDenied';
import type { UserRole } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

const ALLOWED_ROLES: UserRole[] = ['ADMINISTRADOR', 'OPERATIVO'];

export default function NewClientPage() {
  const { user } = useUser();
  const router = useRouter();
  const [isClient, setIsClient] = React.useState(false);

  React.useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return (
       <div className="space-y-6 p-4">
        <div className="flex justify-end">
            <Button variant="outline" onClick={() => router.push('/clients')}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver
            </Button>
        </div>
        <div className="shadow-md w-full max-w-4xl mx-auto p-6 space-y-6">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-20 w-full" />
        </div>
      </div>
    );
  }

  if (!user || !ALLOWED_ROLES.includes(user.role.toUpperCase() as UserRole)) {
    return <AccessDenied />;
  }

  return (
     <div className="p-4">
        <ClientForm />
     </div>
  );
}
