
'use client';

import * as React from 'react';
import { PageHeader } from '@/components/PageHeader';
import { ClosureForm } from '@/app/arqueo/components/ClosureForm';
import { useUser } from '@/hooks/use-user';
import { AccessDenied } from '@/components/AccessDenied';
import type { UserRole } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

const ALLOWED_ROLES: UserRole[] = ['ADMINISTRADOR', 'GERENTE', 'FINANZAS', 'OPERATIVO'];

export default function NewClosurePage() {
    const { user } = useUser();
    const router = useRouter();

    // Normalizar el rol a mayúsculas para comparación consistente
    const userRole = (user?.role || '').toUpperCase() as UserRole;
    if (!user || !ALLOWED_ROLES.includes(userRole)) {
        return <AccessDenied />;
    }

    return (
        <div className="space-y-6">
            <PageHeader title="Arqueo de Caja Diario">
                <Button variant="outline" onClick={() => router.push('/arqueo')}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Volver
                </Button>
            </PageHeader>
            <ClosureForm />
        </div>
    );
}
