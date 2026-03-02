
'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import { ReportHeader } from '@/app/reports/components/ReportHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Printer } from 'lucide-react';
import type { ExpiredCreditItem } from '@/services/report-service';
import { generateExpiredCreditsReport } from '@/services/report-service';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';


const formatCurrency = (amount?: number | null) => {
  if (typeof amount !== 'number' || isNaN(amount)) return 'C$0.00';
  return `C$${amount.toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatDate = (dateString?: string | null) => {
  if (!dateString) return 'N/A';
  try {
    const dateToFormat = /^\d{4}-\d{2}-\d{2}$/.test(dateString) ? dateString + 'T12:00:00' : dateString;
    return format(parseISO(dateToFormat), 'dd/MM/yyyy');
  } catch {
    return 'Fecha Inválida';
  }
};

const formatNumber = (num?: number | null) => (typeof num === 'number' && !isNaN(num)) ? num.toFixed(2) : '0.00';

function ExpiredCreditsReportContent() {
  const searchParams = useSearchParams();
  const [reportData, setReportData] = React.useState<ExpiredCreditItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [dateFrom, setDateFrom] = React.useState<string | null>(null);
  const [dateTo, setDateTo] = React.useState<string | null>(null);

  React.useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      const filters = {
        sucursales: searchParams.getAll('sucursal'),
        users: searchParams.getAll('user'),
        dateFrom: searchParams.get('from') || undefined,
        dateTo: searchParams.get('to') || undefined,
      };
      setDateFrom(filters.dateFrom || null);
      setDateTo(filters.dateTo || null);

      try {
        const data = await generateExpiredCreditsReport(filters);
        setReportData(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Error fetching report:", error);
        setReportData([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [searchParams]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="ml-2">Generando reporte de vencimientos...</p>
      </div>
    );
  }

  const groupedData = reportData.reduce((acc, item) => {
    const key = `${item.sucursalName}#${item.gestorName}`;
    if (!acc[key]) {
      acc[key] = {
        sucursal: item.sucursalName,
        gestor: item.gestorName,
        credits: [],
        totalEntregado: 0,
        totalAtraso: 0,
        totalPendiente: 0,
        totalSaldos: 0,
      };
    }
    acc[key].credits.push(item);
    acc[key].totalEntregado += item.disbursedAmount;
    acc[key].totalAtraso += item.overdueAmount;
    acc[key].totalPendiente += item.pendingBalance;
    acc[key].totalSaldos += item.totalBalance;
    return acc;
  }, {} as Record<string, any>);

  const grandTotals = {
    entregado: reportData.reduce((sum, item) => sum + item.disbursedAmount, 0),
    atraso: reportData.reduce((sum, item) => sum + item.overdueAmount, 0),
    pendiente: reportData.reduce((sum, item) => sum + item.pendingBalance, 0),
    saldos: reportData.reduce((sum, item) => sum + item.totalBalance, 0),
  };

  return (
    <div className="p-4 sm:p-6 print-container bg-white text-black">
      <div className="report-container mx-auto">
        <ReportHeader title="Reporte de Vencimiento" dateFrom={dateFrom} dateTo={dateTo} />
        <div className="flex justify-end mb-4 no-print">
          <Button onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" /> Imprimir</Button>
        </div>

        {Object.values(groupedData).length > 0 ? (
          Object.values(groupedData).map((group) => (
            <div key={`${group.sucursal}-${group.gestor}`} className="mb-8 break-inside-avoid">
              <h2 className="font-semibold text-[11px]">SUC: {group.sucursal}</h2>
              <h4 className="font-semibold text-[11px] mb-2">GESTOR: {group.gestor}</h4>
              <Table className="report-table-condensed">
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre del Cliente</TableHead>
                    <TableHead>Teléfono</TableHead>
                    <TableHead className="text-right">Mnt. Entregado</TableHead>
                    <TableHead>Fecha Entrega</TableHead>
                    <TableHead>Vencimiento</TableHead>
                    <TableHead>Último Abono</TableHead>
                    <TableHead className="text-right">Atraso</TableHead>
                    <TableHead className="text-right">Saldo Pend.</TableHead>
                    <TableHead className="text-right">Saldo Total</TableHead>
                    <TableHead className="text-right">P.Crédito</TableHead>
                    <TableHead className="text-right">P.Cliente</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {group.credits.map((item: ExpiredCreditItem) => (
                    <TableRow key={item.creditId}>
                      <TableCell>{item.clientName}</TableCell>
                      <TableCell>{item.clientPhone}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.disbursedAmount)}</TableCell>
                      <TableCell>{formatDate(item.deliveryDate)}</TableCell>
                      <TableCell>{formatDate(item.dueDate)}</TableCell>
                      <TableCell>{formatDate(item.lastPaymentDate)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.overdueAmount)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.pendingBalance)}</TableCell>
                      <TableCell className="text-right font-bold">{formatCurrency(item.totalBalance)}</TableCell>
                      <TableCell className="text-right">{formatNumber(item.avgLateDaysForCredit)}</TableCell>
                      <TableCell className="text-right">{formatNumber(item.globalAvgLateDays)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="font-bold bg-muted/50">
                    <TableCell colSpan={2}>{group.credits.length} Crédito(s)</TableCell>
                    <TableCell className="text-right">{formatCurrency(group.totalEntregado)}</TableCell>
                    <TableCell colSpan={3}></TableCell>
                    <TableCell className="text-right">{formatCurrency(group.totalAtraso)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(group.totalPendiente)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(group.totalSaldos)}</TableCell>
                    <TableCell colSpan={2}></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          ))
        ) : (
          <div className="text-center py-10 text-muted-foreground">
            No se encontraron créditos con vencimiento en las fechas seleccionadas.
          </div>
        )}

        <div className="mt-8">
          <h3 className="font-bold text-[11px] mb-4 text-center">Montos Totales de las Sucursales</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center p-4 border rounded-md">
            <div>
              <p className="text-muted-foreground text-xs">Total Clientes</p>
              <p className="font-bold text-lg">{reportData.length}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Total Monto Entregado</p>
              <p className="font-bold text-lg">{formatCurrency(grandTotals.entregado)}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Total Atrasos</p>
              <p className="font-bold text-lg">{formatCurrency(grandTotals.atraso)}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Total Pendiente</p>
              <p className="font-bold text-lg">{formatCurrency(grandTotals.pendiente)}</p>
            </div>
            <div className="md:col-span-4 mt-4">
              <p className="text-muted-foreground">GRAN TOTAL SALDOS</p>
              <p className="font-bold text-xl text-primary">{formatCurrency(grandTotals.saldos)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ExpiredCreditsReportPage() {
  return (
    <React.Suspense fallback={
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="ml-2">Cargando reporte...</p>
      </div>
    }>
      <ExpiredCreditsReportContent />
    </React.Suspense>
  );
}
