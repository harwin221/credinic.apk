'use client';

import * as React from 'react';
import type { AppUser, CreditDetail, RegisteredPayment, PortfolioCredit } from '@/lib/types';
import { getPortfolioForGestor, type GestorDashboardData } from '@/services/portfolio-service';
import { Loader2, CalendarClock, AlertTriangle, ShieldCheck, Ban, Wallet, Users, BarChart, Eye, Search, ArrowRightLeft, Target, HandCoins, MoreHorizontal, Printer, CheckCircle, RefreshCw, WifiOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/hooks/use-user';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format, parseISO, isToday } from 'date-fns';
import { es } from 'date-fns/locale';
import { nowInNicaragua } from '@/lib/date-utils';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { PaymentForm } from '@/app/credits/components/PaymentForm';
import { addPayment } from '@/app/credits/actions';
import { calculateCreditStatusDetails } from '@/lib/utils';
import { printDocument } from '@/services/printer-service';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { CreditSearchDialog } from './CreditSearchDialog';
import { getCredit } from '@/services/credit-service';
import { ReceiptPreview } from '@/app/credits/components/ReceiptPreview';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useOfflineSync } from '@/services/offline-sync';
import { getOfflineCredits, isDataAvailableOffline, getSyncStatus, savePendingPayment } from '@/services/offline-db';
import { useOnlineStatus } from '@/hooks/use-online-status';


const formatCurrency = (amount: number = 0) => `C$${amount.toLocaleString('es-NI', { minimumFractionDigits: 2 })}`;

interface CategorizedCredits {
  paidToday: PortfolioCredit[];
  dueToday: PortfolioCredit[];
  overdue: PortfolioCredit[];
  expired: PortfolioCredit[];
  upToDate: PortfolioCredit[];
}

const BigStatCard = ({ title, value, icon: Icon, color }: { title: string, value: string | number, icon: React.ElementType, color: string }) => (
  <Card className={cn("text-white transition-all hover:shadow-xl hover:-translate-y-1", color)}>
    <CardContent className="pt-6 text-center space-y-2">
      <Icon className="h-10 w-10 mx-auto opacity-80" />
      <p className="text-sm font-medium uppercase tracking-wider">{title}</p>
      <p className="text-4xl font-bold">{value}</p>
    </CardContent>
  </Card>
);


const statusConfig = {
  paidToday: { color: 'bg-blue-500', label: 'Cobrado Hoy' },
  dueToday: { color: 'bg-green-500', label: 'Cuota del Día' },
  overdue: { color: 'bg-orange-500', label: 'En Mora' },
  expired: { color: 'bg-red-500', label: 'Vencido' },
  upToDate: { color: 'bg-gray-500', label: 'Al Día' },
};

