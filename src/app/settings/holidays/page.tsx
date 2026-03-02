'use client';

import * as React from 'react';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, Trash2, Loader2, ArrowLeft } from 'lucide-react';
import { deleteHoliday, getHolidays } from '@/services/holiday-service';
import type { Holiday, UserRole } from '@/lib/types';
import { HolidayForm } from './components/HolidayForm';
import { Skeleton } from '@/components/ui/skeleton';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { useUser } from '@/hooks/use-user';
import { useToast } from '@/hooks/use-toast';
import { AccessDenied } from '@/components/AccessDenied';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useRouter } from 'next/navigation';

export default function HolidaysPage() {
    const { user } = useUser();
    const router = useRouter();
    const { toast } = useToast();
    const [holidays, setHolidays] = React.useState<Holiday[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [isFormOpen, setIsFormOpen] = React.useState(false);
    const [holidayToDelete, setHolidayToDelete] = React.useState<Holiday | null>(null);

    const fetchHolidays = React.useCallback(async () => {
        setIsLoading(true);
        try {
            const holidayList = await getHolidays();
            setHolidays(holidayList);
        } catch (error) {
            console.error("Error fetching holidays:", error);
            toast({ title: 'Error', description: 'No se pudieron cargar los feriados.', variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);

    React.useEffect(() => {
        if (user?.role.toUpperCase() === 'ADMINISTRADOR') {
            fetchHolidays();
        } else {
            setIsLoading(false);
        }
    }, [fetchHolidays, user]);

    const handleSuccess = () => {
        fetchHolidays();
        setIsFormOpen(false);
    };

    const handleDeleteHoliday = async () => {
        if (!holidayToDelete || !user) return;
        const result = await deleteHoliday(holidayToDelete.id, user);
        if (result.success) {
            toast({ title: "Feriado Eliminado" });
            fetchHolidays();
        } else {
            toast({ title: "Error", description: result.error || "No se pudo eliminar el feriado.", variant: "destructive" });
        }
        setHolidayToDelete(null);
    };

    if (isLoading) {
        return (
            <div className="flex h-[80vh] w-full items-center justify-center">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
        );
    }

    if (!user || user.role.toUpperCase() !== 'ADMINISTRADOR') {
        return <AccessDenied />;
    }

    return (
        <>
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
                    <div>
                        <Button onClick={() => setIsFormOpen(true)}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Agregar Feriado
                        </Button>
                    </div>
                </div>
                <Card>
                    <CardHeader>
                        <CardTitle>Lista de Días Feriados</CardTitle>
                        <CardDescription>Estos días se omitirán al calcular las fechas de pago.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Fecha</TableHead>
                                    <TableHead>Nombre del Feriado</TableHead>
                                    <TableHead className="text-right">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {holidays.length > 0 ? (
                                    holidays.map(holiday => (
                                        <TableRow key={holiday.id}>
                                            <TableCell className="font-medium">
                                                {(() => {
                                                    const [year, month, day] = holiday.date.split('-').map(Number);
                                                    const date = new Date(year, month - 1, day);
                                                    return format(date, 'dd \'de\' MMMM \'de\' yyyy', { locale: es });
                                                })()}
                                            </TableCell>
                                            <TableCell>{holiday.name}</TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="icon" onClick={() => setHolidayToDelete(holiday)}>
                                                    <Trash2 className="h-4 w-4 text-destructive" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={3} className="h-24 text-center">
                                            No se han agregado feriados.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>

            <HolidayForm
                isOpen={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                onSuccess={handleSuccess}
            />

            <AlertDialog open={!!holidayToDelete} onOpenChange={(open) => !open && setHolidayToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Confirmar eliminación?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Estás a punto de eliminar el feriado <strong>{holidayToDelete?.name}</strong>. Esta acción no se puede deshacer.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteHoliday} className="bg-destructive hover:bg-destructive/90">
                            Confirmar Eliminación
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
