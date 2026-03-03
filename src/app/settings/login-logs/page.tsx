'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar as CalendarIcon, Loader2, ArrowLeft, Search } from 'lucide-react';
import { getFirstLogins } from '@/services/login-logs-server';

export interface LoginLogItem {
    id: string; // audit log id (or generated)
    userName: string;
    sucursalName: string;
    role: string;
    loginTime: string; // The time they logged in
    ipAddress: string;
}
import { useToast } from '@/hooks/use-toast';
import { formatDateForUser } from '@/lib/date-utils';

export default function LoginLogsPage() {
    const router = useRouter();
    const { toast } = useToast();

    const [dateFrom, setDateFrom] = React.useState<Date | undefined>(new Date());
    const [dateTo, setDateTo] = React.useState<Date | undefined>(new Date());
    const [isLoading, setIsLoading] = React.useState(false);
    const [logs, setLogs] = React.useState<LoginLogItem[]>([]);

    const handleSearch = async () => {
        if (!dateFrom || !dateTo) {
            toast({ title: 'Atención', description: 'Debe seleccionar un rango de fechas.', variant: 'destructive' });
            return;
        }

        setIsLoading(true);
        try {
            const formattedFrom = format(dateFrom, 'yyyy-MM-dd');
            const formattedTo = format(dateTo, 'yyyy-MM-dd');

            const results = await getFirstLogins(formattedFrom, formattedTo);
            setLogs(results);

            if (results.length === 0) {
                toast({ title: 'Sin resultados', description: 'No hubo inicios de sesión en este rango de fechas.' });
            }
        } catch (error: any) {
            toast({ title: 'Error', description: error.message || 'Error al buscar los registros.', variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    };

    React.useEffect(() => {
        handleSearch();
    }, []);

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => router.push('/settings')} className="rounded-full">
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Auditoría de Inicios de Sesión</h2>
                    <p className="text-muted-foreground text-sm">Visualice el primer acceso de cada usuario por día.</p>
                </div>
            </div>

            <Card>
                <CardHeader className="pb-4">
                    <CardTitle className="text-lg">Filtros de Búsqueda</CardTitle>
                    <CardDescription>Escoja el rango de fechas para consultar.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col sm:flex-row items-end gap-4">
                        <div className="space-y-2 w-full sm:w-auto">
                            <Label>Fecha Inicial</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className={cn("w-full sm:w-[240px] justify-start text-left font-normal", !dateFrom && "text-muted-foreground")}>
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {dateFrom ? format(dateFrom, 'PPP', { locale: es }) : <span>DD/MM/YYYY</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                    <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} initialFocus />
                                </PopoverContent>
                            </Popover>
                        </div>

                        <div className="space-y-2 w-full sm:w-auto">
                            <Label>Fecha Final</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className={cn("w-full sm:w-[240px] justify-start text-left font-normal", !dateTo && "text-muted-foreground")}>
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {dateTo ? format(dateTo, 'PPP', { locale: es }) : <span>DD/MM/YYYY</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                    <Calendar mode="single" selected={dateTo} onSelect={setDateTo} initialFocus />
                                </PopoverContent>
                            </Popover>
                        </div>

                        <Button onClick={handleSearch} disabled={isLoading} className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700">
                            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                            Buscar
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Día y Hora de Acceso</TableHead>
                                <TableHead>Nombre del Usuario</TableHead>
                                <TableHead>Sucursal</TableHead>
                                <TableHead>Rol</TableHead>
                                <TableHead>Dirección IP</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {logs.length > 0 ? (
                                logs.map((log) => (
                                    <TableRow key={log.id}>
                                        <TableCell className="font-medium whitespace-nowrap">
                                            {formatDateForUser(log.loginTime, 'dd/MM/yyyy hh:mm a')}
                                        </TableCell>
                                        <TableCell>{log.userName}</TableCell>
                                        <TableCell>{log.sucursalName}</TableCell>
                                        <TableCell>{log.role}</TableCell>
                                        <TableCell className="text-muted-foreground font-mono text-xs">{log.ipAddress}</TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                        No se encontraron registros de inicio de sesión.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
