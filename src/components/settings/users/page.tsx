
"use client"
import * as React from "react"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { PlusCircle, Loader2, Settings, Edit, Trash2 } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { UserForm } from "./components/UserForm"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import { useUser } from "@/hooks/use-user"
import { resetUserPassword, deleteUser } from "./actions"
import type { UserRole, AppUser as User } from "@/lib/types"
import { getUsers as getUsersServer } from "@/services/user-service-server";


const CREATE_ROLES: UserRole[] = ['ADMINISTRADOR', 'OPERATIVO'];
const EDIT_DELETE_ROLES: UserRole[] = ['ADMINISTRADOR', 'OPERATIVO'];
const RESET_PASS_ROLES: UserRole[] = ['ADMINISTRADOR'];

export default function UsersPage() {
  const { toast } = useToast();
  const router = useRouter();
  const { user: currentUser } = useUser();

  const [users, setUsers] = React.useState<User[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [isSheetOpen, setIsSheetOpen] = React.useState(false);
  const [editingUser, setEditingUser] = React.useState<User | null>(null);
  const [deletingUser, setDeletingUser] = React.useState<User | null>(null);
  const [resettingUser, setResettingUser] = React.useState<User | null>(null);

  const canCreate = currentUser && CREATE_ROLES.includes(currentUser.role.toUpperCase() as UserRole);
  const canEdit = currentUser && EDIT_DELETE_ROLES.includes(currentUser.role.toUpperCase() as UserRole);
  const canDelete = currentUser && DELETE_DELETE_ROLES.includes(currentUser.role.toUpperCase() as UserRole);
  const canResetPassword = currentUser && RESET_PASS_ROLES.includes(currentUser.role.toUpperCase() as UserRole);

  const fetchUsers = React.useCallback(async () => {
    setLoading(true);
    try {
        const usersData = await getUsersServer();
        setUsers(usersData);
    } catch (error) {
        console.error("Error fetching users: ", error);
        toast({
            title: "Error al Cargar Usuarios",
            description: "No se pudieron cargar los datos de los usuarios.",
            variant: "destructive"
        });
    } finally {
        setLoading(false);
    }
  }, [toast]);

  React.useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);


  const handleEdit = (user: User) => {
    setEditingUser(user);
    setIsSheetOpen(true);
  };

  const handleAddNew = () => {
    setEditingUser(null);
    setIsSheetOpen(true);
  };

  const handleSheetClose = (open: boolean) => {
    if (!open) {
      setEditingUser(null);
    }
    setIsSheetOpen(open);
  };

  const handleFormFinished = () => {
    setIsSheetOpen(false);
    fetchUsers();
  };

  const handleDeleteConfirm = async () => {
    if(deletingUser && currentUser) {
        try {
            await deleteUser(deletingUser.id, currentUser);
            toast({
                title: "Usuario Eliminado",
                description: "El usuario ha sido eliminado.",
            });
            fetchUsers();
        } catch(error: any) {
            console.error("Error deleting user: ", error);
            toast({
                title: "Error al Eliminar",
                description: error.message || "No se pudo eliminar el usuario.",
                variant: "destructive",
            });
        } finally {
            setDeletingUser(null);
        }
    }
  };

  const handleResetPassword = async () => {
    if (resettingUser && currentUser) {
      try {
        await resetUserPassword(resettingUser.id, currentUser);
        toast({
          title: "Contraseña Reseteada",
          description: `Se ha forzado el cambio de contraseña para ${resettingUser.fullName}.`,
        });
      } catch (error: any) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } finally {
        setResettingUser(null);
      }
    }
  };

  return (
    <div>
      <div className="flex justify-end mb-6">
        {canCreate && (
            <Button onClick={handleAddNew}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Agregar Usuario
            </Button>
        )}
      </div>

      <div className="rounded-lg border shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead>Sucursal</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
             {loading ? (
                <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                    </TableCell>
                </TableRow>
            ) : users.length > 0 ? (
                users.map((user) => (
                <TableRow key={user.id}>
                    <TableCell className="font-medium uppercase">{user.fullName}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell className="uppercase">{user.role}</TableCell>
                    <TableCell className="uppercase">{user.sucursalName}</TableCell>
                    <TableCell>
                    <Badge variant={user.active ? 'default' : 'secondary'}>{user.active ? 'Activo' : 'Inactivo'}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" disabled={!canEdit && !canDelete && !canResetPassword}>
                            <Settings className="h-4 w-4" />
                        </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                           {canEdit && <DropdownMenuItem onSelect={() => handleEdit(user)}><Edit className="mr-2 h-4 w-4"/>Editar</DropdownMenuItem>}
                           {canResetPassword && <DropdownMenuItem onSelect={() => setResettingUser(user)}>Resetear Contraseña</DropdownMenuItem>}
                           {canDelete && <DropdownMenuItem onSelect={() => setDeletingUser(user)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" />Eliminar</DropdownMenuItem>}
                        </DropdownMenuContent>
                    </DropdownMenu>
                    </TableCell>
                </TableRow>
                ))
            ) : (
                <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                    No hay usuarios registrados.
                    </TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Sheet open={isSheetOpen} onOpenChange={handleSheetClose}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{editingUser ? "Editar Usuario" : "Agregar Nuevo Usuario"}</SheetTitle>
          </SheetHeader>
          <UserForm onFinished={handleFormFinished} initialData={editingUser} />
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!deletingUser} onOpenChange={(open) => !open && setDeletingUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Está seguro?</AlertDialogTitle>
            <AlertDialogDescription>Esta acción no se puede deshacer y eliminará al usuario permanentemente.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive hover:bg-destructive/80">Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!resettingUser} onOpenChange={(open) => !open && setResettingUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Resetear Contraseña</AlertDialogTitle>
            <AlertDialogDescription>¿Está seguro de que desea forzar a este usuario a cambiar su contraseña en el próximo inicio de sesión?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleResetPassword}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
