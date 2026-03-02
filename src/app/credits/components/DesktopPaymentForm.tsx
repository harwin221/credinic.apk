
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
import { Loader2, TrendingUp, Wallet, Calendar } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';
import { useUser } from '@/hooks/use-user';
import { DateInput } from '@/components/ui/date-input';
import { nowInNicaragua } from '@/lib/date-utils';

export type PaymentFormValues = z.infer<ReturnType<typeof createPaymentFormSchema>>;

interface DesktopPaymentFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: PaymentFormValues) => void;
  creditBalance: number;
  dueTodayAmount: number;
  overdueAmount: number;
  lateFee: number;
}

const formatCurrency = (amount: number) => `C$${amount.toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const createPaymentFormSchema = (maxAmount: number) => z.object({
  amount: z.coerce
    .number()
    .positive({ message: 'El monto debe ser positivo.' })
    .max(maxAmount, { message: `El pago no puede exceder el saldo de C$${maxAmount.toFixed(2)}` }),
  paymentDate: z.string().min(1, { message: "Debe seleccionar una fecha válida." }),
  paymentType: z.enum(['NORMAL', 'DISPENSA', 'AJUSTE']).default('NORMAL'),
  notes: z.string().optional(),
});


const DetailRow = ({ label, value, className = '' }: { label: string, value: string, className?: string }) => (
  <div className={`flex justify-between items-center py-1.5 text-sm ${className}`}>
    <p className="text-muted-foreground">{label}</p>
    <p className="font-semibold">{value}</p>
  </div>
);


export function DesktopPaymentForm({ isOpen, onClose, onSubmit, creditBalance, dueTodayAmount, overdueAmount, lateFee }: DesktopPaymentFormProps) {
  const { user } = useUser();
  const paymentFormSchema = createPaymentFormSchema(creditBalance > 0.01 ? creditBalance : 1_000_000);

  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: {
      amount: undefined,
      paymentDate: nowInNicaragua(),
      paymentType: 'NORMAL',
      notes: ''
    },
  });

  React.useEffect(() => {
    if (isOpen) {
      form.reset({
        amount: undefined,
        paymentDate: nowInNicaragua(),
        paymentType: 'NORMAL',
        notes: ''
      });
    }
  }, [isOpen, form]);

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const totalToGetUpToDate = dueTodayAmount + overdueAmount;
  const isAdmin = user?.role === 'ADMINISTRADOR';

  const handleSubmit = async (data: PaymentFormValues) => {
    setIsSubmitting(true);
    await onSubmit(data);
    setIsSubmitting(false);
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar Abono</DialogTitle>
          <DialogDescription>
            Introduce el monto del pago o usa una de las opciones sugeridas.
            {isAdmin && " Puedes cambiar la fecha para registrar pagos históricos."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-2">
          <DetailRow label="Monto en Mora" value={formatCurrency(overdueAmount)} className="text-destructive" />
          <DetailRow label="Cuota del Día" value={formatCurrency(dueTodayAmount)} />
          <Separator className="my-2" />
          <DetailRow label="Total para Ponerse al Día" value={formatCurrency(totalToGetUpToDate)} className="font-bold text-primary" />
          <DetailRow label="Saldo Total para Cancelar" value={formatCurrency(creditBalance)} className="font-bold" />
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 pt-2">
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Monto a Pagar</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="0.00"
                      {...field}
                      className="h-12 text-center text-lg"
                      autoFocus
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {isAdmin && (
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="paymentDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fecha del Pago</FormLabel>
                      <FormControl>
                        <DateInput
                          value={field.value}
                          onChange={(isoValue) => field.onChange(isoValue)}
                          placeholder="Seleccionar fecha"
                          required
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="paymentType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de Pago</FormLabel>
                      <FormControl>
                        <select
                          {...field}
                          className="w-full h-10 px-3 text-sm bg-muted rounded-md border-none focus:ring-2 focus:ring-accent"
                        >
                          <option value="NORMAL">Pago Normal</option>
                          <option value="DISPENSA">Dispensa</option>
                          <option value="AJUSTE">Ajuste</option>
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {isAdmin && (
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notas / Observaciones</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Motivo de la dispensa o ajuste..."
                        className="bg-muted"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}


            <div className="grid grid-cols-2 gap-2">
              <Button type="button" variant="outline" onClick={() => form.setValue('amount', totalToGetUpToDate)}>
                <TrendingUp className="mr-2 h-4 w-4" /> Ponerse al día
              </Button>
              <Button type="button" variant="secondary" onClick={() => form.setValue('amount', creditBalance)}>
                <Wallet className="mr-2 h-4 w-4" /> Cancelar Crédito
              </Button>
            </div>

            <DialogFooter className="pt-4 border-t">
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={isSubmitting}>
                  Cancelar
                </Button>
              </DialogClose>
              <Button type="submit" disabled={isSubmitting} className="bg-primary hover:bg-primary/90">
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Registrar Pago
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
