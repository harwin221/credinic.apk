
'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import { ReportHeader } from '@/app/reports/components/ReportHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Printer, FileSpreadsheet } from 'lucide-react';
import type { PaymentDetailItem, PaymentDetailSummaryItem, PaymentDetailReportData } from '@/services/report-service';
import { generatePaymentsDetailReport, exportPaymentsToExcel } from '@/services/report-service';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import * as XLSX from 'xlsx';

const formatCurrency = (amount: number = 0) => `C$${amount.toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const formatDate = (dateString?: string) => {
  if (!dateString) return 'N/A';
  const dateToFormat = /^\d{4}-\d{2}-\d{2}$/.test(dateString) ? dateString + 'T12:00:00' : dateString;
  return format(parseISO(dateToFormat), 'dd/MM/yyyy HH:mm', { locale: es });
};

function PaymentsDetailReportContent() {
  const searchParams = useSearchParams();
  const [reportData, setReportData] = React.useState<PaymentDetailReportData | null>(null);
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
        a.download = `Reporte_Recuperacion_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
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

  const renderDetailedView = () => {
    const groupedData = reportData.detailed.reduce((acc, item) => {
      const key = item.gestorName || 'Sin Gestor';
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(item);
      return acc;
    }, {} as Record<string, PaymentDetailItem[]>);

    return (
      <div className="space-y-6">
        {Object.entries(groupedData).map(([groupName, payments]) => {
          const totalGroup = payments.reduce((sum, item) => sum + item.paidAmount, 0);
          const totalCapital = payments.reduce((sum, item) => sum + item.capitalPaid, 0);
          const totalInterest = payments.reduce((sum, item) => sum + item.interestPaid, 0);
          return (
            <div key={groupName} className="break-inside-avoid">
              <h3 className="text-sm font-bold mb-2 uppercase">{groupName}</h3>
              <Table className="report-table-condensed">
                <TableHeader>
                  <TableRow>
                    <TableHead>No. Transacción</TableHead>
                    <TableHead>Código</TableHead>
                    <TableHead>Nombre del Cliente</TableHead>
                    <TableHead>M</TableHead>
                    <TableHead className="text-right">Capital</TableHead>
                    <TableHead className="text-right">Interés</TableHead>
                    <TableHead className="text-right">Pagado</TableHead>
                    <TableHead>Fecha Pago</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((item, index) => (
                    <TableRow key={`${item.transactionNumber}-${item.paymentDate}-${index}`}>
                      <TableCell>{item.transactionNumber}</TableCell>
                      <TableCell>{item.clientCode}</TableCell>
                      <TableCell>{item.clientName}</TableCell>
                      <TableCell>{item.currency}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.capitalPaid)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.interestPaid)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.paidAmount)}</TableCell>
                      <TableCell>{formatDate(item.paymentDate)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="font-bold bg-gray-100">
                    <TableCell colSpan={4} className="text-right">Total Gestor:</TableCell>
                    <TableCell className="text-right">{formatCurrency(totalCapital)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(totalInterest)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(totalGroup)}</TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )
        })}
      </div>
    );
  }

  const renderSummaryView = () => {
    const grandTotal = reportData.summary.reduce((sum, item) => sum + item.totalPaid, 0);
    return (
      <div>
        <Table className="report-table-condensed">
          <TableHeader>
            <TableRow>
              <TableHead>Usuario</TableHead>
              <TableHead># Pagos</TableHead>
              <TableHead className="text-right">Total Recuperado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reportData.summary.map(item => (
              <TableRow key={item.gestorName}>
                <TableCell>{item.gestorName}</TableCell>
                <TableCell>{item.paymentCount}</TableCell>
                <TableCell className="text-right">{formatCurrency(item.totalPaid)}</TableCell>
              </TableRow>
            ))}
            <TableRow className="font-bold bg-muted/50">
              <TableCell colSpan={2}>GRAN TOTAL</TableCell>
              <TableCell className="text-right">{formatCurrency(grandTotal)}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    );
  };

  const { stats } = reportData;

  return (
    <div className="p-4 sm:p-6 print-container bg-white text-black">
      <div className="report-container mx-auto">
        <ReportHeader title={`Reporte de Recuperación (${viewType === 'detailed' ? 'Detallado' : 'Resumido'})`} dateFrom={dateFrom} dateTo={dateTo} />
        <div className="flex justify-end mb-4 no-print gap-2">
          <Button onClick={handleExportToExcel} variant="outline" disabled={isExporting}>
            {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileSpreadsheet className="mr-2 h-4 w-4" />}
            {isExporting ? 'Exportando...' : 'Exportar a Excel'}
          </Button>
          <Button onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" /> Imprimir</Button>
        </div>

        {viewType === 'detailed' ? renderDetailedView() : renderSummaryView()}

        {viewType === 'detailed' && (
          <div className="mt-8 pt-4 border-t-2 space-y-6 break-inside-avoid">
            <Card className="max-w-2xl mx-auto border-none shadow-none">
              <CardHeader>
                <CardTitle className="text-center text-lg">Resumen de Recuperación</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-center pb-2">
                  <p className="text-muted-foreground">Monto Total Pagado</p>
                  <p className="font-bold text-2xl text-primary">{formatCurrency(stats.totalPaid)}</p>
                </div>
                <div className="grid grid-cols-2 gap-x-8 text-sm p-4 border rounded-lg">
                  <div className="space-y-1">
                    <div className="flex justify-between"><span>Cobro del Día:</span> <span className="font-semibold">{formatCurrency(stats.dueTodayCapital + stats.dueTodayInterest)}</span></div>
                    <div className="flex justify-between"><span>Cobro de Mora:</span> <span className="font-semibold">{formatCurrency(stats.overdue)}</span></div>
                    <div className="flex justify-between"><span>Cobro de Vencido:</span> <span className="font-semibold">{formatCurrency(stats.expired)}</span></div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between"><span>Cobro Adelantado:</span> <span className="font-semibold">{formatCurrency(stats.advance)}</span></div>
                    <div className="flex justify-between"><span>Total Clientes Cobrados:</span> <span className="font-semibold">{stats.totalClients}</span></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PaymentsDetailReportPage() {
  return (
    <React.Suspense fallback={
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="ml-2">Cargando reporte...</p>
      </div>
    }>
      <PaymentsDetailReportContent />
    </React.Suspense>
  );
}
