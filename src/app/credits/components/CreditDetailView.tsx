'use client';

import * as React from 'react';
import type { CreditDetail, RegisteredPayment, UserRole } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { es } from 'date-fns/locale';
import { formatDateForUser } from '@/lib/date-utils';
import { Button } from '@/components/ui/button';
import { DollarSign, Printer, Undo2, MoreHorizontal, Trash2, FileSignature, Loader2, ShieldAlert, HeartOff, CheckCircle, Calendar } from 'lucide-react';
import { PaymentForm, PaymentFormValues } from './PaymentForm';
import { DesktopPaymentForm } from './DesktopPaymentForm';
import { ReceiptPreview } from './ReceiptPreview';
import { calculateCreditStatusDetails, translateCreditStatus, getRiskCategoryVariant, formatDate, formatTime } from '@/lib/utils';
import { useUser } from '@/hooks/use-user';
import { useToast } from '@/hooks/use-toast';
import { addPayment, revertDisbursement, updateCredit, voidPayment, requestVoidPayment } from '@/app/credits/actions';
import { useRouter } from 'next/navigation';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { printDocument, printDocumentForDesktop } from '@/services/printer-service';
import { getDeviceType } from '@/lib/device-utils';
import { parseISO, format } from 'date-fns';
import { useIsMobile } from '@/hooks/use-mobile';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { savePendingPayment } from '@/services/offline-db';
import { EditPaymentPlanModal } from '../[id]/components/EditPaymentPlanModal';


