
'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { generatePaymentSchedule } from '@/lib/utils';
import type { CalculatedPayment, Payment, PaymentFrequency, UserRole } from '@/lib/types';
import { PageHeader } from '@/components/PageHeader';
import { useUser } from '@/hooks/use-user';
import { AccessDenied } from '@/components/AccessDenied';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { todayInNicaragua } from '@/lib/date-utils';
import { CalculatorIcon, DollarSign, Percent, Calendar, Hash } from 'lucide-react';

const ALLOWED_ROLES: UserRole[] = ['ADMINISTRADOR', 'GERENTE', 'GESTOR', 'OPERATIVO'];

const calculatorSchema = z.object({
  amount: z.coerce.number().positive({ message: "El monto debe ser un número positivo." }),
  interestRate: z.coerce.number().min(0, { message: "La tasa de interés no puede ser negativa." }),
  termMonths: z.coerce.number().positive({ message: "El plazo debe ser un número positivo de meses." }),
  paymentFrequency: z.enum(['Diario', 'Semanal', 'Catorcenal', 'Quincenal']),
});

type CalculatorFormValues = z.infer<typeof calculatorSchema>;

const formatCurrency = (amount: number) => `C$${amount.toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const formatDate = (date: string) => {
    const dateToFormat = /^\d{4}-\d{2}-\d{2}$/.test(date) ? date + 'T12:00:00' : date;
    return format(parseISO(dateToFormat), 'dd/MM/yyyy', { locale: es });
};

export default function CalculatorPage() {
  const { user } = useUser();
  const [paymentPlan, setPaymentPlan] = React.useState<CalculatedPayment | null>(null);

  const form = useForm<CalculatorFormValues>({
    resolver: zodResolver(calculatorSchema),
    defaultValues: {
      amount: '' as unknown as number, // Inicializar con cadena vacía para evitar error de no controlado
      interestRate: '' as unknown as number, // Inicializar con cadena vacía
      termMonths: '' as unknown as number, // Inicializar con cadena vacía
      paymentFrequency: 'Quincenal',
    },
  });

  const onSubmit = (data: CalculatorFormValues) => {
    const result = generatePaymentSchedule({
      loanAmount: data.amount,
      monthlyInterestRate: data.interestRate,
      termMonths: data.termMonths,
      paymentFrequency: data.paymentFrequency,
      startDate: todayInNicaragua(), // Usar fecha actual de Nicaragua
      holidays: [], // No se necesitan feriados para una simulación simple
    });
    setPaymentPlan(result);
  };
  
  if (!user || !ALLOWED_ROLES.includes(user.role)) {
    return <AccessDenied />;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Simular Crédito</CardTitle>
              <CardDescription>Ingresa los datos para calcular el plan de pagos.</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField control={form.control} name="amount" render={({ field }) => (
                    <FormItem><FormLabel>Monto</FormLabel><FormControl><div className="relative"><DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input type="number" placeholder="10000" {...field} className="pl-9" /></div></FormControl><FormMessage /></FormItem>
                  )} />
                   <FormField control={form.control} name="interestRate" render={({ field }) => (
                    <FormItem><FormLabel>Tasa de Interés Mensual</FormLabel><FormControl><div className="relative"><Percent className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input type="number" placeholder="5" {...field} className="pl-9" /></div></FormControl><FormMessage /></FormItem>
                  )} />
                   <FormField control={form.control} name="termMonths" render={({ field }) => (
                    <FormItem><FormLabel>Plazo (Meses)</FormLabel><FormControl><div className="relative"><Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input type="number" step="0.5" placeholder="12" {...field} className="pl-9" /></div></FormControl><FormMessage /></FormItem>
                  )} />
                   <FormField control={form.control} name="paymentFrequency" render={({ field }) => (
                     <FormItem><FormLabel>Frecuencia de Pago</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent><SelectItem value="Diario">Diario</SelectItem><SelectItem value="Semanal">Semanal</SelectItem><SelectItem value="Catorcenal">Catorcenal</SelectItem><SelectItem value="Quincenal">Quincenal</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                  )} />
                  <Button type="submit" className="w-full">
                    <CalculatorIcon className="mr-2 h-4 w-4" />
                    Calcular Plan de Pagos
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
        <div className="lg:col-span-2">
            <Card>
                <CardHeader>
                    <CardTitle>Plan de Pagos Proyectado</CardTitle>
                    {paymentPlan && (
                        <CardDescription>
                           Cuota de {formatCurrency(paymentPlan.periodicPayment)}
                        </CardDescription>
                    )}
                </CardHeader>
                <CardContent>
                    {paymentPlan ? (
                        <div className="max-h-[500px] overflow-y-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>#</TableHead>
                                    <TableHead>Capital</TableHead>
                                    <TableHead>Interés</TableHead>
                                    <TableHead>Monto Cuota</TableHead>
                                    <TableHead>Saldo</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {paymentPlan.schedule.map((p) => (
                                    <TableRow key={p.paymentNumber}>
                                        <TableCell>{p.paymentNumber}</TableCell>
                                        <TableCell>{formatCurrency(p.principal)}</TableCell>
                                        <TableCell>{formatCurrency(p.interest)}</TableCell>
                                        <TableCell>{formatCurrency(p.amount)}</TableCell>
                                        <TableCell>{formatCurrency(p.balance)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                        </div>
                    ) : (
                        <div className="text-center text-muted-foreground py-16">
                            <p>Ingresa los datos y haz clic en "Calcular" para ver el resultado.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}
