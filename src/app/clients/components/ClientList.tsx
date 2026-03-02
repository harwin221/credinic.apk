
'use client';

import * as React from 'react';
import Link from 'next/link';
import { useUser } from '@/hooks/use-user';
import { deleteClient as deleteClientAction } from '@/app/clients/actions';
import type { Client, UserRole, AppUser as User } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { PlusCircle, Search, Loader2, ArrowLeft, MoreHorizontal, Edit, Trash2, ArrowRight, Eye } from 'lucide-react';
import { useDebounce, useDebouncedCallback } from 'use-debounce';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { getOfflineClients } from '@/services/offline-db';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ClientCard } from './ClientCard';
import { getClientCredits } from '@/services/credit-service-server';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format, parseISO } from 'date-fns';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { formatCedula } from '@/lib/utils';

const EDIT_DELETE_ROLES: UserRole[] = ['ADMINISTRADOR', 'GERENTE', 'OPERATIVO'];
const PAGE_SIZE = 10;

const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
        // La fecha de MySQL ya viene en un formato que `new Date()` puede interpretar correctamente.
        return format(new Date(dateString), 'dd/MM/yyyy');
    } catch {
        return 'Fecha Inválida';
    }
};

type ClientWithCreditInfo = Client & { latestCreditId?: string };

interface ClientListProps {
    initialClients: (Client | ClientWithCreditInfo)[];
    initialReloanClients?: Client[];
    initialRenewalClients?: Client[];
    isGestor: boolean;
    user: User;
    sucursales?: Array<{ id: string; name: string; }>;
    initialSucursalFilter?: string;
}

