
'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Loader2, DollarSign, Wallet, Calendar as CalendarIcon, HandCoins, Eye, Settings } from 'lucide-react';
import type { AppUser, Sucursal, CreditDetail, RegisteredPayment, PortfolioCredit } from '@/lib/types';
import { generateColocacionVsRecuperacionReport, type ColocacionRecuperacionItem } from '@/services/report-service';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { nowInNicaragua } from '@/lib/date-utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { CreditSearchDialog } from './CreditSearchDialog';
import { getCredit } from '@/services/credit-service';
import { PaymentForm } from '@/app/credits/components/PaymentForm';
import { useToast } from '@/hooks/use-toast';
import { addPayment } from '@/app/credits/actions';
import { calculateCreditStatusDetails } from '@/lib/utils';
import { printDocument } from '@/services/printer-service';
import { getUsers } from '@/services/user-service-client';
import { getPortfolioForGestor, type GestorDashboardData } from '@/services/portfolio-service';
import { GestorDashboard } from './GestorDashboard';
import { ReceiptPreview } from '@/app/credits/components/ReceiptPreview';

const formatCurrency = (amount: number = 0) => {
    return `C$${amount.toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
        return format(parseISO(dateString), "dd/MM/yyyy, h:mm a", { locale: es });
    } catch (e) {
        return 'Fecha inválida';
    }
};

const BigStatCard = ({ title, value, icon: Icon, color }: { title: string, value: string, icon: React.ElementType, color: string }) => (
    <Card className={cn("text-white transition-all hover:shadow-xl hover:-translate-y-1", color)}>
        <CardContent className="pt-6 text-center space-y-2">
            <Icon className="h-10 w-10 mx-auto opacity-80" />
            <p className="text-sm font-medium uppercase tracking-wider">{title}</p>
            <p className="text-4xl font-bold">{value}</p>
        </CardContent>
    </Card>
);

export function GlobalDashboard({ user, initialSucursales, initialReportData }: { user: AppUser, initialSucursales: Sucursal[], initialReportData: ColocacionRecuperacionItem[] }) {
    const { toast } = useToast();
    const [sucursales] = React.useState<Sucursal[]>(initialSucursales);
    const [reportData, setReportData] = React.useState<ColocacionRecuperacionItem[]>(initialReportData);
    const [gestores, setGestores] = React.useState<AppUser[]>([]);

    const isGlobalAdmin = user.role === 'ADMINISTRADOR' || user.role === 'FINANZAS';
    const isManager = ['GERENTE'].includes(user.role);

    const initialSucursal = !isGlobalAdmin && user.sucursal ? user.sucursal : 'all';
    const [selectedSucursal, setSelectedSucursal] = React.useState(initialSucursal);
    const [selectedGestorId, setSelectedGestorId] = React.useState<string>('all');

    const [dateFrom, setDateFrom] = React.useState<Date | undefined>(() => new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Managua' })));
    const [dateTo, setDateTo] = React.useState<Date | undefined>(() => new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Managua' })));

    const [isLoading, setIsLoading] = React.useState(false);
    const [today, setToday] = React.useState(new Date());

    const [isSearchOpen, setIsSearchOpen] = React.useState(false);
    const [selectedCreditForPayment, setSelectedCreditForPayment] = React.useState<CreditDetail | null>(null);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = React.useState(false);
    const [isReceiptModalOpen, setIsReceiptModalOpen] = React.useState(false);
    const [lastPayment, setLastPayment] = React.useState<any>(null);
    const [isReprintForModal, setIsReprintForModal] = React.useState(false);

    const canRegisterManualPayment = ['ADMINISTRADOR', 'GERENTE', 'OPERATIVO'].includes(user.role);

    // --- State for Gestor View ---
    const [gestorPortfolio, setGestorPortfolio] = React.useState<PortfolioCredit[] | null>(null);
    const [gestorSummary, setGestorSummary] = React.useState<GestorDashboardData | null>(null);
    const [gestorDataUser, setGestorDataUser] = React.useState<AppUser | null>(null);


    React.useEffect(() => {
        const fetchGestores = async () => {
            const allUsers = await getUsers();
            const gestorUsers = allUsers.filter(u => u.role === 'GESTOR');

            if (isManager && user.sucursal) {
                setGestores(gestorUsers.filter(g => g.sucursal === user.sucursal));
            } else if (isGlobalAdmin) {
                setGestores(gestorUsers);
            }
        };
        fetchGestores();
    }, [isGlobalAdmin, isManager, user.sucursal]);

    const fetchGlobalData = React.useCallback(async () => {
        setIsLoading(true);
        setGestorPortfolio(null); // Clear gestor view

        let sucursalesFilter: string[] = [];
        if (selectedSucursal !== 'all') {
            sucursalesFilter = [selectedSucursal];
        } else if (!isGlobalAdmin) {
            sucursalesFilter = [user.sucursal || ''];
        }

        try {
            const data = await generateColocacionVsRecuperacionReport({
                sucursales: sucursalesFilter,
                dateFrom: dateFrom ? format(dateFrom, 'yyyy-MM-dd') : undefined,
                dateTo: dateTo ? format(dateTo, 'yyyy-MM-dd') : undefined,
            });
            setReportData(data.sort((a, b) => b.recuperacion - a.recuperacion));
        } catch (error) {
            console.error("Error fetching dashboard data:", error);
            toast({ title: "Error", description: "No se pudieron cargar los datos del panel.", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    }, [selectedSucursal, dateFrom, dateTo, toast, isGlobalAdmin, user.sucursal]);

    const fetchGestorData = React.useCallback(async (gestorId: string) => {
        setIsLoading(true);
        const gestor = gestores.find(g => g.id === gestorId);
        if (!gestor) {
            setIsLoading(false);
            return;
        }
        setGestorDataUser(gestor);
        try {
            const { portfolio, dailySummary } = await getPortfolioForGestor(gestorId);
            setGestorPortfolio(portfolio);
            setGestorSummary(dailySummary);
        } catch (error) {
            toast({ title: 'Error', description: 'No se pudo cargar la cartera del gestor.', variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    }, [gestores, toast]);

    React.useEffect(() => {
        if (selectedGestorId === 'all') {
            fetchGlobalData();
        } else {
            fetchGestorData(selectedGestorId);
        }
    }, [selectedGestorId, fetchGlobalData, fetchGestorData]);

    React.useEffect(() => {
        const nicaraguaDate = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Managua' }));
        setToday(nicaraguaDate);
    }, []);

    const handleSelectCreditForPayment = async (credit: CreditDetail) => {
        if (!credit || !credit.id) return;
        const fullCreditDetails = await getCredit(credit.id);
        if (fullCreditDetails) {
            setSelectedCreditForPayment(fullCreditDetails);
            setIsPaymentModalOpen(true);
        } else {
            toast({ title: 'Error', description: 'No se pudo cargar la información del crédito.', variant: 'destructive' });
        }
    };

    const handlePaymentSubmit = async (paymentValues: any) => {
        if (!selectedCreditForPayment || !user) return;

        const newPayment: Omit<RegisteredPayment, 'id' | 'status'> = {
            paymentDate: nowInNicaragua(),
            amount: paymentValues.amount,
            managedBy: user.fullName,
            transactionNumber: undefined
        };

        try {
            const result = await addPayment(selectedCreditForPayment.id, newPayment, user);
            if (result.success && result.paymentId) {
                toast({ title: "Pago Registrado", description: "El abono ha sido registrado exitosamente.", variant: 'info' });
                setIsPaymentModalOpen(false);

                // Refresh data based on current view
                if (selectedGestorId === 'all') {
                    fetchGlobalData();
                } else {
                    fetchGestorData(selectedGestorId);
                }

                setLastPayment({
                    ...newPayment,
                    id: result.paymentId,
                    transactionNumber: result.transactionNumber
                });
                setIsReprintForModal(false);
                setIsReceiptModalOpen(true);
            } else {
                throw new Error(result.error || "Error desconocido al registrar el pago.");
            }
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        }
    };

    const paymentFormDetails = selectedCreditForPayment ? calculateCreditStatusDetails(selectedCreditForPayment) : null;
    let title = 'Panel de Control';

    if (isGlobalAdmin) {
        title = 'Estadísticas del Día: Global';
    } else if (isManager) {
        const branchName = sucursales.find(s => s.id === user.sucursal)?.name || user.sucursalName;
        title = `Panel de Sucursal: ${branchName}`;
    }

    const todayFormatted = format(today, "EEEE, dd 'de' MMMM 'del' yyyy", { locale: es });
    const totalRecaudado = reportData.reduce((sum, data) => sum + data.recuperacion, 0);
    const totalColocado = reportData.reduce((sum, data) => sum + data.colocacion, 0);
    const totalDesembolsos = reportData.reduce((sum, data) => sum + data.desembolsos, 0);

    return (
        <>
            <div className="space-y-6">
                <div className="flex justify-between items-center flex-wrap gap-4">
                    <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
                    <div className="flex items-center gap-2 flex-wrap">
                        {isGlobalAdmin && (
                            <Select onValueChange={setSelectedSucursal} value={selectedSucursal}>
                                <SelectTrigger className="w-full sm:w-[180px]"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todas las Sucursales</SelectItem>
                                    {sucursales.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        )}
                        {(isGlobalAdmin || isManager) && (
                            <Select onValueChange={setSelectedGestorId} value={selectedGestorId}>
                                <SelectTrigger className="w-full sm:w-[180px]">
                                    <div className="flex items-center gap-2"><Eye className="h-4 w-4 text-muted-foreground" /><SelectValue /></div>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Vista Global</SelectItem>
                                    {gestores.map(g => <SelectItem key={g.id} value={g.id}>{g.fullName}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        )}

                        {selectedGestorId === 'all' && (
                            <>
                                <Popover><PopoverTrigger asChild><Button variant={"outline"} className={cn("w-full sm:w-[200px] justify-start text-left font-normal", !dateFrom && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{dateFrom ? format(dateFrom, 'dd/MM/yy') : <span>Desde</span>}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} /></PopoverContent></Popover>
                                <Popover><PopoverTrigger asChild><Button variant={"outline"} className={cn("w-full sm:w-[200px] justify-start text-left font-normal", !dateTo && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{dateTo ? format(dateTo, 'dd/MM/yy') : <span>Hasta</span>}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={dateTo} onSelect={setDateTo} /></PopoverContent></Popover>
                            </>
                        )}
                        {canRegisterManualPayment && (
                            <div className="flex gap-2">
                                <Button onClick={() => setIsSearchOpen(true)}>
                                    <HandCoins className="mr-2 h-4 w-4" /> Registrar Abono
                                </Button>
                                {isGlobalAdmin && (
                                    <Button variant="secondary" onClick={async () => {
                                        toast({ title: "Sincronizando...", description: "Verificando integridad de datos..." });
                                        try {
                                            const res = await fetch('/api/maintenance/fix-db');
                                            const data = await res.json();
                                            if (data.success) {
                                                toast({ title: "Sistema Sincronizado", description: data.changes?.length ? `Se aplicaron correcciones: ${data.changes.join(', ')}` : "El sistema ya estaba optimizado.", variant: 'default' });
                                            } else {
                                                throw new Error(data.error);
                                            }
                                        } catch (e: any) {
                                            toast({ title: "Error", description: e.message || "Falló la sincronización", variant: "destructive" });
                                        }
                                    }}>
                                        <Settings className="mr-2 h-4 w-4" /> Sincronizar Sistema
                                    </Button>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <p className="text-sm text-muted-foreground capitalize">{todayFormatted}</p>

                {isLoading ? (
                    <div className="flex justify-center items-center h-96">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : gestorPortfolio && gestorDataUser && gestorSummary ? (
                    // --- VISTA DE GESTOR INDIVIDUAL ---
                    <GestorDashboard user={gestorDataUser} initialPortfolio={gestorPortfolio} initialSummary={gestorSummary} />
                ) : (
                    // --- VISTA GLOBAL / SUCURSAL ---
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <BigStatCard
                                title="TOTAL RECAUDADO"
                                value={formatCurrency(totalRecaudado)}
                                icon={Wallet}
                                color="bg-gradient-to-br from-blue-500 to-cyan-500"
                            />
                            <BigStatCard
                                title="TOTAL COLOCADO"
                                value={formatCurrency(totalColocado)}
                                icon={DollarSign}
                                color="bg-gradient-to-br from-green-500 to-emerald-500"
                            />
                            <BigStatCard
                                title="# DESEMBOLSOS"
                                value={totalDesembolsos.toString()}
                                icon={Users}
                                color="bg-gradient-to-br from-orange-500 to-amber-500"
                            />
                        </div>

                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Users className="h-5 w-5 text-primary" /> Recaudación por Gestor
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>#</TableHead>
                                            <TableHead>Nombre del Gestor</TableHead>
                                            <TableHead>Última Cuota</TableHead>
                                            <TableHead className="text-right">Córdobas</TableHead>
                                            <TableHead className="text-right">Dólares</TableHead>
                                            <TableHead className="text-right">Total Recaudado</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {reportData.length > 0 ? (
                                            reportData.filter(item => item.recuperacion > 0).map((item, index) => (
                                                <TableRow key={item.userName}>
                                                    <TableCell>{index + 1}</TableCell>
                                                    <TableCell className="font-medium flex items-center gap-2">
                                                        <span className="h-2 w-2 rounded-full bg-green-500"></span>
                                                        {item.userName}
                                                    </TableCell>
                                                    <TableCell>{formatDate(item.ultimaCuota)}</TableCell>
                                                    <TableCell className="text-right">{formatCurrency(item.recuperacion)}</TableCell>
                                                    <TableCell className="text-right">$0.00</TableCell>
                                                    <TableCell className="text-right font-bold text-primary">{formatCurrency(item.recuperacion)}</TableCell>
                                                </TableRow>
                                            ))
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan={6} className="h-24 text-center">
                                                    No hay actividad registrada para los filtros seleccionados.
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </>
                )}
            </div>

            {selectedCreditForPayment && lastPayment && (
                <ReceiptPreview
                    isOpen={isReceiptModalOpen}
                    onClose={() => {
                        setIsReceiptModalOpen(false);
                        setLastPayment(null);
                    }}
                    credit={selectedCreditForPayment}
                    payment={lastPayment}
                    isOffline={false}
                    isReprint={isReprintForModal}
                    userBranch={user.sucursalName || user.sucursal}
                    userRole={user.role}
                />
            )}
            <CreditSearchDialog
                isOpen={isSearchOpen}
                onClose={() => setIsSearchOpen(false)}
                mode="credit"
                onSelectCreditForPayment={handleSelectCreditForPayment}
            />

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
        </>
    );
}
