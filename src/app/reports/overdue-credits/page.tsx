'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import { ReportHeader } from '@/app/reports/components/ReportHeader';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Printer, FileSpreadsheet } from 'lucide-react';
import type { OverdueCreditItem } from '@/services/report-service';
import { generateOverdueCreditsReport, exportOverdueCreditsToExcel } from '@/services/report-service';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import * as XLSX from 'xlsx';
import { cn } from '@/lib/utils';


const formatCurrency = (amount: number) => amount.toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const formatDate = (dateString?: string) => {
  if (!dateString) return 'N/A';
  try {
    // Si es solo fecha (YYYY-MM-DD), agregar mediodía para evitar problemas de zona horaria
    const dateToFormat = /^\d{4}-\d{2}-\d{2}$/.test(dateString) ? dateString + 'T12:00:00' : dateString;
    const date = parseISO(dateToFormat);
    return format(date, 'dd/MM/yyyy', { locale: es });
  } catch {
    return 'Fecha Inválida';
  }
};

interface GroupedData {
  gestorName: string;
  creditosDiario: OverdueCreditItem[];
  creditosMora: OverdueCreditItem[];
  creditosVencidos: OverdueCreditItem[];
}

const TotalsRow = ({ credits, label }: { credits: OverdueCreditItem[], label: string }) => {
  if (credits.length === 0) return null;

  const totalCuota = credits.reduce((sum, item) => sum + (item.installmentAmount || 0), 0);
  const totalAtraso = credits.reduce((sum, item) => sum + (item.overdueAmount || 0), 0);
  const totalIntMora = credits.reduce((sum, item) => sum + (item.lateFee || 0), 0);
  const totalCAIM = credits.reduce((sum, item) => sum + (item.totalToPay || 0), 0);
  const totalSaldo = credits.reduce((sum, item) => sum + (item.remainingBalance || 0), 0);

  return (
    <TableRow className="font-bold bg-muted/50 text-[10px]">
      <TableCell colSpan={6} className="text-left font-bold uppercase">{label}: {credits.length}</TableCell>
      <TableCell className="text-right">{formatCurrency(totalCuota)}</TableCell>
      <TableCell className="text-right">{formatCurrency(totalAtraso)}</TableCell>
      <TableCell></TableCell>
      <TableCell className="text-right">{formatCurrency(totalIntMora)}</TableCell>
      <TableCell className="text-right">{formatCurrency(totalCAIM)}</TableCell>
      <TableCell></TableCell>
      <TableCell className="text-right">{formatCurrency(totalSaldo)}</TableCell>
      <TableCell></TableCell>
    </TableRow>
  );
};