const CreditCategoryTable = ({
  credits,
  statusKey,
  onSelectCredit,
  onReprintReceipt
}: {
  credits: PortfolioCredit[],
  statusKey: keyof typeof statusConfig,
  onSelectCredit: (credit: PortfolioCredit) => void,
  onReprintReceipt: (credit: PortfolioCredit) => void
}) => {
  if (credits.length === 0) {
    return <div className="text-center text-muted-foreground p-8">No hay clientes en esta categoría.</div>;
  }

  return (
    <div
      className="relative w-full overflow-x-auto pb-4 rounded-md border"
      style={{
        WebkitOverflowScrolling: 'touch',
        touchAction: 'pan-x pan-y'
      }}
    >
      <Table className="min-w-[750px] w-full">
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-[200px]">Cliente</TableHead>
            <TableHead className="min-w-[140px]">{statusKey === 'paidToday' ? 'Monto Cobrado' : 'Monto a Pagar'}</TableHead>
            <TableHead className="text-right min-w-[140px]">Saldo Restante</TableHead>
            <TableHead className="text-right w-[80px]">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {credits.map(credit => {
            const totalToPay = (credit.details.dueTodayAmount || 0) + credit.details.overdueAmount;
            const paidToday = credit.details.paidToday > 0;
            return (
              <TableRow key={credit.id} onClick={!paidToday ? () => onSelectCredit(credit) : undefined} className={!paidToday ? "cursor-pointer active:bg-muted/50" : ""}>
                <TableCell className="font-medium">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className={cn("h-2 w-2 rounded-full shrink-0", statusConfig[statusKey].color)}></span>
                      <span className="truncate max-w-[180px] sm:max-w-none">{credit.clientName}</span>
                    </div>
                    {paidToday && statusKey === 'dueToday' && <Badge variant="secondary" className="w-fit mt-1 text-[10px]">Abonado</Badge>}
                  </div>
                </TableCell>
                <TableCell className="whitespace-nowrap">{formatCurrency(paidToday ? credit.details.paidToday : totalToPay)}</TableCell>
                <TableCell className="text-right whitespace-nowrap">{formatCurrency(credit.details.remainingBalance)}</TableCell>
                <TableCell className="text-right p-2">
                  <DropdownMenu modal={false}>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted" onClick={(e) => e.stopPropagation()}>
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Menú</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48 z-50 pointer-events-auto" sideOffset={5} avoidCollisions={false}>
                      <DropdownMenuItem className="cursor-pointer py-2.5 h-10" onClick={(e) => { e.stopPropagation(); onSelectCredit(credit); }}>
                        <Wallet className="mr-2 h-4 w-4" /> Aplicar Abono
                      </DropdownMenuItem>
                      {paidToday && (
                        <DropdownMenuItem className="cursor-pointer py-2.5 h-10" onClick={(e) => { e.stopPropagation(); onReprintReceipt(credit); }}>
                          <Printer className="mr-2 h-4 w-4" /> Reimprimir
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};

export function GestorDashboard({ user, initialPortfolio, initialSummary }: { user: AppUser, initialPortfolio: PortfolioCredit[], initialSummary: GestorDashboardData }) {
  const { toast } = useToast();
  const router = useRouter();
  const { isOnline } = useOnlineStatus();

  const [isLoading, setIsLoading] = React.useState(false);
  const [selectedCreditForPayment, setSelectedCreditForPayment] = React.useState<CreditDetail | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = React.useState(false);
  const [isSearchOpen, setIsSearchOpen] = React.useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = React.useState(false);
  const [lastPayment, setLastPayment] = React.useState<any>(null);
  const [isReprintForModal, setIsReprintForModal] = React.useState(false);

  const categorizeCredits = React.useCallback((portfolio: PortfolioCredit[]): CategorizedCredits => {
    const categories: CategorizedCredits = { paidToday: [], dueToday: [], overdue: [], expired: [], upToDate: [] };

    portfolio.forEach(credit => {
      if (credit.details.paidToday > 0) {
        categories.paidToday.push(credit);
      } else if (credit.details.isDueToday) {
        categories.dueToday.push(credit);
      } else if (credit.details.isExpired) {
        categories.expired.push(credit);
      } else if (credit.details.overdueAmount > 0) {
        categories.overdue.push(credit);
      } else {
        categories.upToDate.push(credit);
      }
    });
    return categories;
  }, []);

  const [categorizedCredits, setCategorizedCredits] = React.useState<CategorizedCredits>(() => categorizeCredits(initialPortfolio));
  const [dailySummary, setDailySummary] = React.useState<GestorDashboardData | null>(initialSummary);

  const fetchPortfolio = React.useCallback(async () => {
    if (!user) return;
    setIsLoading(true);

    // Si estamos offline, ir directo a la DB local
    if (typeof window !== 'undefined' && !navigator.onLine) {
      const offlineCredits = await getOfflineCredits();
      if (offlineCredits.length > 0) {
        const portfolio = offlineCredits.map(c => ({
          ...c,
          details: calculateCreditStatusDetails(c)
        }));
        setCategorizedCredits(categorizeCredits(portfolio));
        toast({ title: "Modo Offline", description: "Cargando datos locales de la última sincronización." });
        setIsLoading(false);
        return;
      }
    }

    try {
      const { portfolio, dailySummary } = await getPortfolioForGestor(user.id);
      setCategorizedCredits(categorizeCredits(portfolio));
      setDailySummary(dailySummary);
      toast({ title: "Cartera Actualizada", description: "Se han cargado los datos más recientes." });
    } catch (error) {
      console.error("Error fetching gestor portfolio:", error);

      // Fallback a local en caso de error de red
      const offlineCredits = await getOfflineCredits();
      if (offlineCredits.length > 0) {
        const portfolio = offlineCredits.map(c => ({
          ...c,
          details: calculateCreditStatusDetails(c)
        }));
        setCategorizedCredits(categorizeCredits(portfolio));
        toast({ title: "Usando Datos Locales", description: "No se pudo conectar al servidor, mostrando datos guardados." });
      } else {
        toast({ title: 'Error', description: 'No se pudo cargar la cartera y no hay datos locales.', variant: 'destructive' });
      }
    } finally {
      setIsLoading(false);
    }
  }, [user, toast, categorizeCredits]);

  const { syncNow, getStatus } = useOfflineSync();
  const [syncInfo, setSyncInfo] = React.useState<{ lastSync: string | null, credits: number } | null>(null);

  React.useEffect(() => {
    getStatus().then(s => setSyncInfo({ lastSync: s.lastSync, credits: s.totalCredits }));
  }, [getStatus]);

  const handleManualSync = async () => {
    setIsLoading(true);
    const result = await syncNow();
    if (result.success) {
      toast({ title: "Sincronización Exitosa", description: "Tus datos están listos para trabajar offline." });
      getStatus().then(s => setSyncInfo({ lastSync: s.lastSync, credits: s.totalCredits }));
      fetchPortfolio();
    } else {
      toast({ title: "Error de Sincronización", description: result.error || "Asegúrate de tener internet para descargar tu cartera.", variant: "destructive" });
    }
    setIsLoading(false);
  };

  const handleSelectCreditForPayment = async (credit: CreditDetail) => {
    if (!credit || !credit.id) return;

    // Feedback inmediato para el usuario
    const loadingToast = toast({ title: "Cargando información...", description: "Obteniendo detalles del crédito." });

    try {
      const fullCreditDetails = await getCredit(credit.id);

      loadingToast.dismiss(); // Cerrar toast de carga

      if (fullCreditDetails) {
        setSelectedCreditForPayment(fullCreditDetails);
        setIsPaymentModalOpen(true);
      } else {
        toast({ title: 'Error', description: 'No se pudo cargar la información completa del crédito. Intente nuevamente.', variant: 'destructive' });
      }
    } catch (error) {
      loadingToast.dismiss();
      console.error("Error loading credit details:", error);
      toast({ title: 'Error', description: 'Fallo de conexión al cargar el crédito.', variant: 'destructive' });
    }
  };

  const handleReprintReceipt = (credit: PortfolioCredit) => {
    const lastPayment = [...(credit.registeredPayments || [])]
      .filter(p => p.status !== 'ANULADO')
      .sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime())[0];

    if (lastPayment) {
      setSelectedCreditForPayment(credit);
      setLastPayment(lastPayment);
      setIsReprintForModal(true);
      setIsReceiptModalOpen(true);
    } else {
      toast({ title: 'Error', description: 'No se encontró el último pago para reimprimir.', variant: 'destructive' });
    }
  };

  const handlePaymentSubmit = async (paymentValues: any) => {
    if (!selectedCreditForPayment || !user) return;

    const newPayment: Omit<RegisteredPayment, 'id'> = {
      paymentDate: nowInNicaragua(),
      amount: paymentValues.amount,
      managedBy: user.fullName,
      transactionNumber: undefined,
      status: 'VALIDO',
      paymentType: paymentValues.paymentType || 'NORMAL',
      notes: paymentValues.notes || '',
    };

    setIsLoading(true);

    try {
      // Verificar conexión usando múltiples fuentes para evitar falsos positivos
      const isReallyOnline = typeof navigator !== 'undefined' ? (navigator.onLine && isOnline) : isOnline;

      if (!isReallyOnline) {
        console.log('📱 Modo offline detectado en Dashboard - guardando pago localmente');
        await savePendingPayment(selectedCreditForPayment.id, newPayment, user.id);
        toast({
          title: "Pago Guardado Offline",
          description: "El abono se sincronizará cuando recuperes conexión.",
          variant: 'default'
        });

        // Generar ID temporal para el recibo offline
        const offlineId = `off-${Date.now()}`;
        setLastPayment({ ...newPayment, id: offlineId });
        setIsReprintForModal(false);
        setIsPaymentModalOpen(false);
        setIsReceiptModalOpen(true);

        fetchPortfolio(); // Refrescar vista local
        return;
      }

      const result = await addPayment(selectedCreditForPayment.id, newPayment, user);
      if (result.success && result.paymentId) {
        toast({ title: "Pago Registrado en el Servidor", description: "El abono ha sido procesado exitosamente.", variant: 'info' });

        setLastPayment({
          ...newPayment,
          id: result.paymentId,
          transactionNumber: result.transactionNumber
        });
        setIsReprintForModal(false);
        setIsPaymentModalOpen(false);
        setIsReceiptModalOpen(true);

        fetchPortfolio(); // Refresh dashboard data
        // No auto-print here. User will click Print in the modal if needed.
      } else {
        throw new Error(result.error || "Error desconocido al registrar el pago.");
      }
    } catch (error: any) {
      console.error("Error al procesar pago en Dashboard:", error);

      // Capturar errores de red que fallaron a pesar del check inicial (Lie-Fi)
      const isNetworkError = error.message && (
        error.message.includes('fetch') ||
        error.message.includes('network') ||
        error.message.includes('Failed to fetch') ||
        error.message.includes('type error')
      );

      if (isNetworkError) {
        await savePendingPayment(selectedCreditForPayment.id, newPayment, user.id);
        toast({
          title: "Pago Guardado (Error de Red)",
          description: "No se pudo conectar al servidor. El abono se guardó localmente.",
          variant: 'destructive'
        });

        const offlineId = `off-err-${Date.now()}`;
        setLastPayment({ ...newPayment, id: offlineId });
        setIsReprintForModal(false);
        setIsPaymentModalOpen(false);
        setIsReceiptModalOpen(true);

        fetchPortfolio();
      } else {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const paymentFormDetails = selectedCreditForPayment ? calculateCreditStatusDetails(selectedCreditForPayment) : null;

  return (
    <>
      <div className="space-y-6">
        {!isOnline && (
          <div className="bg-red-600 text-white p-2 text-center text-xs font-bold animate-pulse rounded-md flex items-center justify-center gap-2">
            <WifiOff className="h-4 w-4" /> MODO OFFLINE ACTIVADO - SIN CONEXIÓN A INTERNET
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setIsSearchOpen(true)}>
            <HandCoins className="mr-2 h-4 w-4" /> Registrar Abono Externo
          </Button>
          <Button variant="outline" onClick={handleManualSync} disabled={isLoading || (typeof window !== 'undefined' && !navigator.onLine)} className="border-blue-500 text-blue-600 hover:bg-blue-50">
            <RefreshCw className={cn("mr-2 h-4 w-4", isLoading && "animate-spin")} />
            Sincronizar Cartera
          </Button>
          <Button variant="outline" onClick={fetchPortfolio} disabled={isLoading}>
            <RefreshCw className={cn("mr-2 h-4 w-4", isLoading && "animate-spin")} />
            Actualizar Vista
          </Button>
        </div>

        {syncInfo?.lastSync && (
          <div className="flex justify-end pr-1">
            <p className="text-[10px] text-muted-foreground italic">
              Última sincronización completa: {new Date(syncInfo.lastSync).toLocaleString()} ({syncInfo.credits} créditos locales)
            </p>
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <BigStatCard title="Recuperado Hoy" value={formatCurrency(dailySummary?.recuperacionTotal ?? 0)} icon={Wallet} color="bg-gradient-to-br from-blue-500 to-cyan-500" />
          <BigStatCard title="Clientes Atendidos" value={dailySummary?.totalClientesCobrados ?? 0} icon={Users} color="bg-gradient-to-br from-green-500 to-emerald-500" />
          <BigStatCard title="Meta de Cobro" value={formatCurrency(dailySummary?.metaDeCobro ?? 0)} icon={Target} color="bg-gradient-to-br from-orange-500 to-amber-500" />
          <BigStatCard title="Renovaciones" value={dailySummary?.pendingRenewals ?? 0} icon={HandCoins} color="bg-gradient-to-br from-violet-500 to-purple-500" />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Cartera de Cobros Asignada</CardTitle>
            <CardDescription>
              Toca sobre un cliente para registrar un abono rápido.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="dueToday">
              <div className="overflow-x-auto pb-2">
                <TabsList className="grid w-full grid-cols-5 min-w-[700px] md:min-w-0">
                  <TabsTrigger value="paidToday">
                    <CheckCircle className="mr-2 h-4 w-4" /> Cobrado Hoy ({categorizedCredits.paidToday.length})
                  </TabsTrigger>
                  <TabsTrigger value="dueToday">
                    <CalendarClock className="mr-2 h-4 w-4" /> Cuota del Día ({categorizedCredits.dueToday.length})
                  </TabsTrigger>
                  <TabsTrigger value="overdue">
                    <AlertTriangle className="mr-2 h-4 w-4" /> En Mora ({categorizedCredits.overdue.length})
                  </TabsTrigger>
                  <TabsTrigger value="expired">
                    <Ban className="mr-2 h-4 w-4" /> Vencidos ({categorizedCredits.expired.length})
                  </TabsTrigger>
                  <TabsTrigger value="upToDate">
                    <ShieldCheck className="mr-2 h-4 w-4" /> Al Día ({categorizedCredits.upToDate.length})
                  </TabsTrigger>
                </TabsList>
              </div>
              <TabsContent value="paidToday" className="mt-4">
                <CreditCategoryTable
                  credits={categorizedCredits.paidToday}
                  statusKey="paidToday"
                  onSelectCredit={handleSelectCreditForPayment}
                  onReprintReceipt={handleReprintReceipt}
                />
              </TabsContent>
              <TabsContent value="dueToday" className="mt-4">
                <CreditCategoryTable
                  credits={categorizedCredits.dueToday}
                  statusKey="dueToday"
                  onSelectCredit={handleSelectCreditForPayment}
                  onReprintReceipt={handleReprintReceipt}
                />
              </TabsContent>
              <TabsContent value="overdue" className="mt-4">
                <CreditCategoryTable
                  credits={categorizedCredits.overdue}
                  statusKey="overdue"
                  onSelectCredit={handleSelectCreditForPayment}
                  onReprintReceipt={handleReprintReceipt}
                />
              </TabsContent>
              <TabsContent value="expired" className="mt-4">
                <CreditCategoryTable
                  credits={categorizedCredits.expired}
                  statusKey="expired"
                  onSelectCredit={handleSelectCreditForPayment}
                  onReprintReceipt={handleReprintReceipt}
                />
              </TabsContent>
              <TabsContent value="upToDate" className="mt-4">
                <CreditCategoryTable
                  credits={categorizedCredits.upToDate}
                  statusKey="upToDate"
                  onSelectCredit={handleSelectCreditForPayment}
                  onReprintReceipt={handleReprintReceipt}
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {selectedCreditForPayment && paymentFormDetails && (
        <PaymentForm
          isOpen={isPaymentModalOpen}
          onClose={() => setIsPaymentModalOpen(false)}
          onSubmit={handlePaymentSubmit}
          creditBalance={paymentFormDetails.remainingBalance}
          dueTodayAmount={paymentFormDetails.dueTodayAmount}
          paidToday={paymentFormDetails.paidToday}
          overdueAmount={paymentFormDetails.overdueAmount}
          lateFee={paymentFormDetails.currentLateFee}
          lateDays={paymentFormDetails.lateDays}
          clientName={selectedCreditForPayment.clientName}
          clientId={selectedCreditForPayment.clientId}
        />
      )}

      {lastPayment && selectedCreditForPayment && (
        <ReceiptPreview
          isOpen={isReceiptModalOpen}
          onClose={() => {
            setIsReceiptModalOpen(false);
            setLastPayment(null);
          }}
          credit={selectedCreditForPayment}
          payment={lastPayment}
          isOffline={typeof lastPayment.id === 'string' && lastPayment.id.startsWith('off-')}
          isReprint={isReprintForModal}
          // onPrint removed to use internal modal printing only
          userBranch={user.sucursalName || user.sucursal}
        />
      )}

      <CreditSearchDialog
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        mode="credit"
        onSelectCreditForPayment={handleSelectCreditForPayment}
      />
    </>
  );
}
