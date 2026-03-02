
'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import { ReportHeader } from '@/app/reports/components/ReportHeader';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Loader2, Printer } from 'lucide-react';
import type { FutureInstallmentsReportData } from '@/services/report-service';
import { generateFutureInstallmentsReport } from '@/services/report-service';

const formatCurrency = (amount: number) => `C$${amount.toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function FutureInstallmentsReportContent() {
  const searchParams = useSearchParams();
  const [reportData, setReportData] = React.useState<FutureInstallmentsReportData | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [dateFrom, setDateFrom] = React.useState<string | null>(null);
  const [dateTo, setDateTo] = React.useState<string | null>(null);
  const [viewType, setViewType] = React.useState<'summary' | 'detailed'>('detailed');


  React.useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      const filters = {
        sucursales: searchParams.getAll('sucursal'),
        users: searchParams.getAll('user'),
        dateFrom: searchParams.get('from') || undefined,
        dateTo: searchParams.get('to') || undefined,
        viewType: (searchParams.get('viewType') as 'summary' | 'detailed') || 'detailed',
      };
      setDateFrom(filters.dateFrom || null);
      setDateTo(filters.dateTo || null);
      setViewType(filters.viewType);

      const data = await generateFutureInstallmentsReport(filters);
      setReportData(data);
      setIsLoading(false);
    };
    fetchData();
  }, [searchParams]);

  if (isLoading || !reportData) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="ml-2">Generando reporte de proyección...</p>
      </div>
    );
  }

  const renderDetailedView = () => {
    const groupedData = reportData.detailed.reduce((acc, item) => {
      const key = item.gestorName || 'Sin Gestor';
      if (!acc[key]) {
        acc[key] = {
          gestorName: key,
          clients: [],
          totalInstallments: 0,
          totalAmount: 0,
          totalCapital: 0,
          totalInterest: 0,
        };
      }
      acc[key].clients.push(item);
      acc[key].totalInstallments += item.installmentsInRange;
      acc[key].totalAmount += item.totalAmountInRange;
      acc[key].totalCapital += item.capitalInRange;
      acc[key].totalInterest += item.interestInRange;
      return acc;
    }, {} as Record<string, any>);

    const grandTotalInstallments = reportData.detailed.reduce((sum, i) => sum + i.installmentsInRange, 0);
    const grandTotalCapital = reportData.detailed.reduce((sum, i) => sum + i.capitalInRange, 0);
    const grandTotalInterest = reportData.detailed.reduce((sum, i) => sum + i.interestInRange, 0);
    const grandTotalAmount = reportData.detailed.reduce((sum, i) => sum + i.totalAmountInRange, 0);

    return (
      <div className="space-y-6">
        {Object.keys(groupedData).length > 0 ? (
          Object.values(groupedData).map((group) => (
            <div key={group.gestorName} className="break-inside-avoid">
              <h2 className="text-[11px] font-bold uppercase mb-2">GESTOR: {group.gestorName}</h2>
              <Table className="report-table-condensed">
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Crédito No.</TableHead>
                    <TableHead className="text-right">No. Cuotas</TableHead>
                    <TableHead className="text-right">Capital Proyectado</TableHead>
                    <TableHead className="text-right">Interés Proyectado</TableHead>
                    <TableHead className="text-right">Total Proyectado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {group.clients.map((item: any) => (
                    <TableRow key={item.creditId}>
                      <TableCell>{item.clientName}</TableCell>
                      <TableCell>{item.creditNumber}</TableCell>
                      <TableCell className="text-right">{item.installmentsInRange}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.capitalInRange)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.interestInRange)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.totalAmountInRange)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow className="font-bold bg-muted/50">
                    <TableCell colSpan={2}>Subtotal Gestor</TableCell>
                    <TableCell className="text-right">{group.totalInstallments}</TableCell>
                    <TableCell className="text-right">{formatCurrency(group.totalCapital)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(group.totalInterest)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(group.totalAmount)}</TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </div>
          ))
        ) : (
          <div className="text-center py-10 text-muted-foreground">
            No se encontraron cuotas proyectadas para los filtros seleccionados.
          </div>
        )}
        {reportData.detailed.length > 0 && (
          <div className="mt-8 pt-4 border-t-2">
            <h3 className="font-bold text-sm mb-2 text-center">GRAN TOTAL PROYECTADO</h3>
            <Table className="report-table-condensed">
              <TableFooter>
                <TableRow className="font-bold text-base bg-blue-100 hover:bg-blue-100">
                  <TableCell colSpan={2}></TableCell>
                  <TableCell className="text-right">{grandTotalInstallments}</TableCell>
                  <TableCell className="text-right">{formatCurrency(grandTotalCapital)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(grandTotalInterest)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(grandTotalAmount)}</TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        )}
      </div>
    );
  };

  const renderSummaryView = () => {
    const grandTotalCredits = reportData.summary.reduce((sum, item) => sum + item.creditCount, 0);
    const grandTotalAmount = reportData.summary.reduce((sum, item) => sum + item.totalAmount, 0);

    return (
      <Table className="report-table-condensed">
        <TableHeader>
          <TableRow>
            <TableHead>Usuario</TableHead>
            <TableHead># Créditos</TableHead>
            <TableHead className="text-right">Monto Proyectado</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {reportData.summary.map(item => (
            <TableRow key={item.gestorName}>
              <TableCell>{item.gestorName}</TableCell>
              <TableCell>{item.creditCount}</TableCell>
              <TableCell className="text-right">{formatCurrency(item.totalAmount)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
        <TableFooter>
          <TableRow className="font-bold bg-muted/50">
            <TableCell>TOTAL GENERAL</TableCell>
            <TableCell>{grandTotalCredits}</TableCell>
            <TableCell className="text-right">{formatCurrency(grandTotalAmount)}</TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    );
  };

  return (
    <div className="p-4 sm:p-6 print-container bg-white text-black">
      <div className="report-container mx-auto">
        <ReportHeader title="Reporte de Proyección de Cuotas" dateFrom={dateFrom} dateTo={dateTo} />
        <div className="flex justify-end mb-4 no-print">
          <Button onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" /> Imprimir</Button>
        </div>

        {viewType === 'detailed' ? renderDetailedView() : renderSummaryView()}

      </div>
    </div>
  );
}

export default function FutureInstallmentsReportPage() {
  return (
    <React.Suspense fallback={
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="ml-2">Cargando reporte...</p>
      </div>
    }>
      <FutureInstallmentsReportContent />
    </React.Suspense>
  );
}
