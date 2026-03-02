
'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import { ReportHeader } from '@/app/reports/components/ReportHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Printer } from 'lucide-react';
import type { NonRenewedCreditItem } from '@/services/report-service';
import { generateNonRenewedReport } from '@/services/report-service';
import { format, parseISO, isValid } from 'date-fns';
import { es } from 'date-fns/locale';

const formatCurrency = (amount: number) => `C$ ${amount.toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const formatDate = (dateString?: string | Date) => {
  if (!dateString) return 'N/A';
  try {
    const date = typeof dateString === 'string' ? parseISO(dateString) : dateString;
    if (!isValid(date)) return 'Fecha Inválida';
    return format(date, 'dd-MM-yyyy');
  } catch {
    return 'Fecha Inválida';
  }
};

function NonRenewedReportContent() {
  const searchParams = useSearchParams();
  const [reportData, setReportData] = React.useState<NonRenewedCreditItem[]>([]);
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

      const data = await generateNonRenewedReport(filters);
      setReportData(data);
      setIsLoading(false);
    };
    fetchData();
  }, [searchParams]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="ml-2">Generando reporte...</p>
      </div>
    );
  }

  const groupedByGestor = reportData.reduce((acc, item) => {
    const gestor = item.gestorName || 'Sin Gestor';
    if (!acc[gestor]) {
      acc[gestor] = [];
    }
    acc[gestor].push(item);
    return acc;
  }, {} as Record<string, NonRenewedCreditItem[]>);

  const grandTotalClients = new Set(reportData.map(c => c.clientCode)).size;
  const grandTotalCredits = reportData.length;
  const grandTotalDesembolsos = reportData.reduce((sum, c) => sum + c.amount, 0);
  const grandTotalMontoTotal = reportData.reduce((sum, c) => sum + c.totalAmount, 0);


  return (
    <div className="p-4 sm:p-6 print-container bg-white text-black">
      <div className="report-container mx-auto">
        <ReportHeader title="Listado de créditos no renovados" dateFrom={dateFrom} dateTo={dateTo} />
        <div className="flex justify-end mb-4 no-print">
          <Button onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" /> Imprimir</Button>
        </div>
        <div className="space-y-8">
          {Object.entries(groupedByGestor).map(([gestor, credits]) => {
            return (
              <div key={gestor} className="break-inside-avoid">
                <h3 className="font-bold text-sm mb-2 uppercase">{gestor}</h3>
                <Table className="report-table-condensed">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Nombre del Cliente</TableHead>
                      <TableHead>Crédito</TableHead>
                      <TableHead>Moneda</TableHead>
                      <TableHead>Desembolso</TableHead>
                      <TableHead>Monto Total</TableHead>
                      <TableHead>Int Cnt</TableHead>
                      <TableHead>Periodicidad</TableHead>
                      <TableHead>Plazo</TableHead>
                      <TableHead>Fecha Pago</TableHead>
                      <TableHead>Vence</TableHead>
                      <TableHead>P.D Mora</TableHead>
                      <TableHead>P.D Global</TableHead>
                      <TableHead>Gestor asignado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {credits.map(item => (
                      <TableRow key={item.creditId}>
                        <TableCell>{item.clientCode}</TableCell>
                        <TableCell>{item.clientName}</TableCell>
                        <TableCell>{item.creditNumber}</TableCell>
                        <TableCell>{item.currencyType}</TableCell>
                        <TableCell>{item.amount.toFixed(2)}</TableCell>
                        <TableCell>{item.totalAmount.toFixed(2)}</TableCell>
                        <TableCell>{item.interestRate.toFixed(2)}</TableCell>
                        <TableCell>{item.paymentFrequency}</TableCell>
                        <TableCell>{item.termMonths}</TableCell>
                        <TableCell>{formatDate(item.cancellationDate)}</TableCell>
                        <TableCell>{formatDate(item.dueDate)}</TableCell>
                        <TableCell>{item.avgLateDaysMora?.toFixed(2) ?? '0.00'}</TableCell>
                        <TableCell>{item.avgLateDaysGlobal?.toFixed(2) ?? '0.00'}</TableCell>
                        <TableCell>{item.gestorName !== gestor ? item.gestorName : ''}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )
          })}
          {Object.keys(groupedByGestor).length === 0 && (
            <div className="text-center py-10 text-muted-foreground">
              <p>No se encontraron clientes cancelados y no renovados con los filtros seleccionados.</p>
            </div>
          )}
        </div>

        {reportData.length > 0 && (
          <div className="mt-8 break-inside-avoid">
            <h3 className="font-bold text-sm mb-4 text-center">Montos Totales Globales</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center p-4 border rounded-md">
              <div>
                <p className="text-muted-foreground text-xs">Total de Clientes:</p>
                <p className="font-bold text-lg">{grandTotalClients}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Total de Créditos:</p>
                <p className="font-bold text-lg">{grandTotalCredits}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Total Desembolsado:</p>
                <p className="font-bold text-lg">{formatCurrency(grandTotalDesembolsos)}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Total Monto (C+I):</p>
                <p className="font-bold text-lg">{formatCurrency(grandTotalMontoTotal)}</p>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default function NonRenewedReportPage() {
  return (
    <React.Suspense fallback={
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="ml-2">Cargando reporte...</p>
      </div>
    }>
      <NonRenewedReportContent />
    </React.Suspense>
  );
}
