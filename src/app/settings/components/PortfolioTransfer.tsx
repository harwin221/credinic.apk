'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/hooks/use-user';
import { ArrowRightLeft, Loader2, AlertTriangle } from 'lucide-react';
import type { AppUser } from '@/lib/types';
import { transferPortfolioAction } from '@/app/settings/actions';
import { getUsers } from '@/services/user-service-server';

export function PortfolioTransfer() {
    const { user } = useUser();
    const { toast } = useToast();
    const [gestores, setGestores] = React.useState<AppUser[]>([]);
    const [fromGestorId, setFromGestorId] = React.useState<string>('');
    const [toGestorId, setToGestorId] = React.useState<string>('');
    const [isLoading, setIsLoading] = React.useState(false);
    const [isFetchingUsers, setIsFetchingUsers] = React.useState(true);

    React.useEffect(() => {
        const fetchGestores = async () => {
            try {
                const users = await getUsers();
                setGestores(users.filter(u => u.role === 'GESTOR' && u.active));
            } catch (error) {
                console.error("Error fetching gestores:", error);
            } finally {
                setIsFetchingUsers(false);
            }
        };
        fetchGestores();
    }, []);

    const handleTransfer = async () => {
        if (!user) return;
        if (!fromGestorId || !toGestorId) {
            toast({ title: 'Error', description: 'Debe seleccionar ambos gestores.', variant: 'destructive' });
            return;
        }
        if (fromGestorId === toGestorId) {
            toast({ title: 'Error', description: 'El gestor de origen y destino no pueden ser el mismo.', variant: 'destructive' });
            return;
        }

        const confirmTransfer = confirm('¿Está seguro de que desea trasladar TODA la cartera de este gestor? Esta acción modificará todos los créditos asignados actualmente.');
        if (!confirmTransfer) return;

        setIsLoading(true);
        try {
            const result = await transferPortfolioAction(fromGestorId, toGestorId, user);
            if (result.success) {
                toast({
                    title: 'Traslado Exitoso',
                    description: `Se han trasladado ${result.updatedCount} créditos correctamente.`,
                    variant: 'info'
                });
                setFromGestorId('');
                setToGestorId('');
            } else {
                toast({ title: 'Error', description: result.error || 'Ocurrió un error en el traslado.', variant: 'destructive' });
            }
        } catch (error: any) {
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    };

    if (user?.role !== 'ADMINISTRADOR') return null;

    return (
        <Card className="border-orange-200">
            <CardHeader className="bg-orange-50/50 pb-3">
                <div className="flex items-center gap-2">
                    <ArrowRightLeft className="h-4 w-4 text-orange-600" />
                    <CardTitle className="text-orange-900 text-base">Traslado de Cartera Completa</CardTitle>
                </div>
                <CardDescription className="text-xs">
                    Mueve todos los créditos asignados de un gestor a otro de forma masiva.
                </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
                <div className="bg-amber-50 border border-amber-200 p-2.5 rounded-md flex gap-2 text-amber-800 text-xs">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                    <p>
                        Esta acción es irreversible y afectará a todos los créditos activos y pendientes del gestor de origen.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium">Gestor de Origen (Entrega cartera):</label>
                        <Select value={fromGestorId} onValueChange={setFromGestorId} disabled={isLoading || isFetchingUsers}>
                            <SelectTrigger className="h-9 text-sm">
                                <SelectValue placeholder={isFetchingUsers ? "Cargando..." : "Seleccionar gestor..."} />
                            </SelectTrigger>
                            <SelectContent>
                                {gestores.map(g => (
                                    <SelectItem key={g.id} value={g.id} className="text-sm">{g.fullName} ({g.sucursalName})</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-medium">Gestor de Destino (Recibe cartera):</label>
                        <Select value={toGestorId} onValueChange={setToGestorId} disabled={isLoading || isFetchingUsers}>
                            <SelectTrigger className="h-9 text-sm">
                                <SelectValue placeholder={isFetchingUsers ? "Cargando..." : "Seleccionar gestor..."} />
                            </SelectTrigger>
                            <SelectContent>
                                {gestores.map(g => (
                                    <SelectItem key={g.id} value={g.id} disabled={g.id === fromGestorId} className="text-sm">{g.fullName} ({g.sucursalName})</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="flex justify-end pt-2">
                    <Button
                        onClick={handleTransfer}
                        disabled={isLoading || !fromGestorId || !toGestorId}
                        className="bg-orange-600 hover:bg-orange-700 text-white h-9 min-w-[180px] text-sm"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                                Procesando...
                            </>
                        ) : (
                            'Ejecutar Traslado'
                        )}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
