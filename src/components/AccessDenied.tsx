'use client';
  
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

export function AccessDenied() {
  const router = useRouter();

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="w-full max-w-md shadow-lg text-center">
        <CardHeader>
          <div className="mx-auto bg-destructive/10 rounded-full p-4 w-fit">
            <ShieldAlert className="h-12 w-12 text-destructive" />
          </div>
          <CardTitle className="mt-4 text-2xl font-bold">Acceso Denegado</CardTitle>
          <CardDescription>
            No tienes los permisos necesarios para ver esta página.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            Si crees que esto es un error, por favor, contacta a un administrador.
          </p>
          <Button onClick={() => router.back()} className="mt-6 w-full">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a la página anterior
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
