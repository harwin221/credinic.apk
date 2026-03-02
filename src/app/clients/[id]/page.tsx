
'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getClient } from '@/services/client-service-server';
import type { Client, UserRole } from '@/lib/types';
import { useUser } from '@/hooks/use-user';
import { AccessDenied } from '@/components/AccessDenied';
import { Loader2, ArrowLeft, Edit } from 'lucide-react';
import { ClientDetailView } from '@/components/clients/ClientDetailView';
import { Button } from '@/components/ui/button';

const VIEW_ROLES: UserRole[] = ['ADMINISTRADOR', 'GERENTE', 'FINANZAS', 'OPERATIVO', 'GESTOR'];
const EDIT_ROLES: UserRole[] = ['ADMINISTRADOR', 'OPERATIVO'];

export default function ClientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: userLoading } = useUser();
  const clientId = params.id as string;
  const [client, setClient] = React.useState<Client | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  const canView = user && VIEW_ROLES.includes(user.role.toUpperCase() as UserRole);
  const canEdit = user && EDIT_ROLES.includes(user.role.toUpperCase() as UserRole);

  React.useEffect(() => {
    const fetchClient = async () => {
      if (!clientId || !canView) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      try {
        const clientData = await getClient(clientId);
        setClient(clientData);
      } catch (error) {
        console.error("Error fetching client data:", error);
        setClient(null);
      } finally {
        setIsLoading(false);
      }
    };

    if (!userLoading) {
      fetchClient();
    }
  }, [clientId, userLoading, canView]);

  if (isLoading || userLoading) {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  if (!canView) {
    return <AccessDenied />;
  }

  if (!client) {
    return <div className="text-center p-8">Cliente no encontrado.</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => router.push('/clients')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-2xl font-bold tracking-tight">{client.name}</h2>
        </div>
        {canEdit && (
          <Button onClick={() => router.push(`/clients/${client.id}/edit`)}>
            <Edit className="mr-2 h-4 w-4" />
            Editar Cliente
          </Button>
        )}
      </div>
      <ClientDetailView client={client} />
    </div>
  );
}