const formatCurrency = (amount?: number) => {
    if (typeof amount !== 'number' || isNaN(amount)) return 'C$0.00';
    return `C$${amount.toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const DetailRow = ({ label, value }: { label: string, value: React.ReactNode }) => (
    <div className="flex justify-between py-2 border-b border-dashed">
        <p className="text-sm text-muted-foreground">{label}</p>
        <div className="text-sm font-medium text-right">{value || 'N/A'}</div>
    </div>
);

const SectionTitle = ({ title }: { title: string }) => (
    <h3 className="text-md font-semibold text-primary mb-2 mt-4 col-span-full">{title}</h3>
);

interface CreditDetailViewProps {
    credit: CreditDetail;
    onPaymentSuccess?: () => void;
}

const FIELD_ROLES: UserRole[] = ['GESTOR'];

export function CreditDetailView({ credit: initialCredit, onPaymentSuccess }: CreditDetailViewProps) {
    const { user } = useUser();
    const router = useRouter();
    const { toast } = useToast();
    const { isOnline } = useOnlineStatus();
    const [isPaymentModalOpen, setIsPaymentModalOpen] = React.useState(false);
    const [isRevertModalOpen, setIsRevertModalOpen] = React.useState(false);
    const [isVoidModalOpen, setIsVoidModalOpen] = React.useState(false);
    const [isDeceasedModalOpen, setIsDeceasedModalOpen] = React.useState(false);
    const [isEditPlanModalOpen, setIsEditPlanModalOpen] = React.useState(false);
    const [isReceiptPreviewOpen, setIsReceiptPreviewOpen] = React.useState(false);
    const [lastPayment, setLastPayment] = React.useState<Omit<RegisteredPayment, 'id'> & { id?: string } | null>(null);
    const [isReprintForModal, setIsReprintForModal] = React.useState(false);
    const [paymentToVoid, setPaymentToVoid] = React.useState<RegisteredPayment | null>(null);
    const [voidReason, setVoidReason] = React.useState('');
    const [credit, setCredit] = React.useState<CreditDetail>(initialCredit);
    const [isLoading, setIsLoading] = React.useState(false);
    const [deviceType, setDeviceType] = React.useState<'desktop' | 'mobile'>('desktop');
    const isMobile = useIsMobile();

    React.useEffect(() => {
        setDeviceType(getDeviceType());
    }, []);

    React.useEffect(() => {
        setCredit(initialCredit);
    }, [initialCredit]);

    const { remainingBalance, overdueAmount, lateDays, currentLateFee, paidToday, dueTodayAmount, conamiCategory } = calculateCreditStatusDetails(credit);
    const riskVariant = getRiskCategoryVariant(conamiCategory);

    // Debug: Log para verificar los datos del crédito
    React.useEffect(() => {
        console.log('🔍 DEBUG - Datos del crédito:', {
            creditId: credit.id,
            creditNumber: credit.creditNumber,
            status: credit.status,
            paymentPlanLength: credit.paymentPlan?.length || 0,
            registeredPaymentsLength: credit.registeredPayments?.length || 0,
            calculatedLateDays: lateDays,
            calculatedOverdueAmount: overdueAmount,
            calculatedRemainingBalance: remainingBalance,
            conamiCategory
        });
        
        if (credit.paymentPlan && credit.paymentPlan.length > 0) {
            console.log('📅 Plan de pagos (primeras 3 cuotas):', credit.paymentPlan.slice(0, 3));
        } else {
            console.warn('⚠️ No hay plan de pagos cargado');
        }
        
        if (credit.registeredPayments && credit.registeredPayments.length > 0) {
            console.log('💰 Pagos registrados (últimos 3):', credit.registeredPayments.slice(-3));
        } else {
            console.warn('⚠️ No hay pagos registrados');
        }
    }, [credit, lateDays, overdueAmount, remainingBalance, conamiCategory]);

    const handleOpenPaymentModal = () => {
        if (credit.status !== 'Active') {
            toast({ title: 'Crédito no activo', description: 'No se pueden registrar pagos a un crédito que no está activo.', variant: 'destructive' });
            return;
        }
        setIsPaymentModalOpen(true);
    };

    const handlePrintDesktopDocument = (type: 'payment-plan' | 'promissory-note') => {
        printDocumentForDesktop(type, credit.id);
    }

    const handleRevertDisbursement = async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            await revertDisbursement(credit.id, user);
            toast({
                title: 'Desembolso Revertido',
                description: 'El crédito y las operaciones asociadas han sido restaurados al estado anterior.',
            });
            setIsRevertModalOpen(false);
            router.refresh();
            onPaymentSuccess?.();
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'No se pudo revertir el desembolso.';
            toast({ title: 'Error', description: errorMessage, variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleOpenVoidModal = (payment: RegisteredPayment) => {
        if (payment.status === 'ANULADO') {
            toast({ title: "Pago ya anulado", description: "Este pago ya ha sido marcado como anulado.", variant: 'destructive' });
            return;
        }
        setPaymentToVoid(payment);
        setVoidReason('');
        setIsVoidModalOpen(true);
    }

    const handleVoidAction = async () => {
        if (!paymentToVoid || !user) return;
        setIsLoading(true);

        try {
            if (user.role === 'GESTOR') {
                await requestVoidPayment(credit.id, paymentToVoid.id, voidReason, user);
                toast({ title: 'Solicitud de Anulación Enviada', description: 'Un administrador debe aprobar la anulación.' });
            } else if (user.role === 'ADMINISTRADOR') {
                // If admin and payment is PENDING, approve it. If it's VALID, void it directly.
                if (paymentToVoid.status === 'ANULACION_PENDIENTE') {
                    await voidPayment(credit.id, paymentToVoid.id, user);
                    toast({ title: 'Anulación Aprobada', description: 'El pago ha sido marcado como anulado.' });
                } else {
                    // Admin directly voids a valid payment
                    await voidPayment(credit.id, paymentToVoid.id, user);
                    toast({ title: 'Pago Anulado Directamente', description: 'El pago ha sido marcado como anulado por el administrador.' });
                }
            }

            onPaymentSuccess?.();
            setIsVoidModalOpen(false);
            setPaymentToVoid(null);
        } catch (error) {
            toast({ title: 'Error', description: error instanceof Error ? error.message : 'No se pudo procesar la anulación.', variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    }

    const handleMarkDeceased = async () => {
        if (!user || user.role !== 'ADMINISTRADOR') return;
        setIsLoading(true);
        try {
            // Un crédito fallecido se considera liquidado/incobrable
            await updateCredit(credit.id, {
                status: 'Fallecido',
                rejectionReason: `Cancelado por fallecimiento del titular el ${format(new Date(), 'dd/MM/yyyy')}`
            }, user);

            toast({
                title: 'Crédito Actualizado',
                description: 'El crédito ha sido marcado como "Fallecido" y retirado de la cobranza activa.',
                variant: 'info'
            });
            setIsDeceasedModalOpen(false);
            router.refresh();
            onPaymentSuccess?.();
            router.push('/credits');
        } catch (error) {
            toast({ title: 'Error', description: 'No se pudo procesar la acción.', variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    }


    const handlePaymentSubmit = async (data: PaymentFormValues) => {
        if (!user) {
            toast({ title: "Error", description: "No se pudo identificar al usuario.", variant: "destructive" });
            return;
        }
        setIsLoading(true);
        const newPayment: Omit<RegisteredPayment, 'id'> = {
            paymentDate: data.paymentDate,
            amount: data.amount,
            managedBy: user.fullName,
            transactionNumber: undefined,
            status: 'VALIDO',
            paymentType: data.paymentType,
            notes: data.notes,
        };

        try {
            // Verificar PRIMERO si estamos online - ANTES de intentar cualquier fetch
            const isReallyOnline = navigator.onLine && isOnline;

            // Si NO estamos online, ir DIRECTAMENTE al guardado offline
            if (!isReallyOnline) {
                console.log('📱 Modo offline detectado - guardando pago localmente');
                await savePendingPayment(credit.id, newPayment, user.id);
                toast({
                    title: "Pago Guardado Offline",
                    description: `El abono se sincronizará automáticamente cuando haya conexión.`,
                    variant: "default"
                });
                setLastPayment({ ...newPayment, id: `offline-${Date.now()}` });
                setIsReprintForModal(false);
                setIsReceiptPreviewOpen(true);
                setIsPaymentModalOpen(false);

                // NO llamar a router.refresh() si estamos offline, ya que fallará el fetch del framework
                onPaymentSuccess?.();
                setIsLoading(false);
                return;
            }

            // Solo si estamos online, intentar enviar al servidor
            try {
                const result = await addPayment(credit.id, newPayment, user);
                if (result.success && result.paymentId) {
                    toast({ title: "Pago Registrado", description: `El abono de ${formatCurrency(data.amount)} ha sido registrado.` });
                    setLastPayment({ ...newPayment, id: result.paymentId, transactionNumber: result.transactionNumber });
                    setIsReprintForModal(false);
                    setIsReceiptPreviewOpen(true);
                    setIsPaymentModalOpen(false);
                    router.refresh();
                    onPaymentSuccess?.();
                    return;
                } else if (result.success === false) {
                    toast({ title: "Error al Registrar Pago", description: result.error || 'Ocurrió un error desconocido.', variant: "destructive" });
                    return;
                }
            } catch (netError: any) {
                // Capturar errores de red (Failed to fetch) incluso si el check inicial dio online (Lie-Fi)
                console.warn("Error de red durante el registro, guardando localmente:", netError);
                await savePendingPayment(credit.id, newPayment, user.id);
                toast({
                    title: "Pago Guardado Offline",
                    description: `Conexión inestable. El abono se guardó localmente.`,
                    variant: "default"
                });
                setLastPayment({ ...newPayment, id: `offline-err-${Date.now()}` });
                setIsReprintForModal(false);
                setIsReceiptPreviewOpen(true);
                setIsPaymentModalOpen(false);
                onPaymentSuccess?.();
            }

        } catch (e: any) {
            console.error("Error al procesar pago:", e);
            toast({
                title: "Error",
                description: e.message || "No se pudo procesar el pago.",
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeceased = async () => {
        if (!user || user.role !== 'ADMINISTRADOR') {
            toast({ title: 'Permiso Denegado', description: 'Solo los administradores pueden realizar esta acción.', variant: 'destructive' });
            return;
        }
        setIsLoading(true);
        try {
            await updateCredit(credit.id, { status: 'Fallecido', rejectionReason: `Cancelado por fallecimiento del titular el ${format(new Date(), 'dd/MM/yyyy')}` }, user);
            toast({
                title: 'Crédito Actualizado',
                description: 'El crédito ha sido marcado como "Fallecido" y cancelado.',
            });
            setIsDeceasedModalOpen(false);
            router.refresh();
            onPaymentSuccess?.();
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'No se pudo actualizar el estado del crédito.';
            toast({ title: 'Error', description: errorMessage, variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    };


    const fullAddress = [
        credit.clientDetails?.department,
        credit.clientDetails?.municipality,
        credit.clientDetails?.neighborhood,
        credit.clientDetails?.address,
    ].filter(Boolean).join(', ');

    const workAddress = credit.clientDetails?.asalariadoInfo?.companyAddress || credit.clientDetails?.comercianteInfo?.businessAddress;

    const canManageCredit = user?.role === 'ADMINISTRADOR';
    const canVoidPayment = user?.role === 'ADMINISTRADOR';
    const canRequestVoidPayment = user?.role === 'GESTOR' || user?.role === 'GERENTE';
    const isFieldUser = user && FIELD_ROLES.includes(user.role);
    const isGestor = user?.role === 'GESTOR';

    const totalPaid = (credit.registeredPayments || []).filter(p => p.status !== 'ANULADO').reduce((sum, p) => sum + p.amount, 0);

    const totalGuaranteesValue = (credit.guarantees || []).reduce((sum, g) => sum + g.estimatedValue, 0);

    return (
        <>
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold">Crédito #: {credit.creditNumber}</h2>
                    <Badge variant={credit.status === 'Active' ? 'default' : 'secondary'}>{translateCreditStatus(credit.status)}</Badge>
                </div>
                <div className="flex gap-2">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={handleOpenPaymentModal} disabled={credit.status !== 'Active'}>
                                <DollarSign className="mr-2 h-4 w-4" /> Registrar Abono
                            </DropdownMenuItem>
                            {user?.role === 'ADMINISTRADOR' && (
                                <DropdownMenuItem onClick={() => setIsDeceasedModalOpen(true)} className="text-destructive">
                                    <HeartOff className="mr-2 h-4 w-4" /> Marcar Fallecido
                                </DropdownMenuItem>
                            )}
                            {user?.role === 'ADMINISTRADOR' && credit.status === 'Active' && (
                                <>
                                    <DropdownMenuItem onClick={() => setIsRevertModalOpen(true)} className="text-destructive">
                                        <Undo2 className="mr-2 h-4 w-4" /> Regresar Desembolso
                                    </DropdownMenuItem>
                                </>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
            <Tabs defaultValue="details" className="w-full">
                <div className="overflow-x-auto pb-2">
                    <TabsList className="flex w-full">
                        <TabsTrigger value="details" className="flex-1">Detalles</TabsTrigger>
                        <TabsTrigger value="summary" className="flex-1">Resumen</TabsTrigger>
                        <TabsTrigger value="guarantors" className="flex-1">Fiadores</TabsTrigger>
                        {!isGestor && <TabsTrigger value="guarantees" className="flex-1">Garantías</TabsTrigger>}
                        <TabsTrigger value="paymentPlan" className="flex-1">Plan de Pagos</TabsTrigger>
                        <TabsTrigger value="payments" className="flex-1">Historial de Abonos</TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="details">
                    <Card><CardContent className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-4">
                            <SectionTitle title="Generalidades del Cliente" />
                            <div className="lg:col-span-2"><Label>Nombre del Cliente</Label><p className="font-medium">{credit.clientDetails?.name}</p></div>
                            <div className="lg:col-span-2"><Label>Dirección Domiciliar</Label><p className="font-medium">{fullAddress}</p></div>
                            <div className="lg:col-span-2"><Label>Dirección Laboral</Label><p className="font-medium">{workAddress || 'N/A'}</p></div>

                            <SectionTitle title="Configuración del Préstamo" />
                            <div><Label>Tipo de producto</Label><p className="font-medium">{credit.productType}</p></div>
                            <div><Label>Sub Producto</Label><p className="font-medium">{credit.subProduct}</p></div>
                            <div className="lg:col-span-2"><Label>Destino del producto</Label><p className="font-medium">{credit.productDestination}</p></div>

                            <SectionTitle title="Intereses y plazos" />
                            <div><Label>Tasa Interés Corriente</Label><p className="font-medium">{credit.interestRate}% Mensual</p></div>
                            <div><Label>Tipo de Moneda</Label><p className="font-medium">{credit.currencyType}</p></div>
                            <div><Label>Periodicidad</Label><p className="font-medium">{credit.paymentFrequency}</p></div>
                            <div><Label>Plazo</Label><p className="font-medium">{credit.termMonths} meses</p></div>

                            <SectionTitle title="Datos del Préstamo" />
                            <div><Label>Monto Principal</Label><p className="font-medium">{formatCurrency(credit.principalAmount)}</p></div>
                            <div><Label>Monto Total del Crédito</Label><p className="font-medium">{formatCurrency(credit.totalAmount)}</p></div>
                            <div><Label>Cuota a Pagar</Label><p className="font-medium">{formatCurrency(credit.totalInstallmentAmount)}</p></div>
                            <div />
                            <div><Label>Fecha de Entrega</Label><p className="font-medium">{formatDate(credit.deliveryDate)}</p></div>
                            <div><Label>Fecha de Primera Cuota</Label><p className="font-medium">{formatDate(credit.firstPaymentDate)}</p></div>
                            <div><Label>Fecha de Vencimiento</Label><p className="font-medium">{formatDate(credit.dueDate)}</p></div>

                            <SectionTitle title="Información de Gestión" />
                            <div className="lg:col-span-2"><Label>Gestor de Cobro</Label><p className="font-medium">{credit.collectionsManager}</p></div>

                            {!isGestor && (
                                <>
                                    <SectionTitle title="Trazabilidad" />
                                    <div><Label>Creado por</Label><p className="font-medium">{credit.createdBy}</p></div>
                                    <div><Label>Aprobado por</Label><p className="font-medium">{credit.approvedBy}</p></div>
                                    <div><Label>Desembolsado por</Label><p className="font-medium">{credit.disbursedBy}</p></div>
                                    <div><Label>Última Modificación</Label><p className="font-medium">{credit.lastModifiedBy}{credit.updatedAt && ` (${formatDateForUser(credit.updatedAt)})`}</p></div>
                                </>
                            )}
                        </div>
                    </CardContent></Card>
                </TabsContent>

                <TabsContent value="summary">
                    <Card>
                        <CardHeader>
                            <CardTitle>Resumen del Estado del Crédito</CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <StatCard title="Saldo Pendiente" value={formatCurrency(remainingBalance)} />
                            <StatCard title="Monto en Mora" value={formatCurrency(overdueAmount)} className="text-destructive" />
                            <StatCard title="Días de Atraso" value={lateDays.toString()} className="text-destructive" />
                            <StatCard title="Clasificación CONAMI" value={conamiCategory || 'N/A'} icon={ShieldAlert} className={riskVariant} />
                        </CardContent>
                        {!isGestor && (
                            <CardFooter className="flex justify-end pt-4">
                                <Button variant="outline" onClick={() => handlePrintDesktopDocument('promissory-note')}>
                                    <FileSignature className="mr-2 h-4 w-4" /> Imprimir Pagaré
                                </Button>
                            </CardFooter>
                        )}
                    </Card>
                </TabsContent>

                <TabsContent value="guarantors">
                    <Card>
                        <CardHeader><CardTitle>Fiadores Registrados</CardTitle></CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader><TableRow><TableHead>Nombre</TableHead><TableHead>Cédula</TableHead><TableHead>Teléfono</TableHead><TableHead>Dirección</TableHead></TableRow></TableHeader>
                                <TableBody>
                                    {credit.guarantors && Array.isArray(credit.guarantors) && credit.guarantors.length > 0 ? credit.guarantors.map((g) => (
                                        <TableRow key={g.id}>
                                            <TableCell>{g.name}</TableCell>
                                            <TableCell>{g.cedula}</TableCell>
                                            <TableCell>{g.phone}</TableCell>
                                            <TableCell>{g.address}</TableCell>
                                        </TableRow>
                                    )) : <TableRow><TableCell colSpan={4} className="text-center">No hay fiadores registrados.</TableCell></TableRow>}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                {!isGestor && (
                    <TabsContent value="guarantees">
                        <Card>
                            <CardHeader><CardTitle>Garantías Registradas</CardTitle></CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader><TableRow><TableHead>Artículo</TableHead><TableHead>Marca</TableHead><TableHead>Modelo/Serie</TableHead><TableHead className="text-right">Valor Estimado</TableHead></TableRow></TableHeader>
                                    <TableBody>
                                        {credit.guarantees && Array.isArray(credit.guarantees) && credit.guarantees.length > 0 ? credit.guarantees.map((g) => (
                                            <TableRow key={g.id}>
                                                <TableCell>{g.article}</TableCell>
                                                <TableCell>{g.brand}</TableCell>
                                                <TableCell>{g.model || g.series}</TableCell>
                                                <TableCell className="text-right">{formatCurrency(g.estimatedValue)}</TableCell>
                                            </TableRow>
                                        )) : <TableRow><TableCell colSpan={4} className="text-center">No hay garantías registradas.</TableCell></TableRow>}
                                    </TableBody>
                                    <TableFooter>
                                        <TableRow>
                                            <TableCell colSpan={3} className="text-right font-bold">Valor Total en Garantías</TableCell>
                                            <TableCell className="text-right font-bold">{formatCurrency(totalGuaranteesValue)}</TableCell>
                                        </TableRow>
                                    </TableFooter>
                                </Table>
                            </CardContent>
                        </Card>
                    </TabsContent>
                )}

                <TabsContent value="paymentPlan">
                    <Card>
                        <CardHeader className="flex flex-row justify-between items-center">
                            <CardTitle>Plan de Pagos</CardTitle>
                            <div className="flex gap-2">
                                {canManageCredit && (
                                    <Button variant="outline" size="sm" onClick={() => setIsEditPlanModalOpen(true)}>
                                        <Calendar className="mr-2 h-4 w-4" /> Editar Fechas
                                    </Button>
                                )}
                                {!isGestor && (
                                    <Button variant="outline" size="sm" onClick={() => handlePrintDesktopDocument('payment-plan')}>
                                        <Printer className="mr-2 h-4 w-4" /> Imprimir Plan de Pago
                                    </Button>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>#</TableHead>
                                        <TableHead>Fecha</TableHead>
                                        <TableHead>Capital</TableHead>
                                        <TableHead>Interés</TableHead>
                                        <TableHead>Monto Cuota</TableHead>
                                        <TableHead>Saldo</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {(credit.paymentPlan || []).map((p) => (
                                        <TableRow key={p.paymentNumber}>
                                            <TableCell>{p.paymentNumber}</TableCell>
                                            <TableCell>{formatDate(p.paymentDate, 'dd/MM/yyyy')}</TableCell>
                                            <TableCell>{formatCurrency(p.principal)}</TableCell>
                                            <TableCell>{formatCurrency(p.interest)}</TableCell>
                                            <TableCell>{formatCurrency(p.amount)}</TableCell>
                                            <TableCell>{formatCurrency(p.balance)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="payments">
                    <Card>
                        <CardHeader><CardTitle>Historial de Abonos Registrados</CardTitle></CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader><TableRow><TableHead>Fecha y Hora</TableHead><TableHead>Monto</TableHead><TableHead>Gestor</TableHead><TableHead># Transacción</TableHead><TableHead className="text-right">Acciones</TableHead></TableRow></TableHeader>
                                <TableBody>
                                    {Array.isArray(credit.registeredPayments) && credit.registeredPayments.length > 0 ? (
                                        credit.registeredPayments.sort((a, b) => parseISO(b.paymentDate).getTime() - parseISO(a.paymentDate).getTime()).map((p) => (
                                            <TableRow key={p.id} className={p.status === 'ANULADO' ? 'text-muted-foreground line-through' : ''}>
                                                <TableCell className="font-medium">
                                                    {formatDateForUser(p.paymentDate, "dd/MM/yyyy HH:mm")}
                                                    {p.paymentType && p.paymentType !== 'NORMAL' && (
                                                        <Badge variant="outline" className="ml-2 bg-amber-50 text-amber-600 border-amber-200 text-[10px] scale-90 origin-left">
                                                            {p.paymentType}
                                                        </Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell>{formatCurrency(p.amount)}</TableCell>
                                                <TableCell>{p.managedBy}</TableCell>
                                                <TableCell>{p.transactionNumber}</TableCell>
                                                <TableCell className="text-right">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon" disabled={p.status === 'ANULADO' || (!canManageCredit && !isFieldUser)}>
                                                                <MoreHorizontal className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            {(isFieldUser || canManageCredit) && (
                                                                <DropdownMenuItem onClick={() => {
                                                                    setLastPayment(p);
                                                                    setIsReprintForModal(true);
                                                                    setIsReceiptPreviewOpen(true);
                                                                }}>
                                                                    <Printer className="mr-2 h-4 w-4" /> Reimprimir
                                                                </DropdownMenuItem>
                                                            )}
                                                            {canRequestVoidPayment && p.status === 'VALIDO' && (
                                                                <DropdownMenuItem onClick={() => handleOpenVoidModal(p)} className="text-amber-600 focus:bg-amber-100 focus:text-amber-900">
                                                                    <ShieldAlert className="mr-2 h-4 w-4" /> Solicitar Anulación
                                                                </DropdownMenuItem>
                                                            )}
                                                            {canVoidPayment && p.status === 'ANULACION_PENDIENTE' && (
                                                                <DropdownMenuItem onClick={() => handleOpenVoidModal(p)} className="text-green-600 focus:bg-green-100 focus:text-green-900">
                                                                    <CheckCircle className="mr-2 h-4 w-4" /> Aprobar Anulación
                                                                </DropdownMenuItem>
                                                            )}
                                                            {canVoidPayment && p.status === 'VALIDO' && (
                                                                <DropdownMenuItem onClick={() => handleOpenVoidModal(p)} className="text-destructive focus:bg-destructive focus:text-destructive-foreground">
                                                                    <Trash2 className="mr-2 h-4 w-4" /> Anular Pago
                                                                </DropdownMenuItem>
                                                            )}
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </TableCell>
                                            </TableRow>
                                        ))) : (
                                        <TableRow><TableCell colSpan={5} className="text-center">No hay abonos registrados.</TableCell></TableRow>
                                    )}
                                </TableBody>
                            </Table>
                            <div className="mt-4 border-t pt-4 space-y-2">
                                <div className="flex justify-between items-center text-sm font-medium">
                                    <span className="text-muted-foreground">Monto Total del Crédito:</span>
                                    <span className="text-blue-600 font-bold">{formatCurrency(credit.totalAmount)}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm font-medium">
                                    <span className="text-muted-foreground">Total Abonado:</span>
                                    <span className="text-green-600 font-bold">{formatCurrency(totalPaid)}</span>
                                </div>
                                <div className="flex justify-between items-center text-lg font-bold">
                                    <span className="text-muted-foreground">Saldo Pendiente:</span>
                                    <span className="text-red-600">{formatCurrency(remainingBalance)}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
            {deviceType === 'mobile' ? (
                <PaymentForm
                    isOpen={isPaymentModalOpen}
                    onClose={() => setIsPaymentModalOpen(false)}
                    onSubmit={handlePaymentSubmit}
                    creditBalance={remainingBalance}
                    dueTodayAmount={dueTodayAmount}
                    paidToday={paidToday}
                    overdueAmount={overdueAmount}
                    lateFee={currentLateFee}
                    lateDays={lateDays}
                    clientName={credit.clientName}
                    clientId={credit.clientId}
                />
            ) : (
                <DesktopPaymentForm
                    isOpen={isPaymentModalOpen}
                    onClose={() => setIsPaymentModalOpen(false)}
                    onSubmit={handlePaymentSubmit}
                    creditBalance={remainingBalance}
                    dueTodayAmount={dueTodayAmount}
                    overdueAmount={overdueAmount}
                    lateFee={currentLateFee}
                />
            )}
            <AlertDialog open={isRevertModalOpen} onOpenChange={setIsRevertModalOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Confirmar reversión?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción cambiará el estado del crédito de "Activo" a "Aprobado" y restablecerá los datos del desembolso.
                            Si este desembolso canceló un crédito anterior, ese crédito volverá a su estado "Activo" con su saldo original.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleRevertDisbursement} className="bg-destructive hover:bg-destructive/90" disabled={isLoading}>
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Sí, revertir desembolso
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            <AlertDialog open={isDeceasedModalOpen} onOpenChange={setIsDeceasedModalOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                            <ShieldAlert className="h-5 w-5" /> ¿Confirmar Cancelación por Fallecimiento?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción marcará el crédito de <strong>{credit.clientName}</strong> como "Fallecido".
                            El crédito dejará de aparecer en la cartera activa de cobros y el saldo se considerará cancelado por política de seguro/fallecimiento.
                            Esta operación quedará registrada en la auditoría.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Volver</AlertDialogCancel>
                        <AlertDialogAction onClick={handleMarkDeceased} className="bg-destructive hover:bg-destructive/90" disabled={isLoading}>
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Confirmar Cancelación
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={isVoidModalOpen} onOpenChange={setIsVoidModalOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {paymentToVoid?.status === 'ANULACION_PENDIENTE' ? 'Aprobar Anulación de Pago' : 'Solicitar/Anular Pago'}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {paymentToVoid?.status === 'ANULACION_PENDIENTE'
                                ? `El gestor ${paymentToVoid.voidRequestedBy} solicitó anular este pago por el siguiente motivo: "${paymentToVoid.voidReason}". ¿Desea aprobar la anulación?`
                                : 'Para solicitar la anulación o anular directamente este pago, debes indicar un motivo claro para la auditoría.'
                            }
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    {paymentToVoid?.status !== 'ANULACION_PENDIENTE' && (
                        <div className="py-4 space-y-2">
                            <Label htmlFor="void-reason">Motivo de la anulación</Label>
                            <Input id="void-reason" value={voidReason} onChange={(e) => setVoidReason(e.target.value)} placeholder="Ej: Pago duplicado, error de monto" />
                        </div>
                    )}
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleVoidAction} disabled={(paymentToVoid?.status !== 'ANULACION_PENDIENTE' && !voidReason.trim()) || isLoading}>
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {paymentToVoid?.status === 'ANULACION_PENDIENTE' ? 'Aprobar Anulación' : 'Confirmar Anulación'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            <AlertDialog open={isDeceasedModalOpen} onOpenChange={setIsDeceasedModalOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Confirmar fallecimiento?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción marcará el crédito como "Fallecido", cancelará el saldo pendiente y lo sacará de la cartera activa. Esta acción no se puede deshacer.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeceased} className="bg-destructive hover:bg-destructive/90" disabled={isLoading}>
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Sí, confirmar fallecimiento
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            {isEditPlanModalOpen && (
                <EditPaymentPlanModal
                    isOpen={isEditPlanModalOpen}
                    onClose={() => setIsEditPlanModalOpen(false)}
                    creditId={credit.id}
                    creditNumber={credit.creditNumber}
                    clientName={credit.clientName}
                    paymentPlan={credit.paymentPlan || []}
                    onSuccess={() => {
                        router.refresh();
                        onPaymentSuccess?.();
                    }}
                />
            )}
            {isReceiptPreviewOpen && lastPayment && (
                <ReceiptPreview
                    isOpen={isReceiptPreviewOpen}
                    onClose={() => {
                        setIsReceiptPreviewOpen(false);
                        setLastPayment(null);
                        router.refresh();
                        onPaymentSuccess?.();
                    }}
                    credit={credit}
                    payment={lastPayment}
                    isOffline={typeof lastPayment.id === 'string' && (lastPayment.id.startsWith('offline') || lastPayment.id.startsWith('off-'))}
                    isReprint={isReprintForModal}
                    userBranch={user?.sucursalName || user?.sucursal}
                    userRole={user?.role}
                />
            )}
        </>
    );
}

const StatCard = ({ title, value, className, icon: Icon }: { title: string, value: string, className?: string, icon?: React.ElementType }) => (
    <Card className="p-4 bg-muted/40">
        <p className="text-sm text-muted-foreground flex items-center gap-2">
            {Icon && <Icon className="h-4 w-4" />}
            {title}
        </p>
        <p className={`text-2xl font-bold ${className}`}>{value}</p>
    </Card>
);