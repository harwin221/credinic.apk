
'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { addSucursal, updateSucursal } from '@/services/sucursal-service';
import { getUsers as getUsersClient } from '@/services/user-service-client'; // Client-side fetch
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import type { Sucursal, User } from '@/lib/types';
import { useUser } from '@/hooks/use-user';

const sucursalFormSchema = z.object({
  name: z.string().min(3, { message: 'El nombre debe tener al menos 3 caracteres.' }).transform(v => v.toUpperCase()),
  managerId: z.string().optional(),
});

type SucursalFormValues = z.infer<typeof sucursalFormSchema>;

interface SucursalFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: Sucursal | null;
}

export function SucursalForm({ isOpen, onClose, onSuccess, initialData }: SucursalFormProps) {
  const { user: actor } = useUser();
  const [managers, setManagers] = React.useState<User[]>([]);
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const isEditMode = !!initialData;

  const form = useForm<SucursalFormValues>({
    resolver: zodResolver(sucursalFormSchema),
  });

  React.useEffect(() => {
    if (isOpen) {
      form.reset({
        name: initialData?.name || '',
        managerId: initialData?.managerId || 'unassigned',
      });

      const fetchManagers = async () => {
        const users = await getUsersClient();
        setManagers(users.filter(u => u.role === 'ADMINISTRADOR' || u.role === 'GERENTE'));
      };
      fetchManagers();
    }
  }, [isOpen, initialData, form]);

  const handleSubmit = async (data: SucursalFormValues) => {
    if (!actor) {
        toast({title: "Error", description: "No se pudo identificar al usuario.", variant: "destructive"});
        return;
    }

    setIsSubmitting(true);
    
    const managerIdForPayload = data.managerId === 'unassigned' ? '' : data.managerId;
    const selectedManager = managers.find(m => m.id === managerIdForPayload);
    
    const payload = {
        name: data.name,
        managerId: managerIdForPayload,
        managerName: selectedManager?.fullName || ''
    };

    try {
      let result;
      if (isEditMode && initialData) {
        result = await updateSucursal(initialData.id, payload, actor);
      } else {
        result = await addSucursal(payload, actor);
      }

      if (result.success) {
          toast({ title: isEditMode ? "Sucursal Actualizada" : "Sucursal Creada" });
          onSuccess();
          onClose();
      } else {
          throw new Error(result.error);
      }

    } catch (error) {
      toast({
        title: "Error al guardar la sucursal",
        description: error instanceof Error ? error.message : "Ocurrió un error inesperado.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Editar' : 'Agregar'} Sucursal</DialogTitle>
          <DialogDescription>
            {isEditMode ? 'Modifica los detalles de la sucursal.' : 'Crea una nueva sucursal o punto de venta.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 py-2">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre de la Sucursal</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: Sucursal Central" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="managerId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Gerente de Sucursal</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar gerente" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="unassigned">Sin Asignar</SelectItem>
                      {managers.map(manager => (
                        <SelectItem key={manager.id} value={manager.id!}>
                          {manager.fullName} ({manager.role})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="pt-4">
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={isSubmitting}>Cancelar</Button>
              </DialogClose>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditMode ? 'Guardar Cambios' : 'Crear Sucursal'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
