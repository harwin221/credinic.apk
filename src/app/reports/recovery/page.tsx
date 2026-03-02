
'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import { ReportHeader } from '@/app/reports/components/ReportHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Loader2, Printer, FileSpreadsheet, Target } from 'lucide-react';
import type { RecoveryReportItem } from '@/services/report-service';
import { generateRecoveryReport, exportRecoveryToExcel } from '@/services/report-service';
import { Progress } from '@/components/ui/progress';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';


const formatCurrency = (amount: number) => `C$${amount.toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const formatPercentage = (rate: number) => `${rate.toFixed(2)}%`;

function RecoveryReportContent() {
  const searchParams = useSearchParams();
  const [reportData, setReportData] = React.useState<RecoveryReportItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isExporting, setIsExporting] = React.useState(false);
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

      const data = await generateRecoveryReport(filters);
      setReportData(data);
      setIsLoading(false);
    };
    fetchData();
  }, [searchParams]);

  const handleExportToExcel = async () => {
    if (!reportData) return;
    setIsExporting(true);
    try {
      const { base64 } = await exportRecoveryToExcel(reportData);
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
        a.download = `Reporte_Meta_Cobranza_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
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


  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="ml-2">Generando reporte...</p>
      </div>
    );
  }

  const totalExpected = reportData.reduce((sum, item) => sum + item.expectedAmount, 0);
  const totalCollected = reportData.reduce((sum, item) => sum + item.collectedAmount, 0);
  const totalRecoveryPercentage = totalExpected > 0 ? (totalCollected / totalExpected) * 100 : 0;

  return (
    <div className="p-4 sm:p-6 print-container bg-white text-black">
      <div className="report-container mx-auto">
        <ReportHeader title="Reporte de Meta de Cobranza" dateFrom={dateFrom} dateTo={dateTo} />
        <div className="flex justify-end mb-4 no-print gap-2">
          <Button onClick={handleExportToExcel} variant="outline" disabled={isExporting}>
            {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileSpreadsheet className="mr-2 h-4 w-4" />}
            {isExporting ? 'Exportando...' : 'Exportar a Excel'}
          </Button>
          <Button onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" /> Imprimir</Button>
        </div>
        <Table className="report-table-condensed">
          <TableHeader>
            <TableRow>
              <TableHead>Usuario</TableHead>
              <TableHead># Créditos</TableHead>
              <TableHead className="text-right">Meta de Cobro</TableHead>
              <TableHead className="text-right">Monto Recuperado</TableHead>
              <TableHead className="text-right">% Recuperación</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reportData.length > 0 ? (
              reportData.map((item) => (
                <TableRow key={item.gestorName}>
                  <TableCell className="font-medium">{item.gestorName}</TableCell>
                  <TableCell>{item.creditCount}</TableCell>
                  <TableCell className="text-right">{formatCurrency(item.expectedAmount)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(item.collectedAmount)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <span>{formatPercentage(item.recoveryPercentage)}</span>
                      <Progress value={item.recoveryPercentage} className="w-24 h-2 no-print" />
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">No se encontraron datos para los filtros seleccionados.</TableCell>
              </TableRow>
            )}
          </TableBody>
          <TableFooter>
            <TableRow className="font-bold bg-muted/50">
              <TableCell>TOTALES</TableCell>
              <TableCell colSpan={1}></TableCell>
              <TableCell className="text-right">{formatCurrency(totalExpected)}</TableCell>
              <TableCell className="text-right">{formatCurrency(totalCollected)}</TableCell>
              <TableCell className="text-right">{formatPercentage(totalRecoveryPercentage)}</TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </div>
    </div>
  );
}

export default function RecoveryReportPage() {
  return (
    <React.Suspense fallback={
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="ml-2">Cargando reporte...</p>
      </div>
    }>
      <RecoveryReportContent />
    </React.Suspense>
  );
}
