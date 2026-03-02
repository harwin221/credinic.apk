
'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Loader2, Calendar, Landmark } from 'lucide-react';
import type { CreditDetail, User } from '@/lib/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useUser } from '@/hooks/use-user';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toZonedTime } from 'date-fns-tz';
import { todayInNicaragua, formatDateForUser, userInputToISO } from '@/lib/date-utils';
import { DateInput } from '@/components/ui/date-input';


const formatCurrency = (amount: number) => `C$${amount.toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const disbursementFormSchema = z.object({
  amount: z.coerce.number().positive({ message: 'El monto debe ser positivo.' }),
  firstPaymentDate: z.string().refine((date) => !!userInputToISO(date), { message: "Formato de fecha inválido."}),
});

export type DisbursementFormValues = z.infer<typeof disbursementFormSchema>;

interface DisbursementFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: DisbursementFormValues) => void;
  credit: CreditDetail | null;
}

export function DisbursementForm({ isOpen, onClose, onSubmit, credit }: DisbursementFormProps) {
  const { user } = useUser();

  const form = useForm<DisbursementFormValues>({
    resolver: zodResolver(disbursementFormSchema),
    defaultValues: {
      amount: 0,
      firstPaymentDate: '',
    },
  });

  React.useEffect(() => {
    if (credit && isOpen) {
      const today = todayInNicaragua();
      form.reset({
        amount: credit.netDisbursementAmount ?? credit.amount,
        firstPaymentDate: credit.firstPaymentDate ? formatDateForUser(credit.firstPaymentDate, 'yyyy-MM-dd') : '',
      });
    }
  }, [credit, isOpen, form, user]);

  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleSubmit = async (data: DisbursementFormValues) => {
    setIsSubmitting(true);
    await onSubmit(data);
    setIsSubmitting(false);
  };
  
  if (!isOpen || !credit) return null;
  
  const originalDate = credit.firstPaymentDate ? format(new Date(credit.firstPaymentDate), 'dd MMMM, yyyy', { locale: es }) : 'No especificada';

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Confirmar y Editar Desembolso</DialogTitle>
          <DialogDescription>
            Verifica y ajusta los detalles finales para <strong>{credit.clientName}</strong>. Esta acción activará el crédito y generará el plan de pagos.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 py-2">
            {credit.outstandingBalance !== undefined && credit.outstandingBalance > 0 && (
                 <div className="text-sm p-3 rounded-md bg-amber-50 border-l-4 border-amber-400 text-amber-800">
                    <p><strong>Cancelación de Saldo (Refundición):</strong> Se deducirá un monto de <strong>{formatCurrency(credit.outstandingBalance)}</strong> del crédito anterior.</p>
                    <p><strong>Monto Original Aprobado:</strong> {formatCurrency(credit.amount)}</p>
                 </div>
            )}
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Monto Final a Entregar (C$)</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg text-muted-foreground">C$</span>
                      <Input 
                        type="number" 
                        placeholder="5000.00" 
                        {...field} 
                        className="pl-9 h-12 text-xl font-bold text-green-700 bg-green-50 border-green-200 focus-visible:ring-green-500" 
                        readOnly 
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="text-sm p-3 rounded-md bg-blue-50 border-l-4 border-blue-400 text-blue-800">
              <p><strong>Fecha de Desembolso:</strong> Se registrará automáticamente al confirmar (hoy: {formatDateForUser(todayInNicaragua())})</p>
            </div>

            <FormField
              control={form.control}
              name="firstPaymentDate"
              render={({ field }) => (
                <FormItem>
                  <div className="flex justify-between items-center">
                    <FormLabel>Fecha de Primera Cuota (Final)</FormLabel>
                  </div>
                   <FormControl>
                    <DateInput
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Seleccionar fecha"
                      required
                    />
                  </FormControl>
                  <FormDescription className="text-xs">Fecha original propuesta: {originalDate}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="pt-4">
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={isSubmitting}>
                  Cancelar
                </Button>
              </DialogClose>
              <Button type="submit" disabled={isSubmitting} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Landmark className="mr-2 h-4 w-4" />}
                {isSubmitting ? 'Procesando...' : 'Confirmar Desembolso'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