function OverdueCreditsReportContent() {
  const searchParams = useSearchParams();
  const [groupedData, setGroupedData] = React.useState<GroupedData[]>([]);
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

      const data = await generateOverdueCreditsReport(filters);

      const gestorMap: Record<string, GroupedData> = {};
      data.forEach(item => {
        const gestor = item.gestorName;
        if (!gestorMap[gestor]) {
          gestorMap[gestor] = { gestorName: gestor, creditosDiario: [], creditosMora: [], creditosVencidos: [] };
        }
        if (item.type === 'D') {
          gestorMap[gestor].creditosDiario.push(item);
        } else if (item.type === 'M') {
          gestorMap[gestor].creditosMora.push(item);
        } else if (item.type === 'V') {
          gestorMap[gestor].creditosVencidos.push(item);
        }
      });

      setGroupedData(Object.values(gestorMap));
      setIsLoading(false);
    };

    fetchData();
  }, [searchParams]);

  const handleExportToExcel = async () => {
    if (!groupedData) return;
    setIsExporting(true);
    try {
      const allItems = groupedData.flatMap(g => [...g.creditosDiario, ...g.creditosMora, ...g.creditosVencidos]);
      const { base64 } = await exportOverdueCreditsToExcel(allItems);
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
        a.download = `Reporte_Mora_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
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
        <p className="ml-2">Generando listado de cobros...</p>
      </div>
    );
  }

  const renderCreditRow = (item: OverdueCreditItem, index: number) => (
    <TableRow key={`${item.creditId}-${item.type}-${index}`}>
      <TableCell>{item.creditNumber}</TableCell>
      <TableCell>{item.clientName}</TableCell>
      <TableCell>{item.clientAddress}</TableCell>
      <TableCell>{item.clientPhone}</TableCell>
      <TableCell>{formatDate(item.deliveryDate)}</TableCell>
      <TableCell>{formatDate(item.dueDate)}</TableCell>
      <TableCell className="text-right">{formatCurrency(item.installmentAmount)}</TableCell>
      <TableCell className="text-right">{formatCurrency(item.overdueAmount)}</TableCell>
      <TableCell className="text-right">{item.lateDays}</TableCell>
      <TableCell className="text-right">{formatCurrency(item.lateFee)}</TableCell>
      <TableCell className="text-right">{formatCurrency(item.totalToPay)}</TableCell>
      <TableCell className="text-right">{formatDate(item.lastPaymentDate)}</TableCell>
      <TableCell className="text-right">{formatCurrency(item.remainingBalance)}</TableCell>
      <TableCell>{item.type}</TableCell>
    </TableRow>
  );

  return (
    <div className="p-2 sm:p-4 print-container bg-white text-black">
      <div className="report-container mx-auto">
        <ReportHeader title="Listado de Cobros Diario" dateFrom={dateFrom} dateTo={dateTo} />
        <div className="flex justify-end mb-4 no-print gap-2">
          <Button onClick={handleExportToExcel} variant="outline" disabled={isExporting}>
            {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileSpreadsheet className="mr-2 h-4 w-4" />}
            {isExporting ? 'Exportando...' : 'Exportar a Excel'}
          </Button>
          <Button onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" /> Imprimir</Button>
        </div>

        {groupedData.length > 0 ? (
          groupedData.map((group) => (
            <div key={group.gestorName} className="break-inside-avoid mb-8">
              <h2 className="font-bold text-[12px] uppercase mb-2">{group.gestorName}</h2>
              <Table className="report-table-condensed">
                <TableHeader>
                  <TableRow>
                    <TableHead>Crédito</TableHead>
                    <TableHead>Nombre del Cliente</TableHead>
                    <TableHead>Dirección</TableHead>
                    <TableHead>Teléfono</TableHead>
                    <TableHead>Desembolso</TableHead>
                    <TableHead>Vence</TableHead>
                    <TableHead className="text-right">Cuota</TableHead>
                    <TableHead className="text-right">Atraso</TableHead>
                    <TableHead className="text-right">Dias</TableHead>
                    <TableHead className="text-right">Int Mora</TableHead>
                    <TableHead className="text-right">C+A+IM</TableHead>
                    <TableHead className="text-right">Ultimo pago</TableHead>
                    <TableHead className="text-right">Saldo</TableHead>
                    <TableHead>Tipo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow className="bg-gray-100 h-2 p-0"><TableCell colSpan={14} className="h-2 p-0 font-bold text-center">CRÉDITOS DIARIO</TableCell></TableRow>
                  {group.creditosDiario.length > 0 ? group.creditosDiario.map(renderCreditRow) : <TableRow><TableCell colSpan={14} className="text-center h-10">No hay cobros diarios.</TableCell></TableRow>}
                  <TotalsRow credits={group.creditosDiario} label={`Total Diario`} />

                  <TableRow className="bg-gray-200 h-2 p-0"><TableCell colSpan={14} className="h-2 p-0"></TableCell></TableRow>

                  <TableRow className="bg-gray-100 h-2 p-0"><TableCell colSpan={14} className="h-2 p-0 font-bold text-center">CRÉDITOS EN MORA</TableCell></TableRow>
                  {group.creditosMora.length > 0 ? group.creditosMora.map(renderCreditRow) : <TableRow><TableCell colSpan={14} className="text-center h-10">No hay créditos en mora.</TableCell></TableRow>}
                  <TotalsRow credits={group.creditosMora} label={`Total Mora`} />

                  <TableRow className="bg-gray-200 h-2 p-0"><TableCell colSpan={14} className="h-2 p-0"></TableCell></TableRow>

                  <TableRow className="bg-gray-100 h-2 p-0"><TableCell colSpan={14} className="h-2 p-0 font-bold text-center">CRÉDITOS VENCIDOS</TableCell></TableRow>
                  {group.creditosVencidos.length > 0 ? group.creditosVencidos.map(renderCreditRow) : <TableRow><TableCell colSpan={14} className="text-center h-10">No hay créditos vencidos.</TableCell></TableRow>}
                  <TotalsRow credits={group.creditosVencidos} label={`Total Vencidos`} />
                </TableBody>
              </Table>
            </div>
          ))
        ) : (
          <div className="text-center py-10 text-muted-foreground">
            No se encontraron créditos en mora para los filtros seleccionados.
          </div>
        )}

      </div>
    </div>
  );
}

export default function OverdueCreditsReportPage() {
  return (
    <React.Suspense fallback={
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="ml-2">Cargando reporte...</p>
      </div>
    }>
      <OverdueCreditsReportContent />
    </React.Suspense>
  );
}