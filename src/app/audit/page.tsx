
'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, History, Trash2, ArrowLeft, ArrowRight } from 'lucide-react';
import type { AuditLog, UserRole } from '@/lib/types';
import { useUser } from '@/hooks/use-user';
import { AccessDenied } from '@/components/AccessDenied';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { purgeAuditLogs, getAuditLogs } from './actions';
import { useToast } from '@/hooks/use-toast';


const ALLOWED_ROLES: UserRole[] = ['ADMINISTRADOR', 'GERENTE', 'FINANZAS'];
const PAGE_SIZE = 50;

const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
        return format(new Date(dateString), 'dd/MM/yyyy HH:mm:ss', { locale: es });
    } catch {
        return 'Fecha inválida';
    }
};

export default function AuditLogPage() {
    const { user, loading: userLoading } = useUser();
    const { toast } = useToast();
    const [logs, setLogs] = React.useState<AuditLog[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [isPurging, setIsPurging] = React.useState(false);
    const [isPurgeConfirmOpen, setIsPurgeConfirmOpen] = React.useState(false);
    const [currentPage, setCurrentPage] = React.useState(1);

    const canView = user && ALLOWED_ROLES.includes(user.role.toUpperCase() as UserRole);
    const canPurge = user && user.role.toUpperCase() === 'ADMINISTRADOR';

    const fetchLogs = React.useCallback(async () => {
        if (!canView) return;
        setIsLoading(true);
        try {
            const logData = await getAuditLogs();

            setLogs(logData.map((log: any) => ({
                ...log,
                timestamp: new Date(log.timestamp).toISOString(),
            })));

        } catch (error) {
            console.error("Error fetching audit logs:", error);
            toast({ title: 'Error', description: 'No se pudieron cargar los registros de auditoría.', variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }

    }, [canView, toast]);


    React.useEffect(() => {
        if (!userLoading && canView) {
            fetchLogs();
        } else if (!userLoading) {
            setIsLoading(false);
        }
    }, [user, userLoading, canView, fetchLogs]);

    const paginatedLogs = logs.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
    const maxPage = Math.ceil(logs.length / PAGE_SIZE);

    const handlePurge = async () => {
        if (!canPurge || !user) return;
        setIsPurging(true);
        try {
            const result = await purgeAuditLogs(user);
            if (result.success) {
                toast({ title: 'Registros Purgados', description: 'Todos los registros de auditoría han sido eliminados.', variant: 'info' });
                fetchLogs();
            } else {
                throw new Error(result.error);
            }
        } catch (error: any) {
            toast({ title: 'Error', description: error.message || 'No se pudieron purgar los registros.', variant: 'destructive' });
        } finally {
            setIsPurging(false);
            setIsPurgeConfirmOpen(false);
        }
    }

    if (userLoading) {
        return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
    }

    if (!canView) {
        return <AccessDenied />;
    }

    return (
        <>
            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <div className="flex justify-end items-center">
                            {canPurge && (
                                <Button variant="destructive" onClick={() => setIsPurgeConfirmOpen(true)} disabled={isPurging}>
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    {isPurging ? 'Purgando...' : 'Purgar Registros'}
                                </Button>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
                        ) : (
                            <>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Fecha y Hora</TableHead>
                                            <TableHead>Usuario</TableHead>
                                            <TableHead>IP</TableHead>
                                            <TableHead>Acción</TableHead>
                                            <TableHead>Detalles</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {paginatedLogs.length > 0 ? (
                                            paginatedLogs.map(log => (
                                                <TableRow key={log.id}>
                                                    <TableCell className="text-muted-foreground">{formatDate(log.timestamp)}</TableCell>
                                                    <TableCell className="font-medium">{log.userName}</TableCell>
                                                    <TableCell className="text-xs font-mono">{log.ipAddress || '---'}</TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-2">
                                                            <History className="h-4 w-4 text-gray-500" />
                                                            <span className="font-mono text-xs">{log.action}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-sm">{log.details}</TableCell>
                                                </TableRow>
                                            ))
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan={4} className="h-24 text-center">
                                                    No se encontraron registros de auditoría.
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                                <div className="flex items-center justify-end space-x-2 py-4">
                                    <span className="text-sm text-muted-foreground">Página {currentPage} de {maxPage}</span>
                                    <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
                                        <ArrowLeft className="h-4 w-4 mr-1" /> Anterior
                                    </Button>
                                    <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(maxPage, p + 1))} disabled={currentPage >= maxPage}>
                                        Siguiente <ArrowRight className="h-4 w-4 ml-1" />
                                    </Button>
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>

            <AlertDialog open={isPurgeConfirmOpen} onOpenChange={setIsPurgeConfirmOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Está absolutamente seguro?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción es irreversible y eliminará **todos** los registros de auditoría del sistema de forma permanente.
                            Esta operación no se puede deshacer.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handlePurge} className="bg-destructive hover:bg-destructive/90">
                            {isPurging && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Sí, purgar todo
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
