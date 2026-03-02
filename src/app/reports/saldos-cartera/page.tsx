
'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import { ReportHeader } from '@/app/reports/components/ReportHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Loader2, Printer, FileSpreadsheet } from 'lucide-react';
import type { SaldosCarteraItem, SaldosCarteraSummaryItem } from '@/services/report-service';
import { generateSaldosCarteraReport, exportSaldosCarteraToExcel } from '@/services/report-service';
import { format } from 'date-fns';

const formatCurrencySymbol = (amount: number) => `C$${amount.toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function SaldosCarteraReportContent() {
  const searchParams = useSearchParams();
  const [reportData, setReportData] = React.useState<{ detailed: SaldosCarteraItem[], summary: SaldosCarteraSummaryItem[] } | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isExporting, setIsExporting] = React.useState(false);
  const [viewType, setViewType] = React.useState<'detailed' | 'summary'>('detailed');


  React.useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      const filters = {
        sucursales: searchParams.getAll('sucursal'),
        users: searchParams.getAll('user'),
        viewType: (searchParams.get('viewType') as any) || 'detailed',
      };
      setViewType(filters.viewType);
      const data = await generateSaldosCarteraReport(filters);
      setReportData(data);
      setIsLoading(false);
    };
    fetchData();
  }, [searchParams]);

  const handleExportToExcel = async () => {
    if (!reportData) return;
    setIsExporting(true);
    try {
      const { base64 } = await exportSaldosCarteraToExcel(reportData.detailed);
      if (base64) {
        const byteCharacters = atob(base64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Saldos_Cartera_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error("Failed to export to Excel:", error);
    } finally {
      setIsExporting(false);
    }
  };


  if (isLoading || !reportData) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="ml-2">Generando reporte de saldos de cartera...</p>
      </div>
    );
  }

  const renderDetailedView = () => {
    const groupedData = reportData.detailed.reduce((acc, item) => {
      const sucursalKey = item.sucursalName;
      const gestorKey = item.gestorName;

      if (!acc[sucursalKey]) {
        acc[sucursalKey] = {
          sucursal: sucursalKey,
          gestores: {}
        };
      }

      if (!acc[sucursalKey].gestores[gestorKey]) {
        acc[sucursalKey].gestores[gestorKey] = {
          gestor: gestorKey,
          credits: [],
          totalSaldoCapital: 0,
          totalSaldoInteres: 0,
          totalCuota: 0,
          totalSaldo: 0,
        }
      }

      acc[sucursalKey].gestores[gestorKey].credits.push(item);
      acc[sucursalKey].gestores[gestorKey].totalSaldoCapital += item.remainingPrincipal;
      acc[sucursalKey].gestores[gestorKey].totalSaldoInteres += item.remainingInterest;
      acc[sucursalKey].gestores[gestorKey].totalCuota += item.installmentAmount;
      acc[sucursalKey].gestores[gestorKey].totalSaldo += item.remainingBalance;

      return acc;
    }, {} as Record<string, { sucursal: string, gestores: Record<string, any> }>);

    const grandTotalClients = reportData.detailed.length;
    const grandTotalSaldoCapital = reportData.detailed.reduce((sum, item) => sum + item.remainingPrincipal, 0);
    const grandTotalSaldoInteres = reportData.detailed.reduce((sum, item) => sum + item.remainingInterest, 0);
    const grandTotalCuota = reportData.detailed.reduce((sum, item) => sum + item.installmentAmount, 0);
    const grandTotalSaldo = reportData.detailed.reduce((sum, item) => sum + item.remainingBalance, 0);

    return (
      <div className="space-y-6">
        {Object.keys(groupedData).length > 0 ? (
          Object.values(groupedData).map((sucursalGroup) => (
            <div key={sucursalGroup.sucursal} className="break-inside-avoid">
              <h2 className="text-[11px] font-bold uppercase mb-1">~~ SUC. {sucursalGroup.sucursal} ~~</h2>
              {Object.values(sucursalGroup.gestores).map((gestorGroup: any) => (
                <div key={gestorGroup.gestor} className="mb-4">
                  <h3 className="text-[11px] font-semibold uppercase mb-2">&gt;&gt; GEST. {gestorGroup.gestor}</h3>
                  <Table className="report-table-condensed">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Código</TableHead>
                        <TableHead>Nombre del Cliente</TableHead>
                        <TableHead>Crédito</TableHead>
                        <TableHead className="text-right">Cuota</TableHead>
                        <TableHead className="text-right">Sal Capital</TableHead>
                        <TableHead className="text-right">Sal Intereses</TableHead>
                        <TableHead className="text-right">Saldo Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {gestorGroup.credits.map((item: SaldosCarteraItem) => (
                        <TableRow key={item.creditId}>
                          <TableCell>{item.clientNumber}</TableCell>
                          <TableCell>{item.clientName}</TableCell>
                          <TableCell>{item.creditNumber}</TableCell>
                          <TableCell className="text-right">{formatCurrencySymbol(item.installmentAmount)}</TableCell>
                          <TableCell className="text-right">{formatCurrencySymbol(item.remainingPrincipal)}</TableCell>
                          <TableCell className="text-right">{formatCurrencySymbol(item.remainingInterest)}</TableCell>
                          <TableCell className="text-right font-bold">{formatCurrencySymbol(item.remainingBalance)}</TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="font-bold bg-gray-100">
                        <TableCell colSpan={2}>TOTAL GEST: &gt;&gt;</TableCell>
                        <TableCell>Clientes: {gestorGroup.credits.length}</TableCell>
                        <TableCell className="text-right">{formatCurrencySymbol(gestorGroup.totalCuota)}</TableCell>
                        <TableCell className="text-right">{formatCurrencySymbol(gestorGroup.totalSaldoCapital)}</TableCell>
                        <TableCell className="text-right">{formatCurrencySymbol(gestorGroup.totalSaldoInteres)}</TableCell>
                        <TableCell className="text-right">{formatCurrencySymbol(gestorGroup.totalSaldo)}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              ))}
            </div>
          ))
        ) : (
          <div className="text-center py-10 text-muted-foreground">
            <p>No se encontraron créditos activos para los filtros seleccionados.</p>
          </div>
        )}
        {Object.keys(groupedData).length > 0 && (
          <div className="mt-8 pt-4 border-t-2 border-dashed">
            <Table className="report-table-condensed">
              <TableFooter>
                <TableRow className="font-bold text-sm bg-blue-100 hover:bg-blue-100">
                  <TableCell>TOTAL GENERAL</TableCell>
                  <TableCell>Clientes: {grandTotalClients}</TableCell>
                  <TableCell>Créditos: {grandTotalClients}</TableCell>
                  <TableCell className="text-right">{formatCurrencySymbol(grandTotalCuota)}</TableCell>
                  <TableCell className="text-right">{formatCurrencySymbol(grandTotalSaldoCapital)}</TableCell>
                  <TableCell className="text-right">{formatCurrencySymbol(grandTotalSaldoInteres)}</TableCell>
                  <TableCell className="text-right">{formatCurrencySymbol(grandTotalSaldo)}</TableCell>
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
    const grandTotalSaldo = reportData.summary.reduce((sum, item) => sum + item.totalBalance, 0);
    const grandTotalCuota = reportData.summary.reduce((sum, item) => sum + item.totalInstallment, 0);

    return (
      <Table className="report-table-condensed">
        <TableHeader>
          <TableRow>
            <TableHead>Usuario</TableHead>
            <TableHead># Créditos</TableHead>
            <TableHead className="text-right">Suma de Cuotas</TableHead>
            <TableHead className="text-right">Saldo de Cartera</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {reportData.summary.map(item => (
            <TableRow key={item.gestorName}>
              <TableCell className="font-medium">{item.gestorName}</TableCell>
              <TableCell>{item.creditCount}</TableCell>
              <TableCell className="text-right">{formatCurrencySymbol(item.totalInstallment)}</TableCell>
              <TableCell className="text-right">{formatCurrencySymbol(item.totalBalance)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
        <TableFooter>
          <TableRow className="font-bold text-sm bg-muted">
            <TableCell>TOTAL GENERAL</TableCell>
            <TableCell>{grandTotalCredits}</TableCell>
            <TableCell className="text-right">{formatCurrencySymbol(grandTotalCuota)}</TableCell>
            <TableCell className="text-right">{formatCurrencySymbol(grandTotalSaldo)}</TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    );
  };


  return (
    <div className="p-4 sm:p-6 print-container bg-white text-black">
      <div className="report-container mx-auto">
        <ReportHeader title={`Reporte Saldos Cartera (${viewType === 'detailed' ? 'Detallado' : 'Resumido'})`} />
        <div className="flex justify-end mb-4 no-print gap-2">
          <Button onClick={handleExportToExcel} variant="outline" disabled={isExporting}>
            {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileSpreadsheet className="mr-2 h-4 w-4" />}
            {isExporting ? 'Exportando...' : 'Exportar a Excel'}
          </Button>
          <Button onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" /> Imprimir</Button>
        </div>
        {viewType === 'detailed' ? renderDetailedView() : renderSummaryView()}
      </div>
    </div>
  );
}

export default function SaldosCarteraReportPage() {
  return (
    <React.Suspense fallback={
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="ml-2">Cargando reporte...</p>
      </div>
    }>
      <SaldosCarteraReportContent />
    </React.Suspense>
  );
}
