

'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { CreditForm } from '@/app/credits/components/CreditForm';
import { PageHeader } from '@/components/PageHeader';
import type { CreditDetail, UserRole } from '@/lib/types';
import { getCredit } from '@/services/credit-service';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useUser } from '@/hooks/use-user';
import { AccessDenied } from '@/components/AccessDenied';

const ALLOWED_ROLES: UserRole[] = ['ADMINISTRADOR', 'OPERATIVO'];

export default function EditCreditPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useUser();
  const creditId = params.id as string;
  const [credit, setCredit] = React.useState<CreditDetail | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  const canEdit = user && ALLOWED_ROLES.includes(user.role.toUpperCase() as UserRole);

  React.useEffect(() => {
    if (creditId && canEdit) {
      const fetchCreditData = async () => {
        setIsLoading(true);
        const data = await getCredit(creditId);
        setCredit(data);
        setIsLoading(false);
      };
      fetchCreditData();
    } else {
        setIsLoading(false);
    }
  }, [creditId, canEdit]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Editar Solicitud de Crédito" />
        <div className="shadow-md w-full max-w-4xl mx-auto p-6 space-y-6">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    );
  }

  if (!canEdit) {
    return <AccessDenied />;
  }
  
  if (!credit) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => router.back()}><ArrowLeft className="h-4 w-4" /></Button>
          <h2 className="text-2xl font-bold tracking-tight">Error</h2>
        </div>
        <Card><CardContent className="pt-6"><p>Crédito no encontrado.</p></CardContent></Card>
      </div>
    );
  }

  return (
      <CreditForm initialData={credit} />
  );
}
