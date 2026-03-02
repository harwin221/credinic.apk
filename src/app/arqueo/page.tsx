
'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Loader2, FolderArchive, History } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { UserRole } from '@/lib/types';
import { useUser } from '@/hooks/use-user';
import { AccessDenied } from '@/components/AccessDenied';

const ALLOWED_ROLES: UserRole[] = ['ADMINISTRADOR', 'GERENTE', 'FINANZAS', 'OPERATIVO'];

export default function ArqueoPage() {
    const router = useRouter();
    const { user } = useUser();

    if (!user) {
        return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    // Normalizar el rol a mayúsculas para comparación consistente
    const userRole = (user.role || '').toUpperCase() as UserRole;
    const canView = ALLOWED_ROLES.includes(userRole);

    if (!canView) {
        return <AccessDenied />;
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Gestión de Arqueos</CardTitle>
                    <CardDescription>
                        Crea un nuevo arqueo de caja para un usuario de campo o consulta el historial de arqueos realizados.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground mb-6">La funcionalidad de transferencias automáticas ha sido descontinuada. Las transferencias ahora se registran manualmente durante el proceso de arqueo.</p>
                    <div className="flex flex-wrap gap-4">
                        <Button onClick={() => router.push('/arqueo/new')}>
                            <PlusCircle className="mr-2 h-4 w-4" /> Iniciar Nuevo Arqueo
                        </Button>
                        <Button variant="outline" onClick={() => router.push('/reports/closures-history')}>
                            <History className="mr-2 h-4 w-4" /> Ver Historial de Arqueos
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
