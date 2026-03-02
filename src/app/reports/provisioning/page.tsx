
'use client';

import * as React from 'react';
import { ReportHeader } from '@/app/reports/components/ReportHeader';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Loader2, Printer, FileSpreadsheet } from 'lucide-react';
import type { ProvisionCredit } from '@/services/report-service';
import { generateProvisioningReport, exportProvisioningToExcel } from '@/services/report-service';
import { PROVISION_RULES } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

const formatCurrency = (amount: number) => `C$${amount.toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function ProvisioningReportPage() {
  const [reportData, setReportData] = React.useState<ProvisionCredit[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isExporting, setIsExporting] = React.useState(false);
  const { toast } = useToast();

  React.useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      const data = await generateProvisioningReport();
      setReportData(data);
      setIsLoading(false);
    };
    fetchData();
  }, []);

  const handleExportToExcel = async () => {
    if (reportData.length === 0) {
      toast({ title: "No hay datos para exportar", variant: "destructive" });
      return;
    }
    setIsExporting(true);
    try {
      const { base64 } = await exportProvisioningToExcel(reportData);
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
        a.download = `Reporte_Provisiones_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
        toast({ title: "Error de Exportación", description: "No se pudo generar el archivo Excel.", variant: "destructive" });
        console.error("Failed to export to Excel:", error);
    } finally {
        setIsExporting(false);
    }
  };


  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="ml-2">Generando reporte de provisiones...</p>
      </div>
    );
  }

  const totals = Object.keys(PROVISION_RULES).reduce((acc, key) => {
    acc[key as keyof typeof PROVISION_RULES] = { balance: 0, provision: 0, count: 0 };
    return acc;
  }, {} as Record<keyof typeof PROVISION_RULES, { balance: number; provision: number; count: number; }>);

  const groupedData = reportData.reduce((acc, item) => {
    const category = item.provisionCategory;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(item);
    
    totals[category].balance += item.remainingBalance;
    totals[category].provision += item.provisionAmount;
    totals[category].count += 1;
    
    return acc;
  }, {} as Record<keyof typeof PROVISION_RULES, ProvisionCredit[]>);
  
  const grandTotalBalance = reportData.reduce((sum, item) => sum + item.remainingBalance, 0);
  const grandTotalProvision = reportData.reduce((sum, item) => sum + item.provisionAmount, 0);

  return (
    <div className="p-4 sm:p-6 print-container bg-white text-black">
      <div className="report-container mx-auto">
        <ReportHeader title="Reporte de Provisiones de Cartera" />
        <div className="flex justify-end mb-4 no-print gap-2">
            <Button onClick={handleExportToExcel} variant="outline" disabled={isExporting}>
              {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileSpreadsheet className="mr-2 h-4 w-4" />}
              {isExporting ? 'Exportando...' : 'Exportar a Excel'}
            </Button>
            <Button onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" /> Imprimir</Button>
        </div>

        <div className="space-y-8">
            {Object.entries(groupedData).map(([categoryKey, credits]) => {
                 const category = categoryKey as keyof typeof PROVISION_RULES;
                 const categoryInfo = PROVISION_RULES[category];
                 if (!credits || credits.length === 0) return null;

                 return (
                     <div key={category} className="break-inside-avoid">
                        <h2 className="text-sm font-bold mb-2 uppercase">Categoría {category}: {categoryInfo.label} ({categoryInfo.min}-{categoryInfo.max === Infinity ? 'más' : categoryInfo.max} días)</h2>
                        <Table className="report-table-condensed">
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Crédito No.</TableHead>
                                    <TableHead>Cliente</TableHead>
                                    <TableHead>Gestor</TableHead>
                                    <TableHead className="text-right">Días Atraso</TableHead>
                                    <TableHead className="text-right">Saldo</TableHead>
                                    <TableHead className="text-right">Provisión</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {credits.map(item => (
                                    <TableRow key={item.id}>
                                        <TableCell>{item.creditNumber}</TableCell>
                                        <TableCell>{item.clientName}</TableCell>
                                        <TableCell>{item.gestorName || 'N/A'}</TableCell>
                                        <TableCell className="text-right">{item.lateDays}</TableCell>
                                        <TableCell className="text-right">{formatCurrency(item.remainingBalance)}</TableCell>
                                        <TableCell className="text-right">{formatCurrency(item.provisionAmount)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                            <TableFooter>
                                <TableRow className="font-bold bg-muted/50">
                                    <TableCell colSpan={4}>Subtotal Categoría {category}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(totals[category].balance)}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(totals[category].provision)}</TableCell>
                                </TableRow>
                            </TableFooter>
                        </Table>
                     </div>
                 )
            })}
        </div>
        
        <div className="mt-8 pt-4 border-t-2">
            <h2 className="text-center font-bold text-lg mb-4">Resumen General de Provisiones</h2>
            <Table className="report-table-condensed">
                <TableHeader>
                    <TableRow>
                        <TableHead>Categoría</TableHead>
                        <TableHead>Días de Atraso</TableHead>
                        <TableHead>% Provisión</TableHead>
                        <TableHead className="text-right">Saldo de Cartera</TableHead>
                        <TableHead className="text-right">Monto Provisionado</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {Object.entries(totals).map(([key, value]) => (
                        <TableRow key={key}>
                            <TableCell className="font-medium"><Badge variant="secondary">{PROVISION_RULES[key as keyof typeof PROVISION_RULES].label}</Badge></TableCell>
                            <TableCell>{PROVISION_RULES[key as keyof typeof PROVISION_RULES].min} - {PROVISION_RULES[key as keyof typeof PROVISION_RULES].max === Infinity ? 'más' : PROVISION_RULES[key as keyof typeof PROVISION_RULES].max}</TableCell>
                            <TableCell>{(PROVISION_RULES[key as keyof typeof PROVISION_RULES].rate * 100).toFixed(0)}%</TableCell>
                            <TableCell className="text-right">{formatCurrency(value.balance)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(value.provision)}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
                <TableFooter>
                    <TableRow className="font-bold text-base bg-muted">
                        <TableCell colSpan={3}>TOTAL GENERAL</TableCell>
                        <TableCell className="text-right">{formatCurrency(grandTotalBalance)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(grandTotalProvision)}</TableCell>
                    </TableRow>
                </TableFooter>
            </Table>
        </div>
      </div>
    </div>
  );
}
