

'use server';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Printer } from 'lucide-react';
import type { CreditDetail, Client, Payment } from '@/lib/types';
import { getCredit } from '@/services/credit-service-server';
import { formatDate } from '@/lib/utils';
import { AppLogo } from '@/components/AppLogo';
import { cn } from '@/lib/utils';
import { getUserByName } from '@/services/user-service-server';


const formatCurrency = (amount: number) => `C$${amount.toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const DetailRow = ({ label, value }: { label: string, value?: string | number | null }) => (
  <div className="flex justify-between text-xs py-0.5">
    <span className="font-semibold text-gray-600">{label}:</span>
    <span className="text-gray-800">{value || 'N/A'}</span>
  </div>
);

interface PaymentPlanPageProps {
  searchParams: Promise<{
    creditId?: string;
  }>;
}

export default async function PaymentPlanReportPage({ searchParams }: PaymentPlanPageProps) {
  const params = await searchParams;
  const creditId = params.creditId;
  
  if (!creditId) {
      return <div className="p-4">Error: ID de crédito no proporcionado.</div>;
  }
  
  const credit = await getCredit(creditId);

  if (!credit || !credit.clientDetails) {
      return <div className="p-4">Error: Crédito o datos del cliente no encontrados.</div>;
  }
  
  const client = credit.clientDetails;
  const gestor = credit.collectionsManager ? await getUserByName(credit.collectionsManager) : null;
  
  const gestorText = `${credit.collectionsManager || ''}${gestor?.phone ? ` (${gestor.phone})` : ''}`;
  const paymentPlan = credit.paymentPlan || [];

  return (
    <div className={cn("p-4 sm:p-8 print-container bg-white text-black font-sans", "report-portrait")}>
      <div className="max-w-4xl mx-auto">
        <header className="flex justify-between items-start mb-4">
            <div className="w-1/4">
                 <AppLogo collapsed={false} />
            </div>
            <div className="w-2/4 text-center">
                <h1 className="text-xl font-bold">PLAN DE PAGOS</h1>
                <p className="text-sm">León, Nicaragua</p>
                <p className="text-xs">Fecha Desembolso: {formatDate(credit.deliveryDate)}</p>
            </div>
            <div className="w-1/4" />
        </header>
        <hr className="my-2 border-t-2 border-gray-400"/>

        <div className="grid grid-cols-2 gap-x-8 text-xs mb-4">
            <div>
                <DetailRow label="NOMBRE" value={client.name} />
                <DetailRow label="CÉDULA" value={client.cedula} />
                <DetailRow label="FECHA DE VENCIMIENTO" value={formatDate(credit.dueDate)} />
                <DetailRow label="PERIODICIDAD" value={credit.paymentFrequency} />
                <DetailRow label="GESTOR DE COBROS" value={gestorText} />
                <DetailRow label="TASA DE INTERÉS" value={`${credit.interestRate}% Mensual`} />
                <DetailRow label="PLAZO" value={`${credit.termMonths} meses`} />
                <DetailRow label="MONEDA" value={credit.currencyType} />
            </div>
            <div>
                <DetailRow label="CLIENTE" value={client.clientNumber} />
                <DetailRow label="CRÉDITO" value={credit.creditNumber} />
                <DetailRow label="MONTO ENTREGADO" value={formatCurrency(credit.principalAmount)} />
            </div>
        </div>

        <Card className="border-gray-400">
            <CardContent className="p-0">
                 <Table className="text-xs">
                    <TableHeader className="bg-gray-200">
                        <TableRow>
                            <TableHead className="w-12 text-black font-semibold">No</TableHead>
                            <TableHead className="text-black font-semibold">Fecha Pago</TableHead>
                            <TableHead className="text-right text-black font-semibold">Saldo Anterior</TableHead>
                            <TableHead className="text-right text-black font-semibold">Cuota</TableHead>
                            <TableHead className="text-right text-black font-semibold">Saldo</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {(paymentPlan || []).map((item, index) => {
                            const saldoAnterior = index === 0 ? credit.totalAmount : (paymentPlan[index-1]?.balance || credit.totalAmount);
                            return (
                                <TableRow key={item.paymentNumber}>
                                    <TableCell>{item.paymentNumber}</TableCell>
                                    <TableCell>{formatDate(item.paymentDate)}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(saldoAnterior)}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(item.amount)}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(item.balance)}</TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
