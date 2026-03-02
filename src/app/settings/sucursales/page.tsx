'use client';

import * as React from 'react';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, Edit, Trash2, ArrowLeft, Loader2 } from 'lucide-react';
import { deleteSucursal, getSucursales } from '@/services/sucursal-service';
import type { Sucursal, UserRole } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { SucursalForm } from './components/SucursalForm';
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
import { useUser } from '@/hooks/use-user';
import { useToast } from '@/hooks/use-toast';
import { AccessDenied } from '@/components/AccessDenied';
import { useRouter } from 'next/navigation';

const VIEW_ROLES: UserRole[] = ['ADMINISTRADOR', 'OPERATIVO', 'GERENTE', 'FINANZAS'];
const CREATE_ROLES: UserRole[] = ['ADMINISTRADOR', 'OPERATIVO'];
const EDIT_ROLES: UserRole[] = ['ADMINISTRADOR', 'OPERATIVO'];
const DELETE_ROLES: UserRole[] = ['ADMINISTRADOR'];

export default function SucursalesPage() {
  const { user } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const [sucursales, setSucursales] = React.useState<Sucursal[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingSucursal, setEditingSucursal] = React.useState<Sucursal | null>(null);
  const [sucursalToDelete, setSucursalToDelete] = React.useState<Sucursal | null>(null);

  const canView = user && VIEW_ROLES.includes(user.role.toUpperCase() as UserRole);
  const canCreate = user && CREATE_ROLES.includes(user.role.toUpperCase() as UserRole);
  const canEdit = user && EDIT_ROLES.includes(user.role.toUpperCase() as UserRole);
  const canDelete = user && DELETE_ROLES.includes(user.role.toUpperCase() as UserRole);

  const fetchSucursales = React.useCallback(async () => {
    if (!canView) {
        setIsLoading(false);
        return;
    }
    setIsLoading(true);
    try {
        const sucursalList = await getSucursales();
        setSucursales(sucursalList);
    } catch (error) {
        console.error("Error fetching sucursales:", error);
        toast({ title: 'Error', description: 'No se pudieron cargar las sucursales.', variant: 'destructive'});
    } finally {
        setIsLoading(false);
    }
  }, [toast, canView]);

  React.useEffect(() => {
    fetchSucursales();
  }, [fetchSucursales]);
  
  const handleOpenForm = (sucursal: Sucursal | null) => {
    setEditingSucursal(sucursal);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingSucursal(null);
  };
  
  const handleSuccess = () => {
    fetchSucursales();
    handleCloseForm();
  };

  const handleDeleteSucursal = async () => {
    if (!sucursalToDelete || !user) return;
    const result = await deleteSucursal(sucursalToDelete.id, user);
    
    if (result.success) {
      toast({
        title: "Sucursal Eliminada",
        description: `La sucursal ${sucursalToDelete.name} ha sido eliminada.`,
      });
      fetchSucursales();
    } else {
       toast({
        title: "Error al eliminar",
        description: result.error || "No se pudo eliminar la sucursal.",
        variant: "destructive",
      });
    }
    setSucursalToDelete(null);
  };
  
  if (!user) {
    return <div className="flex h-screen w-full items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }
  
  if (!canView) {
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
          {canCreate && (
              <Button onClick={() => handleOpenForm(null)}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Agregar Sucursal
              </Button>
          )}
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Lista de Sucursales</CardTitle>
          <CardDescription>Sucursales o puntos de venta activos en el sistema.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Gerente Asignado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, index) => (
                  <TableRow key={index}>
                    <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-20 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : sucursales.length > 0 ? (
                sucursales.map(sucursal => (
                  <TableRow key={sucursal.id}>
                    <TableCell className="font-medium">{sucursal.name}</TableCell>
                    <TableCell>
                      {sucursal.managerName ? (
                        <Badge variant="outline">{sucursal.managerName}</Badge>
                      ) : (
                        <span className="text-muted-foreground">Sin asignar</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                        {canEdit && (
                            <Button variant="ghost" size="icon" onClick={() => handleOpenForm(sucursal)}>
                                <Edit className="h-4 w-4" />
                            </Button>
                        )}
                        {canDelete && (
                             <Button variant="ghost" size="icon" onClick={() => setSucursalToDelete(sucursal)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                        )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={3} className="h-24 text-center">
                    No se encontraron sucursales.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
    
    <SucursalForm 
        isOpen={isFormOpen} 
        onClose={handleCloseForm} 
        onSuccess={handleSuccess}
        initialData={editingSucursal}
    />

     <AlertDialog open={!!sucursalToDelete} onOpenChange={(open) => !open && setSucursalToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Confirmar eliminación?</AlertDialogTitle>
            <AlertDialogDescription>
              Estás a punto de eliminar la sucursal <strong>{sucursalToDelete?.name}</strong>. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSucursal} className="bg-destructive hover:bg-destructive/90">
              Confirmar Eliminación
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
