'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { addHoliday } from '@/services/holiday-service';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { useUser } from '@/hooks/use-user';
import { DateInput } from '@/components/ui/date-input';

const holidayFormSchema = z.object({
  name: z.string().min(3, { message: 'El nombre debe tener al menos 3 caracteres.' }),
  date: z.string().refine((date) => !isNaN(new Date(date).getTime()), { message: "Formato de fecha inválido."}),
});

type HolidayFormValues = z.infer<typeof holidayFormSchema>;

interface HolidayFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function HolidayForm({ isOpen, onClose, onSuccess }: HolidayFormProps) {
  const { toast } = useToast();
  const { user } = useUser();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<HolidayFormValues>({
    resolver: zodResolver(holidayFormSchema),
    defaultValues: {
      name: '',
      date: format(new Date(), 'yyyy-MM-dd')
    }
  });

  const handleSubmit = async (data: HolidayFormValues) => {
    setIsSubmitting(true);
    if (!user) {
        toast({ title: "Error", description: "No se pudo identificar al usuario.", variant: "destructive" });
        setIsSubmitting(false);
        return;
    }
    try {
        const result = await addHoliday(data, user);
        if(result.success){
          toast({ title: "Feriado Agregado", description: `El día ${data.name} ha sido agregado como feriado.` });
          onSuccess();
          onClose();
        } else {
          throw new Error(result.error || "Ocurrió un error inesperado.");
        }
    } catch (error) {
        toast({
            title: "Error al guardar",
            description: error instanceof Error ? error.message : "Ocurrió un error inesperado.",
            variant: "destructive",
        });
    } finally {
        setIsSubmitting(false);
    }
  };
  
  React.useEffect(() => {
    if (isOpen) {
      form.reset({
        name: '',
        date: format(new Date(), 'yyyy-MM-dd')
      })
    }
  }, [isOpen, form]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Agregar Día Feriado</DialogTitle>
          <DialogDescription>
            Selecciona una fecha y dale un nombre al día festivo.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 py-2">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre del Feriado</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: Día de la Independencia" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fecha</FormLabel>
                  <FormControl>
                    <DateInput
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Seleccionar fecha"
                      required
                    />
                  </FormControl>
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
                Guardar Feriado
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
