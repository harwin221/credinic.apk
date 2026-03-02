
'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import { ReportHeader } from '@/app/reports/components/ReportHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Printer } from 'lucide-react';
import { getClient } from '@/services/client-service';
import type { Client, CreditDetail } from '@/lib/types';
import { generateConsolidatedStatement, type ConsolidatedStatementData } from '@/services/report-service';
import { format } from 'date-fns';
import { parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { translateCreditStatus } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { AppLogo } from '@/components/AppLogo';


const formatCurrency = (amount?: number) => {
    if (typeof amount !== 'number' || isNaN(amount)) return 'C$0.00';
    return `C$${amount.toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatNumber = (amount?: number, decimals = 2) => {
    if (typeof amount !== 'number' || isNaN(amount)) return '0.00';
    return amount.toLocaleString('es-NI', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
};

const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
        const dateToFormat = /^\d{4}-\d{2}-\d{2}$/.test(dateString) ? dateString + 'T12:00:00' : dateString;
        return format(parseISO(dateToFormat), 'dd-MM-yyyy', { locale: es });
    } catch { return 'Fecha Inválida'; }
};

const DetailRow = ({ label, value }: { label: string, value?: string | number | null }) => (
    <div className="flex justify-between items-center text-xs py-0.5">
        <span className="text-gray-700">{label}</span>
        <span className="font-semibold text-primary">{value ?? 'N/A'}</span>
    </div>
);


function ConsolidatedStatementContent() {
    const searchParams = useSearchParams();
    const [reportData, setReportData] = React.useState<ConsolidatedStatementData | null>(null);
    const [isLoading, setIsLoading] = React.useState(true);

    React.useEffect(() => {
        const clientId = searchParams.get('clientId');
        if (!clientId) {
            setIsLoading(false);
            return;
        }

        const fetchData = async () => {
            setIsLoading(true);
            const data = await generateConsolidatedStatement(clientId);
            setReportData(data);
            setIsLoading(false);
        };

        fetchData();
    }, [searchParams]);

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
                <p className="ml-2">Generando estado de cuenta consolidado...</p>
            </div>
        );
    }

    if (!reportData || reportData.credits.length === 0) {
        return (
            <div className="flex h-screen items-center justify-center p-4">
                <div className="text-center text-muted-foreground">No se encontraron datos de créditos para este cliente.</div>
            </div>
        );
    }

    const { client, credits, creditCount, averageCreditAmount, globalAverageLateDays, economicActivity } = reportData;

    return (
        <div className="p-4 sm:p-6 print-container bg-white text-black">
            <div className="report-container mx-auto space-y-4">
                <header className="relative flex justify-center items-center mb-4 text-center">
                    <div className="absolute left-0 top-0">
                        <AppLogo />
                    </div>
                    <div>
                        <h1 className="text-[12px] font-bold">Reporte Estado de Cuenta Consolidado</h1>
                        <p className="text-xs">León, Nicaragua.</p>
                    </div>
                    <div className="absolute right-0 top-0 no-print">
                        <Button onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" /> Imprimir</Button>
                    </div>
                </header>

                <div className="grid grid-cols-3 gap-x-8 text-xs mb-4">
                    <div className="space-y-1">
                        <DetailRow label="NOMBRE DEL CLIENTE:" value={client.name} />
                        <DetailRow label="CRÉDITO PROMEDIO:" value={formatCurrency(averageCreditAmount)} />
                        <DetailRow label="CANTIDAD DE CRÉDITOS:" value={creditCount} />
                    </div>
                    <div className="space-y-1">
                        <DetailRow label="CÓDIGO DEL CLIENTE:" value={client.clientNumber} />
                        <DetailRow label="ACTIVIDAD ECONÓMICA:" value={economicActivity} />
                    </div>
                    <div className="space-y-1">
                        <DetailRow label="PROMEDIO GLOBAL:" value={formatNumber(globalAverageLateDays)} />
                    </div>
                </div>


                <Table className="report-table-condensed">
                    <TableHeader>
                        <TableRow>
                            <TableHead>Crédito #</TableHead>
                            <TableHead>Desembolso</TableHead>
                            <TableHead>T. Interés</TableHead>
                            <TableHead>Plazo</TableHead>
                            <TableHead>Destino</TableHead>
                            <TableHead>Entrega</TableHead>
                            <TableHead>Vencimiento</TableHead>
                            <TableHead>Días Atraso</TableHead>
                            <TableHead>Promedio Días Atraso</TableHead>
                            <TableHead>Gestor asignado</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {credits.map((credit, index) => {
                            // Usar los valores ya calculados en el servidor
                            const totalLateDaysForCredit = credit.totalLateDays;
                            const avgLateDaysForCredit = credit.avgLateDays;
                            return (
                                <TableRow key={credit.id}>
                                    <TableCell>{index + 1}</TableCell>
                                    <TableCell>{formatCurrency(credit.amount)}</TableCell>
                                    <TableCell>{formatNumber(credit.interestRate, 2)}%</TableCell>
                                    <TableCell>{credit.termMonths}</TableCell>
                                    <TableCell>{credit.productDestination}</TableCell>
                                    <TableCell>{formatDate(credit.deliveryDate)}</TableCell>
                                    <TableCell>{formatDate(credit.dueDate)}</TableCell>
                                    <TableCell>{formatNumber(totalLateDaysForCredit, 2)}</TableCell>
                                    <TableCell>{formatNumber(avgLateDaysForCredit, 2)}</TableCell>
                                    <TableCell>{credit.collectionsManager}</TableCell>
                                </TableRow>
                            )
                        })}
                    </TableBody>
                </Table>

            </div>
        </div>
    );
}

export default function ConsolidatedStatementPage() {
    return (
        <React.Suspense fallback={
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
                <p className="ml-2">Cargando reporte...</p>
            </div>
        }>
            <ConsolidatedStatementContent />
        </React.Suspense>
    );
}
