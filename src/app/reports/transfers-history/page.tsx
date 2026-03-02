'use client';

import * as React from 'react';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function TransfersHistoryPage() {
    const router = useRouter();

    return (
        <div className="space-y-6">
             <PageHeader title="Historial de Transferencias">
                <Button variant="outline" onClick={() => router.push('/arqueo')}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Volver
                </Button>
             </PageHeader>
             <Card>
                <CardHeader>
                    <CardTitle>Funcionalidad Descontinuada</CardTitle>
                    <CardDescription>Esta funcionalidad ha sido descontinuada. Los movimientos ahora se registran en el módulo de Arqueo.</CardDescription>
                </CardHeader>
             </Card>
        </div>
    );
}
