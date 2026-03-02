
'use client';

import { useParams, useRouter } from 'next/navigation';
import { ClientForm } from '@/components/clients/ClientForm';
import type { Client, UserRole } from '@/lib/types';
import * as React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getClient } from '@/services/client-service-server';
import { AccessDenied } from '@/components/AccessDenied';
import { useUser } from '@/hooks/use-user';

const ALLOWED_ROLES: UserRole[] = ['ADMINISTRADOR', 'OPERATIVO', 'GESTOR'];

export default function EditClientPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useUser();
  const clientId = params.id as string;
  const [client, setClient] = React.useState<Client | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  const canEdit = user && ALLOWED_ROLES.includes(user.role.toUpperCase() as UserRole);

  React.useEffect(() => {
    const fetchClient = async () => {
        if (!clientId || !canEdit) {
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        try {
            const foundClient = await getClient(clientId);
            setClient(foundClient);
        } catch (error) {
            console.error("Failed to fetch client:", error);
            setClient(null);
        } finally {
            setIsLoading(false);
        }
    };
    if (user) {
        fetchClient();
    }
  }, [clientId, user, canEdit]);

  if (isLoading) {
    return (
       <div className="space-y-6">
        <Card className="shadow-md w-full max-w-4xl mx-auto">
            <CardHeader>
                <div className="space-y-2">
                    <Skeleton className="h-8 w-1/3" />
                    <Skeleton className="h-4 w-2/3" />
                </div>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-20 w-full" />
            </CardContent>
        </Card>
      </div>
    );
  }
  
  if (!canEdit) {
      return <AccessDenied />;
  }

  if (!client) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => router.push(`/clients/${clientId}`)}><ArrowLeft className="h-4 w-4" /></Button>
            <h2 className="text-2xl font-bold tracking-tight">Error</h2>
        </div>
        <Card className="shadow-md">
            <CardContent className="pt-6">
                 <p>Cliente no encontrado.</p>
            </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <ClientForm initialData={client} />
  );
}
