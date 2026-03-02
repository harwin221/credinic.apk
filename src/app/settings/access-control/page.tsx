
'use client';

import * as React from 'react';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ShieldAlert, Building2, Globe } from 'lucide-react';
import { getSystemSettings, updateSystemStatus, updateBranchStatus, type SystemSettings } from '@/services/settings-service-client';
import { getSucursales } from '@/services/sucursal-service';
import { Sucursal } from '@/lib/types';

export default function AccessControlPage() {
    const { toast } = useToast();
    const [settings, setSettings] = React.useState<SystemSettings | null>(null);
    const [sucursales, setSucursales] = React.useState<Sucursal[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [isUpdating, setIsUpdating] = React.useState(false);

    const fetchData = React.useCallback(async () => {
        try {
            const [settingsData, sucursalesData] = await Promise.all([
                getSystemSettings(),
                getSucursales()
            ]);
            setSettings(settingsData);
            setSucursales(sucursalesData);
        } catch (error) {
            toast({ title: "Error", description: "No se pudo cargar la configuración.", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);

    React.useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleGlobalToggle = async (checked: boolean) => {
        setIsUpdating(true);
        try {
            await updateSystemStatus(checked);
            setSettings(prev => prev ? { ...prev, isSystemOpen: checked } : null);
            toast({
                title: checked ? "Sistema Abierto" : "Sistema Cerrado",
                description: checked ? "Todos los usuarios pueden ingresar." : "Solo Administradores y Gerentes pueden ingresar.",
                variant: checked ? "default" : "destructive"
            });
        } catch (error) {
            toast({ title: "Error", description: "No se pudo actualizar el estado.", variant: "destructive" });
        } finally {
            setIsUpdating(false);
        }
    };

    const handleBranchToggle = async (branchId: string, checked: boolean) => {
        // Optimistic update
        setSettings(prev => {
            if (!prev) return null;
            return {
                ...prev,
                branchSettings: {
                    ...prev.branchSettings,
                    [branchId]: checked
                }
            };
        });

        try {
            await updateBranchStatus(branchId, checked);
        } catch (error) {
            toast({ title: "Error", description: "No se pudo actualizar la sucursal.", variant: "destructive" });
            fetchData(); // Revert on error
        }
    };

    if (isLoading) {
        return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    return (
        <div className="space-y-6">
            <PageHeader title="Control de Acceso" />

            <div className="grid gap-6">
                {/* Global Control */}
                <Card className={settings?.isSystemOpen ? "border-green-500/50" : "border-red-500/50"}>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Globe className="h-5 w-5" />
                            Estado Global del Sistema
                        </CardTitle>
                        <CardDescription>
                            Control maestro. Si se apaga, nadie (excepto Admin/Gerente) podrá entrar, independientemente de la configuración de sucursal.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label className="text-base">Acceso al Sistema</Label>
                            <p className="text-sm text-muted-foreground">
                                {settings?.isSystemOpen
                                    ? "El sistema está ABIERTO para todos los usuarios."
                                    : "El sistema está CERRADO. Solo personal administrativo tiene acceso."}
                            </p>
                        </div>
                        <Switch
                            checked={settings?.isSystemOpen}
                            onCheckedChange={handleGlobalToggle}
                            disabled={isUpdating}
                        />
                    </CardContent>
                </Card>

                {/* Branch Control */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Building2 className="h-5 w-5" />
                            Control por Sucursal
                        </CardTitle>
                        <CardDescription>
                            Puede cerrar el acceso a sucursales específicas. Requiere que el sistema global esté abierto.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {sucursales.map(sucursal => {
                            const isOpen = settings?.branchSettings?.[sucursal.id] !== false; // Default to true if undefined
                            return (
                                <div key={sucursal.id} className="flex items-center justify-between p-3 border rounded-lg">
                                    <div className="space-y-0.5">
                                        <Label className="text-base">{sucursal.name}</Label>
                                        <p className="text-xs text-muted-foreground">
                                            {isOpen ? "Acceso Permitido" : "Acceso Bloqueado"}
                                        </p>
                                    </div>
                                    <Switch
                                        checked={isOpen}
                                        onCheckedChange={(c) => handleBranchToggle(sucursal.id, c)}
                                    />
                                </div>
                            );
                        })}
                        {sucursales.length === 0 && <p className="text-muted-foreground text-sm">No hay sucursales registradas.</p>}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
