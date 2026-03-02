
'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn, generatePaymentSchedule, cleanDataForDatabase, calculateCreditStatusDetails } from '@/lib/utils';
import type { Client, CreditApplication, PaymentFrequency, CreditDetail, GuaranteeItem, GuarantorItem, AppUser, UserRole } from '@/lib/types';
import { useRouter, useSearchParams } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Percent, CalendarDays, Save, X, Check, ChevronsUpDown, BarChart, Loader2, Tag, LinkIcon, TrendingUp, Users, PlusCircle, Trash2, Edit, Briefcase, Store, Hotel, StickyNote, AlertTriangle } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { getClient } from '@/services/client-service-server';
import { getUsers as getUsersClient } from '@/services/user-service-client';
import { getClientCredits } from '@/services/credit-service-server';
import { addCredit as addCreditServerAction, updateCredit as updateCreditServerAction } from '@/app/credits/actions';
import { getHolidays } from '@/services/holiday-service';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GuaranteeForm, GuaranteeFormValues } from './GuaranteeForm';
import { GuarantorForm, GuarantorFormValues } from '@/components/clients/GuarantorForm';
import { useUser } from '@/hooks/use-user';
import { Interactions } from '@/components/clients/Interactions';
import { Tags } from '@/components/clients/Tags';
import { format } from 'date-fns';
import { getClients as getClientsServer } from '@/services/client-service-server';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { getUser, getUserByName } from '@/services/user-service-server';
import { DateInput } from '@/components/ui/date-input';
import { userInputToISO, formatDateForUser } from '@/lib/date-utils';


const createCreditFormSchema = (isGestor: boolean) => z.object({
  clientId: z.string().min(1, { message: 'La selección del cliente es obligatoria.' }),
  productType: z.string().optional(),
  subProduct: z.string().optional(),
  productDestination: z.string().min(1, "Debe especificar un destino."),
  amount: z.coerce.number().positive({ message: 'El monto debe ser positivo.' }),
  interestRate: z.coerce.number().min(5, { message: 'La tasa de interés debe ser de al menos 5%.' }).max(18, { message: 'La tasa de interés no puede exceder el 18%.' }),
  termMonths: z.coerce.number().positive({ message: 'El plazo debe ser un número positivo de meses.' }),
  paymentFrequency: z.enum(['Diario', 'Semanal', 'Catorcenal', 'Quincenal']),
  firstPaymentDate: z.string().min(1, { message: "Debe seleccionar una fecha de inicio válida." }),
  collectionsManager: isGestor ? z.string().optional() : z.string().min(1, 'Debe seleccionar un gestor.'),
});


type CreditFormValues = z.infer<ReturnType<typeof createCreditFormSchema>>;

