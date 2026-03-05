
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { GuaranteeItem } from '@/lib/types';
import { Loader2 } from 'lucide-react';

const guaranteeFormSchema = z.object({
  article: z.string().min(2, { message: 'El artículo debe tener al menos 2 caracteres.' }),
  brand: z.string().optional().nullable(),
  color: z.string().optional().nullable(),
  model: z.string().optional().nullable(),
  series: z.string().optional().nullable(),
  estimatedValue: z.coerce.number().positive({ message: 'El valor estimado debe ser positivo.' }),
});

export type GuaranteeFormValues = z.infer<typeof guaranteeFormSchema>;

interface GuaranteeFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: GuaranteeFormValues) => void;
  initialData?: Partial<GuaranteeItem>;
  mode: 'add' | 'edit';
}

export function GuaranteeForm({ isOpen, onClose, onSubmit, initialData, mode }: GuaranteeFormProps) {
  const form = useForm<GuaranteeFormValues>({
    resolver: zodResolver(guaranteeFormSchema),
    defaultValues: {
      article: '',
      brand: '',
      color: '',
      model: '',
      series: '',
      estimatedValue: undefined,
    },
  });

  React.useEffect(() => {
    if (isOpen) {
      // Restablecer el formulario con datos iniciales si el modo es 'edit', o con valores predeterminados para 'add'
      const defaultVals = {
        article: initialData?.article || '',
        brand: initialData?.brand || '',
        color: initialData?.color || '',
        model: initialData?.model || '',
        series: initialData?.series || '',
        estimatedValue: initialData?.estimatedValue !== undefined ? initialData.estimatedValue : undefined,
      };
      form.reset(defaultVals);
    }
  }, [isOpen, initialData, form]);


  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleSubmit = async (data: GuaranteeFormValues) => {
    setIsSubmitting(true);
    await new Promise(resolve => setTimeout(resolve, 500)); // Simular llamada a la API
    onSubmit(data);
    setIsSubmitting(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{mode === 'edit' ? 'Actualizar Garantía' : 'Agregar Garantía'}</DialogTitle>
          <DialogDescription>
            {mode === 'edit' ? 'Modifica los detalles de la garantía.' : 'Ingresa los detalles de la nueva garantía.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)}>
            <div className="space-y-4 py-2 max-h-[70vh] overflow-y-auto pr-2">
              <FormField
                control={form.control}
                name="article"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Artículo</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej: Refrigerador, Televisor" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="brand"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Marca <span className="text-xs text-muted-foreground">(Opcional)</span></FormLabel>
                      <FormControl>
                        <Input placeholder="Ej: Sony, LG" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="color"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Color <span className="text-xs text-muted-foreground">(Opcional)</span></FormLabel>
                      <FormControl>
                        <Input placeholder="Ej: Gris, Blanco" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="model"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Modelo <span className="text-xs text-muted-foreground">(Opcional)</span></FormLabel>
                      <FormControl>
                        <Input placeholder="Ej: RX-100, TU7000" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="series"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Serie <span className="text-xs text-muted-foreground">(Opcional)</span></FormLabel>
                      <FormControl>
                        <Input placeholder="Ej: SN123456789" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="estimatedValue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor estimado (C$)</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">C$</span>
                        <Input type="number" placeholder="5000" {...field} className="pl-9" />
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
                {isSubmitting ? 'Guardando...' : (mode === 'edit' ? 'Actualizar garantía' : 'Agregar garantía')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
