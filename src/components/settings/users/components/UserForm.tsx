
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
import { CreateUserInputSchema } from "@/lib/types"
import { USER_ROLES } from "@/lib/constants"
import { Loader2, Phone } from "lucide-react"
import { formatPhone } from "@/lib/utils"
import { useUser } from "@/hooks/use-user"
import { getSucursales } from "@/services/sucursal-service"
import { getUsers as getUsersClient } from "@/services/user-service-client"

type User = { 
  id: string,
  fullName: string,
  email: string,
  phone?: string;
  role: string,
  sucursal?: string;
  sucursalName?: string;
  active: boolean
};

type UserFormProps = {
  onFinished: () => void;
  initialData?: User | null;
}

const GLOBAL_ACCESS_ROLES = ['ADMINISTRADOR', 'FINANZAS'];

export function UserForm({ onFinished, initialData }: UserFormProps) {
  const { toast } = useToast()
  const { user: currentUser } = useUser();
  const [branches, setBranches] = React.useState<{value: string, label: string}[]>([]);
  const [loading, setLoading] = React.useState(false);
  
  const formSchema = React.useMemo(() => {
    return CreateUserInputSchema.superRefine((data, ctx) => {
        if (!initialData && (!data.password || data.password.length < 6)) {
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
            const branchesData = await getSucursales();
            setBranches(branchesData.map(doc => ({
                value: doc.id,
                label: doc.name.toUpperCase()
            })));
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
      email: initialData?.email || "",
      password: "",
      phone: initialData?.phone || "",
      role: initialData?.role || "",
      branch: initialData?.sucursal || "",
      status: initialData?.active ?? true
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
        email: initialData.email,
        phone: initialData.phone || '',
        role: initialData.role,
        branch: initialData.sucursal,
        status: initialData.active,
        password: "" // La contraseña no se obtiene para editar
      });
      setPhoneValue(initialData.phone || '');
    } else {
      form.reset({ displayName: "", email: "", password: "", phone: "", role: "", branch: "", status: true });
      setPhoneValue('');
    }
  }, [initialData, form]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);
    if (!currentUser) {
        toast({ title: "Error", description: "No se pudo identificar al usuario actual.", variant: "destructive" });
        setLoading(false);
        return;
    }
    try {
        const selectedBranch = branches.find(b => b.value === values.branch);
        
      if (initialData) {
        await updateUserAction(initialData.id, {
            fullName: values.displayName.toUpperCase(),
            email: values.email,
            phone: values.phone || null,
            role: values.role.toUpperCase(),
            sucursal: selectedBranch?.value || values.branch,
            sucursalName: selectedBranch?.label || values.branch,
            active: values.status
        }, currentUser);

      } else {
        if(!values.password) {
            toast({ title: "Error", description: "La contraseña es requerida para nuevos usuarios.", variant: "destructive" });
            setLoading(false);
            return;
        }
        await createUser({
            displayName: values.displayName,
            email: values.email,
            password: values.password,
            phone: values.phone,
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
    } catch(e: any) {
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
                  <Input placeholder="Ej: Juan Pérez" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Correo Electrónico</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="Ej: usuario@credinica.com" {...field} className="normal-case"/>
                </FormControl>
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
          {!initialData && (
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contraseña</FormLabel>
                  <FormControl>
                    <Input type="password" {...field} />
                  </FormControl>
                  <FormDescription>
                    La contraseña debe tener al menos 6 caracteres.
                  </FormDescription>
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
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                {loading ? 'Guardando...' : initialData ? 'Guardar Cambios' : 'Crear Usuario'}
            </Button>
        </div>
      </form>                                    
    </Form>
  )
}