const formatCurrency = (amount: number) => `C$${amount.toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

interface CreditFormProps {
  initialData?: CreditDetail | null;
}

export function CreditForm({ initialData }: CreditFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { user } = useUser();
  const isEditMode = !!initialData;
  const preselectedClientId = searchParams?.get('clientId');

  const [clients, setClients] = React.useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = React.useState<Client | null>(null);
  const [staff, setStaff] = React.useState<AppUser[]>([]);
  const [holidays, setHolidays] = React.useState<string[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  const [guarantees, setGuarantees] = React.useState<GuaranteeItem[]>(initialData?.guarantees || []);
  const [guarantors, setGuarantors] = React.useState<GuarantorItem[]>(initialData?.guarantors || []);
  const [isGuaranteeModalOpen, setIsGuaranteeModalOpen] = React.useState(false);
  const [isGuarantorModalOpen, setIsGuarantorModalOpen] = React.useState(false);

  const [outstandingBalance, setOutstandingBalance] = React.useState<number | null>(null);

  const isGestor = user?.role === 'GESTOR';

  const creditFormSchema = createCreditFormSchema(isGestor);

  const form = useForm<CreditFormValues>({
    resolver: zodResolver(creditFormSchema),
    defaultValues: {
      clientId: initialData?.clientId ?? '',
      productType: initialData?.productType ?? 'PERSONAL',
      subProduct: initialData?.subProduct ?? 'CONSUMO',
      productDestination: initialData?.productDestination ?? '',
      amount: initialData?.amount ?? ('' as unknown as number),
      interestRate: initialData?.interestRate ?? ('' as unknown as number),
      termMonths: initialData?.termMonths ?? ('' as unknown as number),
      paymentFrequency: initialData?.paymentFrequency ?? 'Quincenal',
      firstPaymentDate: initialData?.firstPaymentDate || '',
      collectionsManager: initialData?.collectionsManager ?? undefined,
    },
  });

  const [projectedInstallment, setProjectedInstallment] = React.useState<number | null>(null);
  const { setValue } = form;

  // Auto-assign user values only once when user is loaded
  React.useEffect(() => {
    if (isGestor && user?.id && !form.getValues('collectionsManager')) {
      setValue('collectionsManager', user.id);
    }
  }, [isGestor, user?.id]);



  // Preselect client only once
  React.useEffect(() => {
    const preselectClient = async (clientId: string) => {
      const client = await getClient(clientId);
      if (client) {
        setSelectedClient(client);
        setValue('clientId', clientId, { shouldValidate: true });
        // Call handleClientSelection directly without dependency
        const clientCredits = await getClientCredits(clientId);

        // Check for outstanding balance
        const activeCredit = clientCredits.find(c => c.status === 'Active');
        if (activeCredit) {
          const { remainingBalance } = calculateCreditStatusDetails(activeCredit);
          setOutstandingBalance(remainingBalance);
        } else {
          setOutstandingBalance(null);
        }

        // Load guarantees from the most recent relevant credit
        if (!isEditMode) {
          const mostRecentCredit = clientCredits.find(c => c.status === 'Active') || clientCredits.find(c => c.status === 'Paid');
          if (mostRecentCredit && mostRecentCredit.guarantees && mostRecentCredit.guarantees.length > 0) {
            setGuarantees(mostRecentCredit.guarantees);
            toast({
              title: "Garantías Cargadas",
              description: `Se cargaron ${mostRecentCredit.guarantees.length} garantías del crédito anterior.`,
              variant: "info",
            });
          }
        }
      }
    };

    if (preselectedClientId && !isEditMode && !selectedClient) {
      preselectClient(preselectedClientId);
    }
    if (isEditMode && initialData && !selectedClient) {
      preselectClient(initialData.clientId);
    }
  }, [preselectedClientId, isEditMode, initialData?.clientId, selectedClient]);

  // Set staff values only once when staff is loaded in edit mode
  React.useEffect(() => {
    if (isEditMode && initialData && staff.length > 0) {
      if (initialData.collectionsManager && !form.getValues('collectionsManager')) {
        const gestorUser = staff.find(g => g.fullName === initialData.collectionsManager);
        if (gestorUser?.id) {
          form.setValue('collectionsManager', gestorUser.id);
        }
      }
    }
  }, [isEditMode, initialData?.collectionsManager, staff.length]);



  React.useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      setIsLoading(true);

      const [fetchedHolidays] = await Promise.all([getHolidays()]);
      setHolidays(fetchedHolidays.map(h => h.date));

      if (!isGestor) {
        const [clientsData, fetchedStaff] = await Promise.all([
          getClientsServer({ user }),
          getUsersClient()
        ]);
        if (clientsData && 'clients' in clientsData) setClients(clientsData.clients);
        if (fetchedStaff) setStaff(fetchedStaff);
      } else {
        const clientsData = await getClientsServer({ user });
        if (clientsData && 'allGestorClients' in clientsData) {
          setClients(clientsData.allGestorClients || []);
        }
      }

      setIsLoading(false);
    };
    fetchData();
  }, [user, isGestor]);

  const calculateInstallment = React.useCallback(() => {
    const values = form.getValues();
    const { amount, interestRate, termMonths, paymentFrequency, firstPaymentDate } = values;

    if (amount && interestRate && termMonths && paymentFrequency && firstPaymentDate) {
      try {
        const dateString = formatDateForUser(firstPaymentDate, 'yyyy-MM-dd');

        if (!dateString || dateString === 'N/A' || dateString === 'Fecha Inválida') {
          setProjectedInstallment(null);
          return;
        }

        const result = generatePaymentSchedule({
          loanAmount: amount,
          monthlyInterestRate: interestRate,
          termMonths: termMonths,
          paymentFrequency: paymentFrequency as PaymentFrequency,
          startDate: dateString,
          holidays: holidays
        });

        setProjectedInstallment(result ? result.periodicPayment : null);
      } catch (error) {
        console.error('Error calculating projected installment:', error);
        setProjectedInstallment(null);
      }
    } else {
      setProjectedInstallment(null);
    }
  }, [form, holidays]);

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [comboboxOpen, setComboboxOpen] = React.useState(false);
  const [searchValue, setSearchValue] = React.useState('');

  const filteredClients = React.useMemo(() => {
    if (!searchValue) return [];
    return clients.filter(client =>
      client.name.toLowerCase().includes(searchValue.toLowerCase()) ||
      client.clientNumber?.toLowerCase().includes(searchValue.toLowerCase())
    );
  }, [searchValue, clients]);

  const onValidationErrors = (errors: any) => {
    if (Object.keys(errors).length > 0) {
      toast({
        title: "Campos Requeridos Faltantes",
        description: "Por favor, revisa el formulario y completa todos los campos obligatorios.",
        variant: "destructive",
      });
    }
  };

  async function onSubmit(data: CreditFormValues) {
    if (!user) {
      toast({ title: "Error de usuario", description: "No se pudo identificar al usuario. Inicie sesión de nuevo.", variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);

    const clientName = clients.find(c => c.id === data.clientId)?.name;

    const finalData = { ...data };
    if (isGestor) {
      finalData.collectionsManager = user.id;
    }

    const payload = {
      ...finalData,
      guarantees,
      guarantors,
      clientName,
    };

    try {
      let savedCreditId: string | undefined;
      let result;
      if (isEditMode && initialData) {
        result = await updateCreditServerAction(initialData.id, payload, user);
        savedCreditId = initialData.id;
      } else {
        result = await addCreditServerAction(payload, user);
        savedCreditId = result.creditId;
      }

      if (result.success && savedCreditId) {
        toast({
          title: isEditMode ? "Solicitud de Crédito Actualizada" : "Solicitud de Crédito Enviada",
          description: `La solicitud para ${clientName} ha sido procesada.`,
        });

        if (isEditMode) {
          router.push('/credits');
        } else {
          router.push(isGestor ? '/dashboard' : '/credits');
        }

      } else {
        throw new Error(result.error || "Ocurrió un error desconocido.");
      }

    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Ocurrió un error al guardar la solicitud de crédito.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  const handleSaveGuarantee = (data: GuaranteeFormValues) => {
    const newGuarantee = { ...data, id: `gar_${Date.now()}` };
    setGuarantees(prev => [...prev, newGuarantee]);
    setIsGuaranteeModalOpen(false);
  }
  const handleRemoveGuarantee = (id: string) => setGuarantees(prev => prev.filter(g => g.id !== id));

  const handleSaveGuarantor = (data: GuarantorFormValues) => {
    const newGuarantor = { ...data, id: `gua_${Date.now()}` };
    setGuarantors(prev => [...prev, newGuarantor]);
    setIsGuarantorModalOpen(false);
  }
  const handleRemoveGuarantor = (id: string) => setGuarantors(prev => prev.filter(g => g.id !== id));

  const title = isEditMode ? 'Editar Solicitud de Crédito' : 'Nueva Solicitud de Crédito';
  const description = isEditMode
    ? `Modificando la solicitud para ${initialData?.clientName}.`
    : 'Completa los detalles para crear una nueva solicitud de crédito.';

  const gestores = staff.filter(g => g.role.toUpperCase() === 'GESTOR');
  const totalGuaranteesValue = guarantees.reduce((sum, g) => sum + Number(g.estimatedValue), 0);


  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit, onValidationErrors)}>
          <Card className="shadow-md w-full max-w-5xl mx-auto">
            <CardHeader>
              <CardTitle>{title}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </CardHeader>
            <Tabs defaultValue="details">
              <TabsList className="grid w-full grid-cols-3 mb-4 px-6">
                <TabsTrigger value="details">Detalles del Crédito</TabsTrigger>
                <TabsTrigger value="guarantors">Fiadores</TabsTrigger>
                <TabsTrigger value="guarantees">Garantías</TabsTrigger>
              </TabsList>
              <TabsContent value="details">
                <CardContent className="space-y-6">
                  <FormField
                    control={form.control}
                    name="clientId"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Cliente</FormLabel>
                        {isLoading ? <Skeleton className="h-10 w-full" /> : (
                          <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  role="combobox"
                                  aria-expanded={comboboxOpen}
                                  disabled={isEditMode || !!preselectedClientId}
                                  className={cn(
                                    'w-full justify-between',
                                    !field.value && 'text-muted-foreground',
                                    (isEditMode || !!preselectedClientId) && 'bg-muted/50'
                                  )}
                                >
                                  {selectedClient
                                    ? `${selectedClient.name} (${selectedClient.clientNumber})`
                                    : 'Buscar y seleccionar un cliente...'}
                                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            {!(isEditMode || !!preselectedClientId) && (
                              <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                <div className="p-2 border-b">
                                  <Input
                                    placeholder="Buscar por nombre o ID..."
                                    value={searchValue}
                                    onChange={(e) => setSearchValue(e.target.value)}
                                    autoFocus
                                    className="w-full"
                                  />
                                </div>
                                <div className="max-h-[200px] overflow-y-auto">
                                  {filteredClients.length > 0 ? (
                                    filteredClients.map((client) => (
                                      <div
                                        key={client.id}
                                        onClick={async () => {
                                          setValue('clientId', client.id);
                                          setSelectedClient(client);
                                          setComboboxOpen(false);

                                          // Auto-select product type based on client employment type
                                          if (client.employmentType === 'asalariado') {
                                            setValue('productType', 'PERSONAL');
                                            setValue('subProduct', 'CONSUMO');
                                          } else if (client.employmentType === 'comerciante') {
                                            setValue('productType', 'COMERCIAL');
                                            setValue('subProduct', 'COMERCIO');
                                          }

                                          // Handle client selection inline
                                          try {
                                            const clientCredits = await getClientCredits(client.id);

                                            // Check for outstanding balance
                                            const activeCredit = clientCredits.find(c => c.status === 'Active');
                                            if (activeCredit) {
                                              const { remainingBalance } = calculateCreditStatusDetails(activeCredit);
                                              setOutstandingBalance(remainingBalance);
                                            } else {
                                              setOutstandingBalance(null);
                                            }

                                            // Load guarantees from the most recent relevant credit
                                            if (!isEditMode) {
                                              const mostRecentCredit = clientCredits.find(c => c.status === 'Active') || clientCredits.find(c => c.status === 'Paid');
                                              if (mostRecentCredit && mostRecentCredit.guarantees && mostRecentCredit.guarantees.length > 0) {
                                                setGuarantees(mostRecentCredit.guarantees);
                                                toast({
                                                  title: "Garantías Cargadas",
                                                  description: `Se cargaron ${mostRecentCredit.guarantees.length} garantías del crédito anterior.`,
                                                  variant: "info",
                                                });
                                              }
                                            }
                                          } catch (error) {
                                            console.error('Error loading client data:', error);
                                          }
                                        }}
                                        className="relative flex cursor-pointer select-none items-center rounded-sm py-2 px-3 text-sm outline-none hover:bg-accent data-[selected=true]:bg-accent"
                                      >
                                        <Check className={cn('mr-2 h-4 w-4', field.value === client.id ? 'opacity-100' : 'opacity-0')} />
                                        <span>{client.name} ({client.clientNumber})</span>
                                      </div>
                                    ))
                                  ) : (
                                    <p className="p-4 text-center text-sm text-muted-foreground">
                                      {searchValue ? 'No se encontró ningún cliente.' : 'Escriba para buscar...'}
                                    </p>
                                  )}
                                </div>
                              </PopoverContent>
                            )}
                          </Popover>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {outstandingBalance && outstandingBalance > 0 && (
                    <div className="p-3 rounded-md bg-amber-100 border border-amber-300 text-sm text-amber-900 flex items-center gap-3">
                      <AlertTriangle className="h-5 w-5" />
                      <div>
                        <p><strong>Este cliente tiene un crédito activo.</strong></p>
                        <p>Saldo pendiente: <span className="font-bold">{formatCurrency(outstandingBalance)}</span>. Este monto se deducirá del nuevo desembolso (représtamo).</p>
                      </div>
                    </div>
                  )}

                  {!isGestor && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField control={form.control} name="productType" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tipo de Producto</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>
                              <SelectItem value="PERSONAL">PERSONAL</SelectItem>
                              <SelectItem value="VEHICULO">VEHICULO</SelectItem>
                              <SelectItem value="VIVIENDA">VIVIENDA</SelectItem>
                              <SelectItem value="COMERCIO">COMERCIO</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="subProduct" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Subproducto</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>
                              <SelectItem value="CONSUMO">CONSUMO</SelectItem>
                              <SelectItem value="ACTIVO_FIJO">ACTIVO FIJO</SelectItem>
                              <SelectItem value="CAPITAL_TRABAJO">CAPITAL DE TRABAJO</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                  )}

                  <FormField control={form.control} name="productDestination" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Destino del Producto</FormLabel>
                      <FormControl><Input placeholder="Ej: Compra de vehículo" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                    <FormField control={form.control} name="amount" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Monto del Préstamo (C$)</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">C$</span>
                            <Input
                              type="number"
                              placeholder="5000"
                              {...field}
                              className="pl-9"
                              onBlur={() => {
                                setTimeout(calculateInstallment, 100);
                              }}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="interestRate" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tasa de Interés Mensual (%)</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Percent className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              type="number"
                              placeholder="Ej: 5"
                              {...field}
                              className="pl-9"
                              onBlur={() => {
                                setTimeout(calculateInstallment, 100);
                              }}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                    <FormField control={form.control} name="paymentFrequency" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Forma de Pago</FormLabel>
                        <Select
                          onValueChange={(value) => {
                            field.onChange(value);
                            setTimeout(calculateInstallment, 100);
                          }}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecciona forma de pago" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Diario">Diario</SelectItem>
                            <SelectItem value="Semanal">Semanal</SelectItem>
                            <SelectItem value="Catorcenal">Catorcenal</SelectItem>
                            <SelectItem value="Quincenal">Quincenal</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="termMonths" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Plazo del Préstamo (Meses)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.5"
                            placeholder="Ej: 24"
                            {...field}
                            onBlur={() => {
                              setTimeout(calculateInstallment, 100);
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
                    <FormField control={form.control} name="firstPaymentDate" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Fecha de Primera Cuota</FormLabel>
                        <FormControl>
                          <DateInput
                            value={field.value}
                            onChange={(value) => {
                              field.onChange(value);
                              setTimeout(calculateInstallment, 100);
                            }}
                            placeholder="Seleccionar fecha"
                            required
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <div className="space-y-1">
                      <FormLabel>Cuota Proyectada</FormLabel>
                      <div className="p-2 text-center border rounded-md bg-muted/50 h-10 flex items-center justify-center">
                        {projectedInstallment !== null && !isNaN(projectedInstallment) ? (
                          <p className="text-lg font-bold text-primary">{formatCurrency(projectedInstallment)}</p>
                        ) : (
                          <p className="text-sm text-muted-foreground">Complete los datos para calcular</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <Separator />
                  <div className="grid grid-cols-1 gap-6">
                    <FormField control={form.control} name="collectionsManager" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Gestor Asignado</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value || undefined}
                          disabled={isGestor}
                        >
                          <FormControl><SelectTrigger><div className="flex items-center gap-2"><Users className="h-4 w-4 text-muted-foreground" /><SelectValue placeholder="Seleccionar gestor" /></div></SelectTrigger></FormControl>
                          <SelectContent>
                            {gestores.map(g => <SelectItem key={g.id} value={g.id!}>{g.fullName}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                </CardContent>
              </TabsContent>
              <TabsContent value="guarantors">
                <CardContent className="space-y-4 pt-6">
                  <Button type="button" onClick={() => setIsGuarantorModalOpen(true)}><PlusCircle className="mr-2 h-4 w-4" /> Agregar Fiador</Button>
                  {guarantors.length > 0 ? (<div className="border rounded-md"><Table><TableHeader><TableRow><TableHead>Nombre</TableHead><TableHead>Cédula</TableHead><TableHead className="text-right">Acciones</TableHead></TableRow></TableHeader><TableBody>{guarantors.map((g) => (<TableRow key={g.id}><TableCell>{g.name}</TableCell><TableCell>{g.cedula}</TableCell><TableCell className="text-right"><Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveGuarantor(g.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell></TableRow>))}</TableBody></Table></div>) : (<div className="text-center text-sm text-muted-foreground pt-4 border border-dashed rounded-md min-h-[100px] flex items-center justify-center"><p>No se han agregado fiadores.</p></div>)}
                </CardContent>
              </TabsContent>
              <TabsContent value="guarantees">
                <CardContent className="space-y-4 pt-6">
                  <Button type="button" onClick={() => setIsGuaranteeModalOpen(true)}><PlusCircle className="mr-2 h-4 w-4" /> Agregar Garantía</Button>
                  {guarantees.length > 0 ? (<div className="border rounded-md"><Table><TableHeader><TableRow><TableHead>Artículo</TableHead><TableHead>Valor Estimado</TableHead><TableHead className="text-right">Acciones</TableHead></TableRow></TableHeader><TableBody>{guarantees.map((g) => (<TableRow key={g.id}><TableCell>{g.article}</TableCell><TableCell>{formatCurrency(g.estimatedValue)}</TableCell><TableCell className="text-right"><Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveGuarantee(g.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell></TableRow>))}</TableBody>
                    <TableFooter>
                      <TableRow className="font-bold">
                        <TableCell>Valor Total en Garantías</TableCell>
                        <TableCell className="text-right" colSpan={2}>{formatCurrency(totalGuaranteesValue)}</TableCell>
                      </TableRow>
                    </TableFooter>
                  </Table></div>) : (<div className="text-center text-sm text-muted-foreground pt-4 border border-dashed rounded-md min-h-[100px] flex items-center justify-center"><p>No se han agregado garantías.</p></div>)}
                </CardContent>
              </TabsContent>
            </Tabs>
            <CardFooter className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => router.push(isGestor ? '/dashboard' : '/credits')} disabled={isSubmitting}>
                <X className="mr-2 h-4 w-4" /> Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting || isLoading} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                {isSubmitting ? 'Guardando...' : (isEditMode ? 'Guardar Cambios' : 'Enviar Solicitud')}
              </Button>
            </CardFooter>
          </Card>
        </form>
      </Form>
      <GuaranteeForm isOpen={isGuaranteeModalOpen} onClose={() => setIsGuaranteeModalOpen(false)} onSubmit={handleSaveGuarantee} mode="add" />
      <GuarantorForm isOpen={isGuarantorModalOpen} onClose={() => setIsGuarantorModalOpen(false)} onSubmit={handleSaveGuarantor} mode="add" />
    </>
  );
}
