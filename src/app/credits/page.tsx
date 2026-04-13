

'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useUser } from '@/hooks/use-user';
import { deleteCredit as deleteCreditAction } from '@/services/credit-service-server';
import { getSucursales } from '@/services/sucursal-service';
import { getUsers as getUsersServer } from '@/services/user-service-server';
import type { CreditDetail, UserRole, AppUser as User, AppUser, Sucursal, CreditStatus } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, Eye, Search, Loader2, Edit, Trash2, FileSignature, ArrowRight, ArrowLeft, Settings } from 'lucide-react';
import { useDebounce } from 'use-debounce';
import { AccessDenied } from '@/components/AccessDenied';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
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
import { useToast } from '@/hooks/use-toast';
import { calculateCreditStatusDetails, translateCreditStatus, getRiskCategoryVariant, formatDate } from '@/lib/utils';
import { printDocumentForDesktop } from '@/services/printer-service';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getCredits } from '@/services/credit-service';

const ALLOWED_ROLES: UserRole[] = ['ADMINISTRADOR', 'GERENTE', 'FINANZAS', 'OPERATIVO'];
const PAGE_SIZE = 15;

const formatCurrency = (amount?: number) => {
  if (typeof amount !== 'number' || isNaN(amount)) return 'C$0.00';
  return `C$${amount.toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export default function CreditsPage() {
  const { user, loading: userLoading } = useUser();
  const router = useRouter();
  const { toast } = useToast();

  const [allCredits, setAllCredits] = React.useState<CreditDetail[]>([]);
  const [paginatedCredits, setPaginatedCredits] = React.useState<CreditDetail[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedStatus, setSelectedStatus] = React.useState<CreditStatus | 'all'>('Active'); // Por defecto: solo créditos activos
  const [selectedSucursal, setSelectedSucursal] = React.useState<string>('all');
  const [selectedGestor, setSelectedGestor] = React.useState<string>('all');

  const [sucursales, setSucursales] = React.useState<Sucursal[]>([]);
  const [gestores, setGestores] = React.useState<AppUser[]>([]);

  const [debouncedSearchTerm] = useDebounce(searchTerm, 500);
  const [creditToDelete, setCreditToDelete] = React.useState<CreditDetail | null>(null);

  const [page, setPage] = React.useState(1);
  const [maxPage, setMaxPage] = React.useState(1);

  const canCreate = user && (user.role === 'ADMINISTRADOR' || user.role === 'OPERATIVO' || user.role === 'GESTOR' || user.role === 'GERENTE');
  const canEdit = user && (user.role === 'ADMINISTRADOR' || user.role === 'OPERATIVO' || user.role === 'GERENTE');
  const canDelete = user && user.role === 'ADMINISTRADOR';
  const isGlobalAdmin = user?.role === 'ADMINISTRADOR' || user?.role === 'FINANZAS';

  // Función para verificar si el usuario puede editar un crédito específico
  const canEditCredit = (credit: CreditDetail) => {
    if (!canEdit || !user) return false;
    const userRole = user.role.toUpperCase();

    // ADMINISTRADOR puede editar cualquier crédito
    if (userRole === 'ADMINISTRADOR') return true;

    // GERENTE y OPERATIVO solo pueden editar créditos de su sucursal
    if (['GERENTE', 'OPERATIVO'].includes(userRole)) {
      return credit.branch === user.sucursal;
    }

    return false;
  };


  React.useEffect(() => {
    const fetchFilterData = async () => {
      if (!user) return;
      const [sucursalesData, usersData] = await Promise.all([getSucursales(), getUsersServer(user)]);
      setSucursales(sucursalesData);
      setGestores(usersData.filter(u => u.role === 'GESTOR'));
      if (!isGlobalAdmin && user.sucursal) setSelectedSucursal(user.sucursal);
    };
    if (!userLoading) fetchFilterData();
  }, [user, userLoading, isGlobalAdmin]);

  const fetchCredits = React.useCallback(async () => {
    if (!user) return;
    setIsLoading(true);

    const gestorFilter = gestores.find(g => g.id === selectedGestor);

    try {
      const fetchedCredits = await getCredits({
        user: user,
        status: selectedStatus,
        sucursales: selectedSucursal === 'all' ? undefined : [selectedSucursal],
        gestorName: gestorFilter?.fullName,
        searchTerm: debouncedSearchTerm,
      });

      const sortedCredits = fetchedCredits.sort((a, b) => new Date(b.applicationDate).getTime() - new Date(a.applicationDate).getTime());
      setAllCredits(sortedCredits);
      setPage(1);
    } catch (e) {
      console.error("Error al cargar créditos: ", e);
      toast({ title: "Error de Permisos", description: "No se pudieron cargar los créditos. Revisa los filtros y tus permisos.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }

  }, [user, selectedStatus, selectedSucursal, selectedGestor, debouncedSearchTerm, gestores, toast]);

  React.useEffect(() => {
    if (user) fetchCredits();
  }, [user, fetchCredits]);

  React.useEffect(() => {
    const newMaxPage = Math.ceil(allCredits.length / PAGE_SIZE);
    setMaxPage(newMaxPage);
    setPaginatedCredits(allCredits.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE));
  }, [allCredits, page]);

  const handleNextPage = () => { if (page < maxPage) setPage(p => p + 1); };
  const handlePrevPage = () => { if (page > 1) setPage(p => p - 1); };

  const handleDeleteCredit = async () => {
    if (!creditToDelete || !user) return;
    try {
      await deleteCreditAction(creditToDelete.id, user);
      toast({ title: "Crédito Eliminado", description: "El crédito ha sido eliminado exitosamente." });
      fetchCredits(); // Volver a cargar los datos
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "No se pudo eliminar el crédito.", variant: "destructive" });
    } finally {
      setCreditToDelete(null);
    }
  };

  const handlePrintPromissoryNote = (creditId: string) => {
    printDocumentForDesktop('promissory-note', creditId);
  }

  if (userLoading) {
    return <div className="flex h-screen w-full items-center justify-center bg-background"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;
  }

  if (!user || !ALLOWED_ROLES.includes(user.role as UserRole)) {
    return <AccessDenied />;
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold tracking-tight">
            {user && ['GERENTE', 'OPERATIVO'].includes(user.role.toUpperCase()) && user.sucursalName
              ? `Créditos - ${user.sucursalName} (${allCredits.length})`
              : `Gestión de Créditos (${allCredits.length})`
            }
          </h2>
          {canCreate && (
            <Button asChild>
              <Link href="/credits/new">
                <PlusCircle className="mr-2 h-4 w-4" />
                Nueva Solicitud
              </Link>
            </Button>
          )}
        </div>

        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Select value={selectedSucursal} onValueChange={setSelectedSucursal} disabled={!isGlobalAdmin}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {isGlobalAdmin && <SelectItem value="all">Todas las sucursales</SelectItem>}
                  {sucursales.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={selectedStatus} onValueChange={(v) => setSelectedStatus(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los Estados</SelectItem>
                  <SelectItem value="Active">Activos</SelectItem>
                  <SelectItem value="Pending">Pendientes</SelectItem>
                  <SelectItem value="Approved">Aprobados</SelectItem>
                  <SelectItem value="Paid">Cancelados</SelectItem>
                  <SelectItem value="Rejected">Rechazados</SelectItem>
                  <SelectItem value="Expired">Vencidos</SelectItem>
                  <SelectItem value="Fallecido">Fallecido</SelectItem>
                </SelectContent>
              </Select>
              <Select value={selectedGestor} onValueChange={setSelectedGestor}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="all">Todos los Gestores</SelectItem>{gestores.map(g => <SelectItem key={g.id} value={g.id!}>{g.fullName}</SelectItem>)}</SelectContent>
              </Select>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input placeholder="Buscar por nombre o ID..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-8 h-9 text-sm" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            {isLoading ? (
              <div className="flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="min-h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead># Crédito</TableHead>
                      <TableHead>Nombre del Cliente</TableHead>
                      <TableHead>Desembolso</TableHead>
                      <TableHead>Tasa</TableHead>
                      <TableHead>Plazo</TableHead>
                      <TableHead>Gestor Cobro</TableHead>
                      <TableHead>Vencimiento</TableHead>
                      <TableHead>Riesgo</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedCredits.length > 0 ? (
                      paginatedCredits.map((credit) => {
                        const { conamiCategory } = calculateCreditStatusDetails(credit);
                        const riskVariant = getRiskCategoryVariant(conamiCategory);
                        return (
                          <TableRow key={credit.id}>
                            <TableCell className="font-mono">{credit.creditNumber}</TableCell>
                            <TableCell className="font-medium">
                              <Link href={`/credits/${credit.id}`} className="hover:underline text-primary">
                                {credit.clientName}
                              </Link>
                            </TableCell>
                            <TableCell>{formatCurrency(credit.principalAmount)}</TableCell>
                            <TableCell>{credit.interestRate}%</TableCell>
                            <TableCell>{credit.termMonths} meses</TableCell>
                            <TableCell>{credit.collectionsManager}</TableCell>
                            <TableCell>{formatDate(credit.dueDate)}</TableCell>
                            <TableCell><Badge variant={riskVariant}>{conamiCategory}</Badge></TableCell>
                            <TableCell><Badge variant={credit.status === 'Active' ? 'default' : 'secondary'}>{translateCreditStatus(credit.status)}</Badge></TableCell>
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <Settings className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem asChild>
                                    <Link href={`/credits/${credit.id}`}><Eye className="mr-2 h-4 w-4" /> Ver Detalles</Link>
                                  </DropdownMenuItem>
                                  {canEditCredit(credit) && (
                                    <DropdownMenuItem asChild>
                                      <Link href={`/credits/${credit.id}/edit`}><Edit className="mr-2 h-4 w-4" /> Editar</Link>
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem onClick={() => handlePrintPromissoryNote(credit.id)}>
                                    <FileSignature className="mr-2 h-4 w-4" /> Imprimir Pagaré
                                  </DropdownMenuItem>
                                  {canDelete && (
                                    <>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem onSelect={() => setCreditToDelete(credit)} className="text-destructive">
                                        <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                                      </DropdownMenuItem>
                                    </>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center h-24">
                          No se encontraron créditos con los filtros seleccionados.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
            <div className="flex items-center justify-end space-x-2 py-4">
              <span className="text-sm text-muted-foreground">Página {page} de {maxPage}</span>
              <Button variant="outline" size="sm" onClick={handlePrevPage} disabled={page === 1 || isLoading}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Anterior
              </Button>
              <Button variant="outline" size="sm" onClick={handleNextPage} disabled={page >= maxPage || isLoading}>
                Siguiente <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={!!creditToDelete} onOpenChange={(open) => !open && setCreditToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              ¿Eliminar Crédito Permanentemente?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p className="font-semibold text-foreground">
                Estás a punto de eliminar el crédito {creditToDelete?.creditNumber} de {creditToDelete?.clientName}
              </p>
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 space-y-2">
                <p className="text-sm font-medium text-destructive">⚠️ ADVERTENCIA: Esta acción es IRREVERSIBLE</p>
                <ul className="text-sm space-y-1 list-disc list-inside text-muted-foreground">
                  <li>Se eliminará permanentemente del sistema</li>
                  <li>Se perderá todo el historial asociado</li>
                  <li>No se puede eliminar si tiene pagos registrados</li>
                </ul>
              </div>
              <p className="text-sm text-muted-foreground">
                Si el crédito tiene pagos aplicados, deberás anularlos primero antes de poder eliminarlo.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCredit} className="bg-destructive hover:bg-destructive/90">
              Sí, Eliminar Permanentemente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
