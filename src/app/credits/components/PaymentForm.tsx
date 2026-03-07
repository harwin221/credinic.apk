
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
import { Loader2, Calendar, FileText, Wifi, WifiOff } from 'lucide-react';
import { useUser } from '@/hooks/use-user';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { useRouter } from 'next/navigation';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { toZonedTime } from 'date-fns-tz';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { DateInput } from '@/components/ui/date-input';
import { nowInNicaragua, formatDateForUser } from '@/lib/date-utils';


interface PaymentFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: PaymentFormValues) => void;
  creditBalance: number;
  dueTodayAmount: number;
  paidToday: number;
  overdueAmount: number;
  lateFee: number;
  lateDays: number;
  clientName: string;
  clientId: string; // Added to generate report link
}

const formatCurrency = (amount?: number) => {
  if (typeof amount !== 'number' || isNaN(amount)) return 'C$ 0.00';
  return `C$ ${amount.toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const DetailRow = ({ label, value, className = '', valueClassName = 'text-green-600' }: { label: string, value: string, className?: string, valueClassName?: string }) => (
  <div className={`flex justify-between items-center py-1.5 text-sm ${className}`}>
    <p className="text-muted-foreground">{label}</p>
    <p className={`font-semibold ${valueClassName}`}>{value}</p>
  </div>
);

const createPaymentFormSchema = (maxAmount: number) => z.object({
  amount: z.coerce
    .number()
    .positive({ message: 'El monto debe ser positivo.' })
    .max(maxAmount, { message: `El pago no puede exceder el saldo de C$${maxAmount.toFixed(2)}` }),
  paymentDate: z.string().min(1, { message: "Debe seleccionar una fecha válida." }),
  paymentType: z.enum(['NORMAL', 'DISPENSA', 'AJUSTE']).default('NORMAL'),
  notes: z.string().optional(),
});
export type PaymentFormValues = z.infer<ReturnType<typeof createPaymentFormSchema>>;


export function PaymentForm({
  isOpen, onClose, onSubmit, creditBalance, dueTodayAmount,
  paidToday, overdueAmount, lateFee, lateDays, clientName, clientId
}: PaymentFormProps) {

  const router = useRouter();
  const { user } = useUser();
  const { isOnline } = useOnlineStatus();

  // Adjust amounts based on what's already been paid today
  const remainingDue = Math.max(0, (dueTodayAmount + overdueAmount + lateFee) - paidToday);
  const remainingDueToday = Math.max(0, dueTodayAmount - paidToday);
  const remainingOverdue = Math.max(0, overdueAmount - Math.max(0, paidToday - dueTodayAmount));

  const totalAPagar = remainingDue;

  // Create schema dynamically based on the current credit balance
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
  const isAdmin = user?.role === 'ADMINISTRADOR';

  const handleSubmit = async (data: PaymentFormValues) => {
    setIsSubmitting(true);
    // Normalize the date. If user changed it via DateInput, we get an ISO string or 'yyyy-mm-dd'.
    const finalDate = data.paymentDate.length === 10
      ? `${data.paymentDate}T12:00:00.000Z`
      : data.paymentDate;

    await onSubmit({ ...data, paymentDate: finalDate });
    setIsSubmitting(false);
  };

  const handleViewStatement = () => {
    const url = `/reports/account-statement?clientId=${clientId}`;
    window.open(url, '_blank');
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-sm max-h-[92vh] overflow-y-auto p-4 rounded-2xl">
        <DialogHeader className="text-center mb-1">
          <DialogTitle className="text-base font-bold">{clientName}</DialogTitle>
          <DialogDescription className="flex items-center justify-center gap-1.5 text-xs">
            {isOnline ? (
              <><Wifi className="h-3 w-3 text-green-500" /> Conectado</>
            ) : (
              <><WifiOff className="h-3 w-3 text-red-500" /> Modo Offline</>
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-0.5">
          <DetailRow label="Cuota del dia:" value={formatCurrency(remainingDueToday)} valueClassName="text-foreground" className="py-0.5 text-xs" />
          <DetailRow label="Monto Atrasado:" value={formatCurrency(remainingOverdue)} valueClassName="text-destructive" className="py-0.5 text-xs" />
          <DetailRow label="Cantidad Dias Mora:" value={(lateDays || 0).toString()} valueClassName="text-destructive" className="py-0.5 text-xs" />
          <Separator className="my-1.5" />
          <DetailRow label="Total a Pagar:" value={formatCurrency(totalAPagar)} className="font-bold py-0.5 text-xs" valueClassName="text-base text-primary" />
          <DetailRow label="Monto para Cancelar:" value={formatCurrency(creditBalance)} className="font-bold py-0.5 text-xs" valueClassName="text-base text-primary" />
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-3 pt-2">
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem className="space-y-1">
                  <FormLabel className="text-left font-semibold text-xs">Ingrese el Monto Pagado:</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="Ej: 300.50"
                      {...field}
                      className="h-10 text-center text-base bg-muted rounded-xl"
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <FormMessage className="text-[10px]" />
                </FormItem>
              )}
            />
            {isAdmin && (
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="paymentDate"
                  render={({ field }) => (
                    <FormItem className="space-y-1">
                      <FormLabel className="text-left font-semibold text-[11px]">Fecha del Pago</FormLabel>
                      <FormControl>
                        <DateInput
                          value={field.value}
                          onChange={(isoValue) => field.onChange(isoValue)}
                          placeholder="Fecha"
                          className="h-9 text-center text-xs bg-muted rounded-xl"
                          required
                        />
                      </FormControl>
                      <FormMessage className="text-[10px]" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="paymentType"
                  render={({ field }) => (
                    <FormItem className="space-y-1">
                      <FormLabel className="text-left font-semibold text-[11px]">Tipo Transacción</FormLabel>
                      <FormControl>
                        <select
                          {...field}
                          className="w-full h-9 px-3 text-xs bg-muted rounded-xl border-none focus:ring-1 focus:ring-accent"
                        >
                          <option value="NORMAL">Pago Normal</option>
                          <option value="DISPENSA">Dispensa</option>
                          <option value="AJUSTE">Ajuste</option>
                        </select>
                      </FormControl>
                      <FormMessage className="text-[10px]" />
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
                    <FormLabel className="text-left font-semibold text-xs">Observaciones (Opcional)</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        className="h-10 bg-muted rounded-xl text-sm"
                        placeholder="Motivo de la dispensa o ajuste..."
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <div className="flex gap-3 pt-1">
              <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting} className="w-full h-9 text-xs rounded-full">
                CANCELAR
              </Button>
              <Button type="submit" disabled={isSubmitting} className="w-full h-9 text-xs bg-accent hover:bg-accent/90 text-accent-foreground rounded-full">
                {isSubmitting && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
                PAGAR CUOTA
              </Button>
            </div>
          </form>
        </Form>
        <Separator className="my-4" />
        <div className="text-center space-y-2">
          <Button variant="secondary" className="w-full" onClick={handleViewStatement}>
            <FileText className="mr-2 h-4 w-4" /> Ver Estado de Cuenta
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
