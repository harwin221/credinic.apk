
'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import { ReportHeader } from '@/app/reports/components/ReportHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Printer, FileSpreadsheet } from 'lucide-react';
import type { PaymentDetailItem, PaymentDetailSummaryItem } from '@/services/report-service';
import { generatePaymentsDetailReport, exportPaymentsToExcel } from '@/services/report-service';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import * as XLSX from 'xlsx';

const formatCurrency = (amount: number) => `C$${amount.toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const formatDate = (dateString?: string) => {
  if (!dateString) return 'N/A';
  // Si es solo fecha (YYYY-MM-DD), agregar mediodía para evitar problemas de zona horaria
  const dateToFormat = /^\d{4}-\d{2}-\d{2}$/.test(dateString) ? dateString + 'T12:00:00' : dateString;
  return format(parseISO(dateToFormat), 'dd/MM/yyyy HH:mm', { locale: es });
};

function PaymentsReportContent() {
  const searchParams = useSearchParams();
  const [reportData, setReportData] = React.useState<{ detailed: PaymentDetailItem[], summary: PaymentDetailSummaryItem[] } | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isExporting, setIsExporting] = React.useState(false);
  const [dateFrom, setDateFrom] = React.useState<string | null>(null);
  const [dateTo, setDateTo] = React.useState<string | null>(null);
  const [viewType, setViewType] = React.useState<'detailed' | 'summary'>('detailed');

  React.useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      const filters = {
        sucursales: searchParams.getAll('sucursal'),
        users: searchParams.getAll('user'),
        dateFrom: searchParams.get('from') || undefined,
        dateTo: searchParams.get('to') || undefined,
        viewType: (searchParams.get('viewType') as any) || 'detailed',
      };
      setDateFrom(filters.dateFrom || null);
      setDateTo(filters.dateTo || null);
      setViewType(filters.viewType);

      const data = await generatePaymentsDetailReport(filters);
      setReportData(data);
      setIsLoading(false);
    };
    fetchData();
  }, [searchParams]);

  const handleExportToExcel = async () => {
    if (!reportData) return;
    setIsExporting(true);
    try {
      const dataToExport = viewType === 'detailed' ? reportData.detailed : reportData.summary;
      const { base64 } = await exportPaymentsToExcel(dataToExport, viewType);
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
        a.download = `Reporte_Abonos_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
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
        <p className="ml-2">Generando reporte...</p>
      </div>
    );
  }

  const totalPayments = reportData.detailed.reduce((sum, item) => sum + item.paidAmount, 0);

  return (
    <div className="p-4 sm:p-6 print-container bg-white text-black">
      <div className="report-container mx-auto">
        <ReportHeader title={`Reporte de Abonos (${viewType === 'detailed' ? 'Detallado' : 'Resumido'})`} dateFrom={dateFrom} dateTo={dateTo} />
        <div className="flex justify-end mb-4 no-print gap-2">
          <Button onClick={handleExportToExcel} variant="outline" disabled={isExporting}>
            {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileSpreadsheet className="mr-2 h-4 w-4" />}
            {isExporting ? 'Exportando...' : 'Exportar a Excel'}
          </Button>
          <Button onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" /> Imprimir</Button>
        </div>

        {viewType === 'detailed' ? (
          <div>
            <Table className="report-table-condensed">
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Recibo</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Gestor</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportData.detailed.length > 0 ? (
                  reportData.detailed.map((item) => (
                    <TableRow key={item.transactionNumber}>
                      <TableCell>{formatDate(item.paymentDate)}</TableCell>
                      <TableCell>{item.transactionNumber}</TableCell>
                      <TableCell>{item.clientName}</TableCell>
                      <TableCell>{item.gestorName}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.paidAmount)}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">No se encontraron abonos para los filtros seleccionados.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            <div className="mt-4 text-right font-bold text-base pr-4">
              Total Cobranza: {formatCurrency(totalPayments)}
            </div>
          </div>
        ) : (
          <div>
            <h2 className="text-[12px] font-bold mb-4">Resumen de Cobranza por Gestor</h2>
            <Table className="report-table-condensed">
              <TableHeader>
                <TableRow>
                  <TableHead>Gestor</TableHead>
                  <TableHead># Abonos</TableHead>
                  <TableHead className="text-right">Monto Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportData.summary.length > 0 ? (
                  reportData.summary.map((item) => (
                    <TableRow key={item.gestorName}>
                      <TableCell>{item.gestorName}</TableCell>
                      <TableCell>{item.paymentCount}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.totalPaid)}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} className="h-24 text-center">No hay datos para resumir.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            <div className="mt-4 text-right font-bold text-base pr-4">
              Gran Total: {formatCurrency(reportData.summary.reduce((sum, item) => sum + item.totalPaid, 0))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PaymentsReportPage() {
  return (
    <React.Suspense fallback={
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="ml-2">Cargando reporte...</p>
      </div>
    }>
      <PaymentsReportContent />
    </React.Suspense>
  );
}
