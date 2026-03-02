

'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import { ReportHeader } from '@/app/reports/components/ReportHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Loader2, Printer } from 'lucide-react';
import { getClient } from '@/services/client-service';
import { getCredit, getClientCredits } from '@/services/credit-service';
import type { Client, CreditDetail, ProcessedStatementPayment } from '@/lib/types';
import { generateFullStatement, FullStatement, calculateAveragePaymentDelay, formatDate as formatDateUtil } from '@/lib/utils';
import { parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Separator } from '@/components/ui/separator';
import { AppLogo } from '@/components/AppLogo';

const formatCurrency = (amount?: number) => {
    if (typeof amount !== 'number' || isNaN(amount)) return 'C$0.00';
    return `C$${amount.toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatNumber = (amount?: number) => {
    if (typeof amount !== 'number' || isNaN(amount)) return '0.00';
    return amount.toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const DetailRow = ({ label, value }: { label: string, value?: string | number | null }) => (
    <div className="flex justify-between items-center text-[10px] py-0.5">
        <span className="text-gray-700">{label}</span>
        <span className="font-semibold text-primary">{value ?? 'N/A'}</span>
    </div>
);


function AccountStatementContent() {
    const searchParams = useSearchParams();
    const [client, setClient] = React.useState<Client | null>(null);
    const [credit, setCredit] = React.useState<CreditDetail | null>(null);
    const [statement, setStatement] = React.useState<FullStatement | null>(null);
    const [isLoading, setIsLoading] = React.useState(true);
    const [promedioDias, setPromedioDias] = React.useState<number | null>(null);

    React.useEffect(() => {
        const creditId = searchParams.get('creditId');
        const clientId = searchParams.get('clientId');

        if (!creditId && !clientId) {
            setIsLoading(false);
            return;
        }

        const fetchData = async () => {
            setIsLoading(true);
            try {
                let creditData: CreditDetail | null = null;
                if (creditId) {
                    creditData = await getCredit(creditId);
                } else if (clientId) {
                    // This logic can be improved. For now, it fetches the first active/paid credit.
                    const clientCredits = await getClientCredits(clientId);
                    const firstCredit = clientCredits.find(c => c.status === 'Active' || c.status === 'Paid');
                    if (firstCredit) {
                        creditData = await getCredit(firstCredit.id);
                    }
                }

                if (creditData) {
                    const clientData = await getClient(creditData.clientId);
                    setCredit(creditData);
                    setClient(clientData);
                    setStatement(generateFullStatement(creditData));
                    const { avgLateDaysForCredit } = calculateAveragePaymentDelay(creditData);
                    setPromedioDias(avgLateDaysForCredit);
                }

            } catch (error) {
                console.error("Error fetching account statement data:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [searchParams]);

    const totalsPlan = statement?.totals.plan;
    const totalsAbonos = statement?.totals.abonos;

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
                <p className="ml-2">Generando estado de cuenta...</p>
            </div>
        );
    }

    if (!client || !credit) {
        return (
            <div className="flex h-screen items-center justify-center p-4">
                <div className="text-center text-muted-foreground">Cliente o crédito no encontrado.</div>
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 print-container bg-white text-black">
            <div className="report-container mx-auto space-y-4">
                <header className="relative flex justify-center items-center mb-4 text-center">
                    <div className="absolute left-0 top-0">
                        <AppLogo />
                    </div>
                    <div>
                        <h1 className="text-[12px] font-bold">Reporte Estado de Cuenta</h1>
                        <p className="text-[12px]">León, Nicaragua</p>
                    </div>
                    <div className="absolute right-0 top-0 no-print">
                        <Button onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" /> Imprimir</Button>
                    </div>
                </header>

                <div className="grid grid-cols-2 gap-x-8 text-[10px] mb-4">
                    <div className="space-y-1">
                        <DetailRow label="Nombre del cliente:" value={client.name} />
                        <DetailRow label="Monto entregado:" value={formatCurrency(credit.amount)} />
                        <DetailRow label="Fecha de entrega:" value={formatDateUtil(credit.deliveryDate)} />
                    </div>
                    <div className="space-y-1">
                        <DetailRow label="Tasa de interés:" value={`${credit.interestRate}%`} />
                        <DetailRow label="Código de crédito:" value={`#${credit.creditNumber}`} />
                        <DetailRow label="Fecha de vencimiento:" value={formatDateUtil(credit.dueDate)} />
                        <DetailRow label="Promedio días crédito:" value={typeof promedioDias === 'number' ? promedioDias.toFixed(2) : 'N/A'} />
                        <DetailRow label="Gestor:" value={credit.collectionsManager} />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-x-8">
                    <div className="break-inside-avoid">
                        <h3 className="font-semibold text-[10px] mb-2">Plan de pagos</h3>
                        <div className="overflow-x-auto">
                            <Table className="report-table-condensed">
                                <TableHeader><TableRow><TableHead>#</TableHead><TableHead>Fecha</TableHead><TableHead>Cuota</TableHead><TableHead>Días</TableHead><TableHead>Mora</TableHead><TableHead>Pagado</TableHead><TableHead>Saldo</TableHead></TableRow></TableHeader>
                                <TableBody>
                                    {statement?.installments.map(i => (
                                        <TableRow key={i.paymentNumber}>
                                            <TableCell>{i.paymentNumber}</TableCell>
                                            <TableCell>{formatDateUtil(i.paymentDate)}</TableCell>
                                            <TableCell>{formatNumber(i.amount)}</TableCell>
                                            <TableCell>{i.lateDays}</TableCell>
                                            <TableCell>{formatNumber(i.lateFee)}</TableCell>
                                            <TableCell>{formatNumber(i.paidAmount)}</TableCell>
                                            <TableCell>{formatNumber(i.balance)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                                <TableFooter>
                                    <TableRow className="font-bold">
                                        <TableCell colSpan={2}>Totales</TableCell>
                                        <TableCell>{formatNumber(totalsPlan?.cuota)}</TableCell>
                                        <TableCell></TableCell>
                                        <TableCell>{formatNumber(totalsPlan?.mora)}</TableCell>
                                        <TableCell>{formatNumber(totalsPlan?.pagado)}</TableCell>
                                        <TableCell>{formatNumber(totalsPlan?.saldo)}</TableCell>
                                    </TableRow>
                                </TableFooter>
                            </Table>
                        </div>
                    </div>
                    <div className="break-inside-avoid">
                        <h3 className="font-semibold text-[10px] mb-2">Abonos del cliente</h3>
                        <div className="overflow-x-auto">
                            <Table className="report-table-condensed">
                                <TableHeader><TableRow><TableHead># Transacción</TableHead><TableHead>Fecha Pago</TableHead><TableHead>C. Principal</TableHead><TableHead>Interes</TableHead><TableHead>Total</TableHead></TableRow></TableHeader>
                                <TableBody>
                                    {statement?.payments.map(p => (
                                        <TableRow key={p.id}>
                                            <TableCell>{p.transactionNumber}</TableCell>
                                            <TableCell>{formatDateUtil(p.paymentDate, 'dd/MM/yy HH:mm')}</TableCell>
                                            <TableCell>{formatNumber(p.principalApplied)}</TableCell>
                                            <TableCell>{formatNumber(p.interestApplied)}</TableCell>
                                            <TableCell>{formatNumber(p.amount)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                                <TableFooter>
                                    <TableRow className="font-bold">
                                        <TableCell colSpan={2}>Totales</TableCell>
                                        <TableCell>{formatNumber(totalsAbonos?.capital)}</TableCell>
                                        <TableCell>{formatNumber(totalsAbonos?.interes)}</TableCell>
                                        <TableCell>{formatNumber(totalsAbonos?.total)}</TableCell>
                                    </TableRow>
                                </TableFooter>
                            </Table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function AccountStatementPage() {
    return (
        <React.Suspense fallback={
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
                <p className="ml-2">Cargando reporte...</p>
            </div>
        }>
            <AccountStatementContent />
        </React.Suspense>
    );
}

