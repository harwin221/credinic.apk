'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { CreditDetailView } from '@/app/credits/components/CreditDetailView';
import type { CreditDetail, Client, UserRole } from '@/lib/types';
import { getCredit } from '@/services/credit-service';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useUser } from '@/hooks/use-user';
import { useIsMobile } from '@/hooks/use-mobile';


const FIELD_ROLES: UserRole[] = ['GESTOR'];

export default function CreditPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useUser();
  const creditId = params.id as string;
  const [credit, setCredit] = React.useState<CreditDetail | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  
  const isFieldUser = user && FIELD_ROLES.includes(user.role);

  const fetchCreditData = React.useCallback(async () => {
    if (creditId) {
      setIsLoading(true);
      const creditData = await getCredit(creditId);
      if (creditData) {
        setCredit(creditData);
      } else {
        setCredit(null);
      }
      setIsLoading(false);
    }
  }, [creditId]);
  
  React.useEffect(() => {
    fetchCreditData();
  }, [fetchCreditData]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" disabled><ArrowLeft className="h-4 w-4" /></Button>
          <Skeleton className="h-8 w-48" />
        </div>
        <Card><CardContent className="p-6"><Skeleton className="h-96 w-full" /></CardContent></Card>
      </div>
    );
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
    <div className="space-y-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => router.back()}><ArrowLeft className="h-4 w-4" /></Button>
          <h2 className="text-2xl font-bold tracking-tight">Detalles del Crédito</h2>
        </div>
        <CreditDetailView credit={credit} onPaymentSuccess={fetchCreditData} />
    </div>
  );
}