export function ClientList({ initialClients, initialReloanClients, initialRenewalClients, isGestor, user, sucursales = [], initialSucursalFilter = '' }: ClientListProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { toast } = useToast();

    const [clients, setClients] = React.useState(initialClients);
    const [clientToDelete, setClientToDelete] = React.useState<Client | null>(null);
    const [currentPage, setCurrentPage] = React.useState(1);
    const [sucursalFilter, setSucursalFilter] = React.useState(initialSucursalFilter);
    const [searchTermAll, setSearchTermAll] = React.useState('');

    const canEditDelete = EDIT_DELETE_ROLES.includes(user.role.toUpperCase() as UserRole);
    const canDelete = user.role.toUpperCase() === 'ADMINISTRADOR'; // Solo ADMINISTRADOR puede eliminar

    // Función para verificar si el usuario puede editar un cliente específico
    const canEditClient = (client: Client) => {
        if (!canEditDelete) return false;
        const userRole = user.role.toUpperCase();

        // ADMINISTRADOR puede editar cualquier cliente
        if (userRole === 'ADMINISTRADOR') return true;

        // GERENTE y OPERATIVO solo pueden editar clientes de su sucursal
        if (['GERENTE', 'OPERATIVO'].includes(userRole)) {
            return client.sucursal === user.sucursal;
        }

        return false;
    };

    React.useEffect(() => {
        setClients(initialClients);
    }, [initialClients]);

    // Lógica para cargar datos offline si no hay conexión
    React.useEffect(() => {
        async function checkOfflineData() {
            if (typeof window !== 'undefined' && !navigator.onLine && isGestor) {
                const offlineClients = await getOfflineClients();
                if (offlineClients.length > 0) {
                    console.log('Cargando clientes de base de datos offline:', offlineClients.length);
                    setClients(offlineClients);
                }
            }
        }
        checkOfflineData();

        const handleOnline = () => setClients(initialClients);
        window.addEventListener('online', handleOnline);
        return () => window.removeEventListener('online', handleOnline);
    }, [initialClients, isGestor]);

    // Filtrado por sucursal (solo para roles que pueden ver múltiples sucursales)
    const filteredClients = React.useMemo(() => {
        if (!sucursalFilter || sucursales.length === 0) return clients;
        return clients.filter(client => client.sucursal === sucursalFilter);
    }, [clients, sucursalFilter, sucursales]);

    // Filtrado para la pestaña "Toda mi cartera" del gestor
    const filteredAllClients = React.useMemo(() => {
        if (!searchTermAll.trim()) return initialClients;
        
        const term = searchTermAll.toLowerCase().trim();
        return initialClients.filter(client => 
            client.name.toLowerCase().includes(term) ||
            client.clientNumber.toLowerCase().includes(term) ||
            client.cedula.toLowerCase().includes(term)
        );
    }, [initialClients, searchTermAll]);

    // Filtrado y paginación para la vista de Admin/Oficina
    const paginatedClients = filteredClients.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
    const maxPage = Math.ceil(filteredClients.length / PAGE_SIZE);

    const handleSearch = useDebouncedCallback((term: string) => {
        const params = new URLSearchParams(searchParams.toString());
        if (term) {
            params.set('search', term);
        } else {
            params.delete('search');
        }
        router.replace(`${pathname}?${params.toString()}`);
    }, 300);

    const handleSucursalFilter = (sucursalId: string) => {
        setSucursalFilter(sucursalId);
        const params = new URLSearchParams(searchParams.toString());
        if (sucursalId) {
            params.set('sucursal', sucursalId);
        } else {
            params.delete('sucursal');
        }
        router.replace(`${pathname}?${params.toString()}`);
    };

    const handleDeleteClient = async () => {
        if (!clientToDelete || !user) return;
        try {
            await deleteClientAction(clientToDelete.id, user);
            toast({ title: "Cliente Eliminado", description: "El cliente ha sido eliminado exitosamente." });
            setClientToDelete(null);
            // En lugar de volver a buscar, simplemente lo eliminamos del estado local
            setClients(prev => prev.filter(c => c.id !== clientToDelete.id));
        } catch (error: any) {
            toast({ title: "Error", description: error.message || "No se pudo eliminar el cliente.", variant: "destructive" });
            setClientToDelete(null);
        }
    };

    const handleActionClick = async (clientId: string) => {
        const clientCredits = await getClientCredits(clientId);
        const pendingCredit = clientCredits.find(c => c.status === 'Pending');
        if (pendingCredit) {
            toast({ title: 'Solicitud en Proceso', description: 'Este cliente ya tiene una solicitud pendiente de aprobación.', variant: 'destructive' });
            return;
        }
        const approvedCredit = clientCredits.find(c => c.status === 'Approved');
        if (approvedCredit) {
            toast({ title: 'Solicitud Aprobada', description: 'Este cliente ya tiene una solicitud pendiente de desembolso.', variant: 'destructive' });
            return;
        }
        router.push(`/credits/new?clientId=${clientId}`);
    };

    if (isGestor) {
        return (
            <Tabs defaultValue="reloan">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="reloan">Représtamos ({initialReloanClients?.length || 0})</TabsTrigger>
                    <TabsTrigger value="renewal">Renovaciones ({initialRenewalClients?.length || 0})</TabsTrigger>
                    <TabsTrigger value="all">Toda mi cartera ({initialClients.length})</TabsTrigger>
                </TabsList>
                <TabsContent value="reloan" className="space-y-2">
                    {(initialReloanClients?.length || 0) > 0 ? initialReloanClients!.map(c => <ClientCard key={c.id} client={c} action="represtamo" onActionClick={handleActionClick} />) : <p className="text-center text-muted-foreground p-4">No hay clientes elegibles para représtamo.</p>}
                </TabsContent>
                <TabsContent value="renewal" className="space-y-2">
                    {(initialRenewalClients?.length || 0) > 0 ? initialRenewalClients!.map(c => <ClientCard key={c.id} client={c} action="renew" onActionClick={handleActionClick} />) : <p className="text-center text-muted-foreground p-4">No hay clientes para renovar crédito.</p>}
                </TabsContent>
                <TabsContent value="all" className="space-y-4">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                            placeholder="Buscar por nombre, código o cédula..."
                            value={searchTermAll}
                            onChange={(e) => setSearchTermAll(e.target.value)}
                            className="pl-8 h-9 text-sm"
                        />
                    </div>
                    
                    {searchTermAll && (
                        <p className="text-sm text-muted-foreground">
                            Mostrando {filteredAllClients.length} de {initialClients.length} clientes
                        </p>
                    )}
                    
                    <div className="space-y-2">
                        {filteredAllClients.length > 0 ? (
                            filteredAllClients.map(c => (
                                <ClientCard key={c.id} client={c} href={`/clients/${c.id}`}>
                                    {(c as ClientWithCreditInfo).latestCreditId && (
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent>
                                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); router.push(`/credits/${(c as ClientWithCreditInfo).latestCreditId}`); }}>
                                                    <Eye className="mr-2 h-4 w-4" /> Ver Crédito
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    )}
                                </ClientCard>
                            ))
                        ) : (
                            <p className="text-center text-muted-foreground p-4">
                                {searchTermAll ? 'No se encontraron clientes con ese criterio.' : 'No tienes clientes activos asignados.'}
                            </p>
                        )}
                    </div>
                </TabsContent>
            </Tabs>
        );
    }

    return (
        <>
            <Card>
                <CardContent className="pt-6">
                    <div className="flex gap-3 mb-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                            <Input
                                placeholder="Buscar cliente por nombre, cédula o código..."
                                defaultValue={searchParams.get('search')?.toString()}
                                onChange={(e) => handleSearch(e.target.value)}
                                className="pl-8 h-9 text-sm"
                            />
                        </div>
                        {sucursales.length > 1 && (
                            <div className="w-56">
                                <select
                                    value={sucursalFilter}
                                    onChange={(e) => handleSucursalFilter(e.target.value)}
                                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <option value="">Todas las sucursales</option>
                                    {sucursales.map(sucursal => (
                                        <option key={sucursal.id} value={sucursal.id}>
                                            {sucursal.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                        {sucursales.length === 1 && (
                            <div className="w-56 flex items-center px-3 py-1.5 text-xs text-muted-foreground bg-muted/50 rounded-md border">
                                📍 {sucursales[0].name}
                            </div>
                        )}
                    </div>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead># Cliente</TableHead>
                                <TableHead>Nombre</TableHead>
                                <TableHead>Cédula</TableHead>
                                <TableHead>Teléfono</TableHead>
                                <TableHead>Sucursal</TableHead>
                                <TableHead>Fecha de Creación</TableHead>
                                <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {paginatedClients.length > 0 ? (
                                paginatedClients.map(client => (
                                    <TableRow key={client.id}>
                                        <TableCell className="font-mono">{client.clientNumber}</TableCell>
                                        <TableCell className="font-medium">
                                            <Link href={`/clients/${client.id}`} className="hover:underline text-primary">
                                                {client.name}
                                            </Link>
                                        </TableCell>
                                        <TableCell>{formatCedula(client.cedula)}</TableCell>
                                        <TableCell>{client.phone}</TableCell>
                                        <TableCell>{client.sucursalName}</TableCell>
                                        <TableCell>{formatDate(client.createdAt)}</TableCell>
                                        <TableCell className="text-right">
                                            {canEditClient(client) && (
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon">
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onSelect={() => router.push(`/clients/${client.id}/edit`)}>
                                                            <Edit className="mr-2 h-4 w-4" /> Editar
                                                        </DropdownMenuItem>
                                                        {canDelete && (
                                                            <>
                                                                <DropdownMenuSeparator />
                                                                <DropdownMenuItem onSelect={() => setClientToDelete(client)} className="text-destructive">
                                                                    <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                                                                </DropdownMenuItem>
                                                            </>
                                                        )}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-24 text-center">
                                        No se encontraron clientes.
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
                </CardContent>
            </Card>
            <AlertDialog open={!!clientToDelete} onOpenChange={(open) => !open && setClientToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Confirmar eliminación?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción eliminará al cliente permanentemente, pero solo si no tiene créditos asociados. ¿Estás seguro?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteClient} className="bg-destructive hover:bg-destructive/90">
                            Confirmar Eliminación
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
