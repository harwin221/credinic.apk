"use client"
import * as React from "react"
import { PageHeader } from "@/components/PageHeader"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { PlusCircle, Loader2, ArrowLeft, Settings, Edit, Trash2 } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { UserForm } from "./components/UserForm"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import { useUser } from "@/hooks/use-user"
import { resetUserPassword, deleteUser } from "./actions"
import type { UserRole, AppUser, Sucursal } from "@/lib/types"
import { getUsers as getUsersServer } from "@/services/user-service-server"
import { getSucursales } from "@/services/sucursal-service"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"


const CREATE_ROLES: UserRole[] = ['ADMINISTRADOR'];
const EDIT_DELETE_ROLES: UserRole[] = ['ADMINISTRADOR'];
const RESET_PASS_ROLES: UserRole[] = ['ADMINISTRADOR'];

export default function UsersPage() {
  const { toast } = useToast();
  const router = useRouter();
  const { user: currentUser } = useUser();

  const [users, setUsers] = React.useState<AppUser[]>([]);
  const [filteredUsers, setFilteredUsers] = React.useState<AppUser[]>([]);
  const [sucursales, setSucursales] = React.useState<Sucursal[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [isSheetOpen, setIsSheetOpen] = React.useState(false);
  const [editingUser, setEditingUser] = React.useState<AppUser | null>(null);
  const [userAction, setUserAction] = React.useState<{ type: 'delete' | 'reset', user: AppUser } | null>(null);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedSucursal, setSelectedSucursal] = React.useState<string>('all');


  const fetchUsers = React.useCallback(async () => {
    setLoading(true);
    try {
      const [usersData, sucursalesData] = await Promise.all([
        getUsersServer(currentUser || undefined),
        getSucursales()
      ]);
      setUsers(usersData);
      setSucursales(sucursalesData);
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
  }, [toast, currentUser]);

  React.useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Filtrar usuarios según permisos y filtros seleccionados
  React.useEffect(() => {
    let filtered = users;

    // Filtrar por rol del usuario actual
    if (currentUser) {
      const userRole = currentUser.role.toUpperCase();
      if (['GERENTE', 'OPERATIVO'].includes(userRole) && currentUser.sucursal) {
        // Estos roles solo ven usuarios de su sucursal
        filtered = filtered.filter(user => user.sucursal === currentUser.sucursal);
      }
    }

    // Filtrar por sucursal seleccionada
    if (selectedSucursal !== 'all') {
      filtered = filtered.filter(user => user.sucursal === selectedSucursal);
    }

    // Filtrar por término de búsqueda
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(user => 
        user.fullName.toLowerCase().includes(term) ||
        user.email.toLowerCase().includes(term) ||
        user.role.toLowerCase().includes(term) ||
        (user.sucursalName && user.sucursalName.toLowerCase().includes(term))
      );
    }

    setFilteredUsers(filtered);
  }, [users, selectedSucursal, searchTerm, currentUser]);

  const canCreate = currentUser && CREATE_ROLES.includes(currentUser.role.toUpperCase() as UserRole);
  const canEdit = currentUser && EDIT_DELETE_ROLES.includes(currentUser.role.toUpperCase() as UserRole);
  const canDelete = currentUser && EDIT_DELETE_ROLES.includes(currentUser.role.toUpperCase() as UserRole);
  const canResetPassword = currentUser && RESET_PASS_ROLES.includes(currentUser.role.toUpperCase() as UserRole);

  // Determinar qué sucursales puede ver el usuario actual
  const availableSucursales = React.useMemo(() => {
    if (!currentUser) return [];
    
    const userRole = currentUser.role.toUpperCase();
    if (['ADMINISTRADOR', 'FINANZAS'].includes(userRole)) {
      // ADMINISTRADOR y FINANZAS pueden ver todas las sucursales
      return sucursales;
    } else if (['GERENTE', 'OPERATIVO'].includes(userRole) && currentUser.sucursal) {
      // Otros roles solo ven su sucursal
      return sucursales.filter(s => s.id === currentUser.sucursal);
    }
    return [];
  }, [currentUser, sucursales]);

  const handleEdit = (user: AppUser) => {
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

  const handleConfirmAction = async () => {
    if (!userAction || !currentUser) return;

    if (userAction.type === 'delete') {
      try {
        await deleteUser(userAction.user.id, currentUser);
        toast({
          title: "Usuario Eliminado",
          description: "El usuario ha sido eliminado.",
        });
        fetchUsers();
      } catch (error: any) {
        toast({
          title: "Error al Eliminar",
          description: error.message || "No se pudo eliminar el usuario.",
          variant: "destructive",
        });
      }
    } else if (userAction.type === 'reset') {
      try {
        await resetUserPassword(userAction.user.id, currentUser);
        toast({
          title: "Contraseña Reseteada",
          description: `Se ha forzado el cambio de contraseña para ${userAction.user.fullName}.`,
        });
      } catch (error: any) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      }
    }
    setUserAction(null);
  };

  return (
    <div>
      {/* Encabezado con título dinámico */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="outline"
            onClick={() => router.push('/settings')}
            className="flex items-center gap-2 bg-green-50 hover:bg-green-100 text-green-700 border-green-200 hover:border-green-300 h-9 px-4"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="font-medium">Configuración</span>
          </Button>
        </div>
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            {currentUser && ['GERENTE', 'OPERATIVO'].includes(currentUser.role.toUpperCase()) && currentUser.sucursalName
              ? `Usuarios - ${currentUser.sucursalName} (${filteredUsers.length})`
              : `Gestión de Usuarios (${filteredUsers.length})`
            }
          </h1>
          <div>
            {canCreate && (
              <Button onClick={handleAddNew} className="bg-blue-600 hover:bg-blue-700">
                <PlusCircle className="mr-2 h-4 w-4" />
                Agregar Usuario
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Controles de filtro */}
      <div className="mb-6 flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre, email o rol..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 h-9 text-sm"
          />
        </div>
        {availableSucursales.length > 1 && (
          <div className="w-56">
            <select
              value={selectedSucursal}
              onChange={(e) => setSelectedSucursal(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="all">Todas las sucursales</option>
              {availableSucursales.map(sucursal => (
                <option key={sucursal.id} value={sucursal.id}>
                  {sucursal.name}
                </option>
              ))}
            </select>
          </div>
        )}
        {availableSucursales.length === 1 && (
          <div className="w-56 flex items-center px-3 py-1.5 text-xs text-muted-foreground bg-muted/50 rounded-md border">
            📍 {availableSucursales[0].name}
          </div>
        )}
      </div>

      <div className="rounded-lg border shadow-sm bg-white">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead className="font-semibold">Nombre</TableHead>
              <TableHead className="font-semibold">Email</TableHead>
              <TableHead className="font-semibold">Rol</TableHead>
              <TableHead className="font-semibold">Sucursal</TableHead>
              <TableHead className="font-semibold">Estado</TableHead>
              <TableHead className="text-right font-semibold">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                    <span className="text-sm text-muted-foreground">Cargando usuarios...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredUsers.length > 0 ? (
              filteredUsers.map((user) => (
                <TableRow key={user.id} className="hover:bg-gray-50">
                  <TableCell className="font-medium">{user.fullName}</TableCell>
                  <TableCell className="text-gray-600">{user.email}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-medium">
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-gray-600">{user.sucursalName}</TableCell>
                  <TableCell>
                    <Badge 
                      variant={user.active !== false ? 'default' : 'secondary'}
                      className={user.active !== false ? 'bg-green-100 text-green-800 hover:bg-green-100' : ''}
                    >
                      {user.active !== false ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" disabled={!canEdit && !canDelete && !canResetPassword} className="hover:bg-gray-100">
                          <Settings className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {canEdit && <DropdownMenuItem onSelect={() => handleEdit(user)}><Edit className="mr-2 h-4 w-4" />Editar</DropdownMenuItem>}
                        {canResetPassword && <DropdownMenuItem onSelect={() => setUserAction({ type: 'reset', user })}>Resetear Contraseña</DropdownMenuItem>}
                        {canDelete && <DropdownMenuItem onSelect={() => setUserAction({ type: 'delete', user })} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" />Eliminar</DropdownMenuItem>}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <span className="text-sm">No hay usuarios registrados.</span>
                  </div>
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

      <AlertDialog open={!!userAction} onOpenChange={(open) => !open && setUserAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Está seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              {userAction?.type === 'delete'
                ? "Esta acción no se puede deshacer y eliminará al usuario permanentemente."
                : "Esto forzará al usuario a cambiar su contraseña en el próximo inicio de sesión."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmAction}
              className={userAction?.type === 'delete' ? 'bg-destructive hover:bg-destructive/80' : ''}>
              {userAction?.type === 'delete' ? 'Eliminar' : 'Confirmar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
