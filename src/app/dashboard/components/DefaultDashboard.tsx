'use client';

import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import type { AppUser } from '@/lib/types';
import Link from 'next/link';

export function DefaultDashboard({ user }: { user: AppUser }) {
  return (
    <div className="space-y-6">
      <PageHeader title={`Bienvenido, ${user.fullName}`} />
      <Card>
        <CardHeader>
          <CardTitle>Panel General</CardTitle>
           <CardDescription>Rol: {user.role}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="mb-4">Aquí se mostrarán las estadísticas y gráficos relevantes para su rol.</p>
          <p className="text-sm text-muted-foreground">
            Puede navegar a las diferentes secciones del sistema usando el menú lateral.
            Si necesita acceso a más funcionalidades, por favor contacte a un administrador.
          </p>
          <div className="mt-6">
             <Link href="/credits" prefetch={false} className="text-primary hover:underline font-medium">
                Ver todos los créditos &rarr;
             </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
