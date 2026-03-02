'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { PortfolioTransfer } from '../components/PortfolioTransfer';
import { useUser } from '@/hooks/use-user';
import { AccessDenied } from '@/components/AccessDenied';

export default function PortfolioTransferPage() {
  const router = useRouter();
  const { user } = useUser();

  if (!user) return null;
  
  if (user.role.toUpperCase() !== 'ADMINISTRADOR') {
    return <AccessDenied />;
  }

  return (
    <div className="space-y-6">
      {/* Botón de regresar */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={() => router.push('/settings')}
          className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground h-8 px-2"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span className="text-sm">Configuración</span>
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight mb-2">Traslado de Cartera</h1>
        <p className="text-sm text-muted-foreground">
          Transfiere todos los créditos de un gestor a otro de forma masiva.
        </p>
      </div>

      <PortfolioTransfer />
    </div>
  );
}
