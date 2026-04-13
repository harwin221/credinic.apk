"use client"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import * as React from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { createUser, updateUserAction } from "@/app/settings/users/actions"
import { CreateUserInputSchema, AppUser } from "@/lib/types"
import { USER_ROLES } from "@/lib/constants"
import { Loader2, Phone, Eye, EyeOff, Info } from "lucide-react"
import { formatPhone } from "@/lib/utils"
import { useUser } from "@/hooks/use-user"
import { getSucursales } from "@/services/sucursal-service"
import { getUsers as getUsersClient } from "@/services/user-service-client"

type UserFormProps = {
  onFinished: () => void;
  initialData?: AppUser | null;
}

const GLOBAL_ACCESS_ROLES = ['ADMINISTRADOR', 'FINANZAS'];

export function UserForm({ onFinished, initialData }: UserFormProps) {
  const { toast } = useToast()
  const { user: currentUser } = useUser();
  const [branches, setBranches] = React.useState<{ value: string, label: string }[]>([]);
  const [existingUsers, setExistingUsers] = React.useState<AppUser[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);

  const formSchema = React.useMemo(() => {
    return CreateUserInputSchema.superRefine((data, ctx) => {
      // En modo creación, la contraseña es obligatoria y mín 6 chars
      if (!initialData && (!data.password || data.password.length < 6)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["password"],
          message: "La contraseña debe tener al menos 6 caracteres.",
        });
      }
      // En modo edición, si se pone algo, debe ser mín 6 chars
      if (initialData && data.password && data.password.length > 0 && data.password.length < 6) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["password"],
          message: "La contraseña debe tener al menos 6 caracteres.",
        });
      }
    });
  }, [initialData]);

  React.useEffect(() => {
    const fetchFormData = async () => {
      try {
        const [branchesData, usersData] = await Promise.all([
          getSucursales(),
          getUsersClient()
        ]);

        if (branchesData && Array.isArray(branchesData)) {
          setBranches(branchesData.map(doc => ({
            value: doc.id,
            label: doc.name.toUpperCase()
          })));
        }

        if (usersData) {
          setExistingUsers(usersData);
        }

      } catch (error) {
        console.error("Error al obtener datos del formulario: ", error);
      }
    };
    fetchFormData();
  }, []);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      displayName: initialData?.fullName || "",
      username: initialData?.username || initialData?.email || "",
      email: (initialData?.username && initialData?.email) ? initialData.email : "", // Si ya tiene username, el email es real. Si no, el email era username.
      password: "",
      phone: initialData?.phone || "",
      role: initialData?.role || "",
      branch: initialData?.sucursal || "",
      status: initialData?.active !== false
    },
  })

  const role = form.watch("role");
  const [phoneValue, setPhoneValue] = React.useState(form.getValues('phone') || '');
  const showPhoneField = ['GESTOR'].includes(role);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    setPhoneValue(formatted);
    form.setValue('phone', formatted, { shouldValidate: true });
  };


  React.useEffect(() => {
    if (GLOBAL_ACCESS_ROLES.includes(role)) {
      form.setValue('branch', 'TODAS');
    }
  }, [role, form]);

  React.useEffect(() => {
    if (initialData) {
      form.reset({
        displayName: initialData.fullName,
        username: initialData.username || initialData.email,
        email: (initialData.username && initialData.email) ? initialData.email : "",
        phone: initialData.phone || '',
        role: initialData.role,
        branch: initialData.sucursal || (GLOBAL_ACCESS_ROLES.includes(initialData.role) ? 'TODAS' : ''),
        status: initialData.active !== false,
        password: "", // La contraseña no se obtiene para editar
      });
      setPhoneValue(initialData.phone || '');
    } else {
      // Reset defaults for new user
      form.reset({
        displayName: "",
        username: "",
        email: "",
        password: "",
        phone: "",
        role: "",
        branch: "",
        status: true
      });
      setPhoneValue('');
    }
  }, [initialData, form]);

  const generateUsername = (fullName: string) => {
    if (!fullName) return;

    const currentUsername = form.getValues('username');
    // Solo generar si el campo de usuario está vacío o si estamos creando uno nuevo
    // Si estamos editando y ya tiene usuario, no lo sobreescribimos automáticamente a menos que esté vacío
    if (initialData && currentUsername) return;
    if (!initialData && currentUsername) return; // Si el usuario ya escribió algo, no lo borramos

    // Normalizar: quitar acentos, minúsculas
    const normalized = fullName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const parts = normalized.split(' ').filter(p => p.length > 0);

    if (parts.length < 2) return; // Necesitamos al menos nombre y apellido

    let baseUsername = `${parts[0]}.${parts[1]}`; // juan.perez

    // Chequear duplicados
    let candidate = baseUsername;
    let counter = 1;

    // Filtrar usuarios existentes para no chocar (excluyendo el actual si es edición)
    const otherUsers = initialData
      ? existingUsers.filter(u => u.id !== initialData.id)
      : existingUsers;

    while (otherUsers.some(u => (u.username || u.email || '').toLowerCase() === candidate)) {
      candidate = `${baseUsername}${counter}`;
      counter++;
    }

    form.setValue('username', candidate, { shouldValidate: true });
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    console.log('[UserForm] onSubmit called with values:', values);
    setLoading(true);
    if (!currentUser) {
      toast({ title: "Error", description: "No se pudo identificar al usuario actual.", variant: "destructive" });
      setLoading(false);
      return;
    }
    try {
      const selectedBranch = branches.find(b => b.value === values.branch);

      if (initialData) {
        const updateData: any = {
          fullName: values.displayName.toUpperCase(),
          username: values.username,
          email: values.email || undefined,
          phone: values.phone || undefined,
          role: values.role.toUpperCase() as any,
          sucursal: values.branch,
          sucursalName: selectedBranch?.label,
          active: values.status,
        };
        
        // Solo incluir password si se ingresó algo
        if (values.password && values.password.trim().length > 0) {
          console.log('[UserForm] Including password in update');
          updateData.password = values.password;
        }
        
        console.log('[UserForm] Calling updateUserAction with:', updateData);
        await updateUserAction(initialData.id, updateData, currentUser);

      } else {
        if (!values.password) {
          toast({ title: "Error", description: "La contraseña es requerida para nuevos usuarios.", variant: "destructive" });
          setLoading(false);
          return;
        }
        await createUser({
          displayName: values.displayName,
          username: values.username,
          email: values.email || undefined,
          password: values.password,
          phone: values.phone || undefined,
          role: values.role.toUpperCase(),
          branch: values.branch,
          status: values.status
        }, currentUser);
      }
      toast({
        title: `Usuario ${initialData ? 'Actualizado' : 'Creado'}`,
        description: "La información se ha guardado exitosamente.",
      })
      onFinished()
    } catch (e: any) {
      console.error("Error al guardar usuario: ", e);
      toast({
        title: "Error al Guardar",
        description: e.message || "No se pudo guardar la información del usuario.",
        variant: "destructive"
      })
    } finally {
      setLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="h-full flex flex-col">
        <div className="flex-1 overflow-y-auto pr-6 pl-1 -mr-6 space-y-6 py-4">
          <FormField
            control={form.control}
            name="displayName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nombre Completo</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Ej: Juan Pérez"
                    {...field}
                    onBlur={(e) => {
                      field.onBlur();
                      generateUsername(e.target.value);
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="username"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Usuario</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Ej: juan.perez"
                    {...field}
                    className="normal-case"
                  />
                </FormControl>
                <FormDescription className="text-xs">
                  Se generará automáticamente (nombre.apellido) si se deja vacío. El usuario se usará para iniciar sesión.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {initialData && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-amber-600 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-amber-900 mb-1">
                    Cambio de Contraseña
                  </p>
                  <p className="text-xs text-amber-700">
                    La contraseña actual está protegida y no se puede recuperar. Si ingresas una nueva contraseña abajo, el usuario deberá cambiarla en su próximo inicio de sesión.
                  </p>
                </div>
              </div>
            </div>
          )}

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{initialData ? 'Nueva Contraseña Temporal' : 'Contraseña'}</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder={initialData ? "Ingrese nueva contraseña temporal" : "Mínimo 6 caracteres"}
                      {...field}
                      onChange={(e) => field.onChange(e.target.value)}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                </FormControl>
                {initialData ? (
                  <FormDescription className="text-xs">
                    <strong>Importante:</strong> Anota esta contraseña antes de guardar. El usuario deberá usarla para iniciar sesión y luego cambiarla por una personal.
                  </FormDescription>
                ) : (
                  <FormDescription>
                    La contraseña debe tener al menos 6 caracteres. El usuario deberá cambiarla en su primer inicio de sesión.
                  </FormDescription>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
          {showPhoneField && (
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Teléfono</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input type="tel" placeholder="8888-8888" {...field} value={phoneValue} onChange={handlePhoneChange} className="pl-8" maxLength={9} />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <FormField
            control={form.control}
            name="role"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Rol</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger><SelectValue placeholder="Seleccione un rol..." /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {USER_ROLES.map(role => <SelectItem key={role} value={role}>{role}</SelectItem>)}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="branch"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Sucursal</FormLabel>
                <Select onValueChange={field.onChange} value={field.value} disabled={GLOBAL_ACCESS_ROLES.includes(role)}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione una sucursal..." />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {GLOBAL_ACCESS_ROLES.includes(role) ? (
                      <SelectItem value="TODAS">TODAS</SelectItem>
                    ) : (
                      branches.map(branch => <SelectItem key={branch.value} value={branch.value}>{branch.label}</SelectItem>)
                    )}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                <div className="space-y-0.5">
                  <FormLabel>Estado del Usuario</FormLabel>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </div>
        <div className="bg-background/95 py-4 mt-auto">
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {loading ? 'Guardando...' : initialData ? 'Guardar Cambios' : 'Crear Usuario'}
          </Button>
        </div>
      </form>
    </Form>
  )
}
// Force deployment trigger