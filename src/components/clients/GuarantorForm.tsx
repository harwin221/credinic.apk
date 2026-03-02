
'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import type { GuarantorItem } from '@/lib/types';
import { Loader2, User, Fingerprint, Phone, Users, MapPin } from 'lucide-react';
import { formatCedula, formatPhone } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';

const guarantorFormSchema = z.object({
  name: z.string().min(2, { message: 'El nombre debe tener al menos 2 caracteres.' }).transform(v => v.toUpperCase()),
  cedula: z.string().min(16, { message: 'La cédula debe tener el formato 000-000000-0000X.' }),
  phone: z.string().min(9, { message: 'El teléfono debe tener el formato XXXX-XXXX.' }),
  relationship: z.string().min(2, { message: 'El parentesco debe tener al menos 2 caracteres.' }).transform(v => v.toUpperCase()),
  address: z.string().min(5, { message: 'La dirección es obligatoria.'}).transform(v => v.toUpperCase()),
});

export type GuarantorFormValues = z.infer<typeof guarantorFormSchema>;

interface GuarantorFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: GuarantorFormValues) => void;
  initialData?: Partial<GuarantorItem>; 
  mode: 'add' | 'edit';
}

export function GuarantorForm({ isOpen, onClose, onSubmit, initialData, mode }: GuarantorFormProps) {
  const [cedulaValue, setCedulaValue] = React.useState(initialData?.cedula || '');
  const [phoneValue, setPhoneValue] = React.useState(formatPhone(initialData?.phone || ''));

  const form = useForm<GuarantorFormValues>({
    resolver: zodResolver(guarantorFormSchema),
    defaultValues: {
      name: '',
      cedula: '',
      phone: '',
      relationship: '',
      address: '',
    },
  });

  React.useEffect(() => {
    if (isOpen) {
      const defaultVals = {
        name: initialData?.name || '',
        cedula: initialData?.cedula || '',
        phone: initialData?.phone || '',
        relationship: initialData?.relationship || '',
        address: initialData?.address || '',
      };
      form.reset(defaultVals);
      setCedulaValue(initialData?.cedula || '');
      setPhoneValue(formatPhone(initialData?.phone || ''));
    }
  }, [isOpen, initialData, mode, form]);

  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleCedulaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCedula(e.target.value);
    setCedulaValue(formatted);
    form.setValue('cedula', formatted, { shouldValidate: true });
  };
  
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    setPhoneValue(formatted);
    form.setValue('phone', formatted, { shouldValidate: true });
  };

  const handleSubmit = async (data: GuarantorFormValues) => {
    setIsSubmitting(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    onSubmit(data);
    setIsSubmitting(false);
    onClose(); 
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{mode === 'edit' ? 'Actualizar Fiador' : 'Agregar Fiador'}</DialogTitle>
          <DialogDescription>
            {mode === 'edit' ? 'Modifica los detalles del fiador.' : 'Ingresa los detalles del nuevo fiador.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)}>
            <div className="space-y-4 py-2 max-h-[70vh] overflow-y-auto pr-2">
                <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Nombre y Apellido</FormLabel>
                    <FormControl>
                        <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="Ej: María López" {...field} className="pl-8 uppercase" />
                        </div>
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                control={form.control}
                name="cedula"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Cédula</FormLabel>
                    <FormControl>
                        <div className="relative">
                        <Fingerprint className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="000-000000-0000X" {...field} value={cedulaValue} onChange={handleCedulaChange} className="pl-8" maxLength={16} />
                        </div>
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Dirección</FormLabel>
                    <FormControl>
                        <div className="relative">
                        <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Textarea placeholder="Departamento, Municipio, Barrio, Dirección" {...field} className="pl-8 uppercase" />
                        </div>
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
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
                <FormField
                control={form.control}
                name="relationship"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Parentesco</FormLabel>
                    <FormControl>
                        <div className="relative">
                        <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="Ej: Hermano, Madre, Cónyuge" {...field} className="pl-8 uppercase" />
                        </div>
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
            </div>
            <DialogFooter className="pt-4 mt-4 border-t">
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={isSubmitting}>
                  Cancelar
                </Button>
              </DialogClose>
              <Button type="submit" disabled={isSubmitting} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {isSubmitting ? 'Guardando...' : (mode === 'edit' ? 'Actualizar Fiador' : 'Agregar Fiador')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
