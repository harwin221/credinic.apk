

'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import type { CreditDetail } from '@/lib/types';
import { Landmark, XCircle, CheckCircle, Edit, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { formatDate } from '@/lib/utils';
import { DateDisplay } from '@/components/ui/date-display';

const formatCurrency = (amount?: number) => {
    if (typeof amount !== 'number' || isNaN(amount)) return 'C$0.00';
    return `C$${amount.toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

interface DisbursementDetailSheetProps {
  isOpen: boolean;
  onClose: () => void;
  credit: CreditDetail | null;
  onDisburse: () => void;
  onReject: () => void; 
}

const DetailRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="flex justify-between items-center py-2 text-sm">
    <p className="text-muted-foreground">{label}</p>
    <p className="font-semibold text-right">{value}</p>
  </div>
);

export function DisbursementDetailSheet({ isOpen, onClose, credit, onDisburse, onReject }: DisbursementDetailSheetProps) {
  const router = useRouter();
  const [isProcessing] = React.useState(false); // El estado de procesamiento ahora se maneja en el padre

  if (!credit) return null;

  const { clientDetails, outstandingBalance } = credit;
  const fullAddress = [
    clientDetails?.department,
    clientDetails?.municipality,
    clientDetails?.neighborhood,
    clientDetails?.address,
  ].filter(Boolean).join(', ');

  const handleEdit = () => {
    router.push(`/credits/${credit.id}/edit`);
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full max-w-md flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center">
            {credit.clientName}
            <Button variant="ghost" size="icon" className="ml-2 h-7 w-7" onClick={handleEdit}>
              <Edit className="h-4 w-4" />
            </Button>
          </SheetTitle>
          <SheetDescription>{fullAddress || 'Dirección no especificada.'}</SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-4 pr-2">
            <div className="text-center p-3 rounded-lg bg-muted">
                <p className="text-sm text-muted-foreground">Actividad Económica</p>
                <p className="font-semibold">{clientDetails?.employmentType === 'asalariado' ? 'Asalariado' : 'Comerciante'}</p>
            </div>
            
             {outstandingBalance !== undefined && outstandingBalance > 0 && (
              <div className="text-center p-3 rounded-lg bg-amber-100 border border-amber-300">
                <p className="text-sm text-amber-800">Saldo Pendiente Anterior</p>
                <p className="font-bold text-lg text-amber-900">{formatCurrency(outstandingBalance)}</p>
              </div>
            )}
            
            <Separator className="my-4"/>
            
            <DetailRow label="Monto Aprobado" value={formatCurrency(credit.amount)} />
            <DetailRow label="Monto a Desembolsar" value={formatCurrency(credit.netDisbursementAmount ?? credit.amount)} />
            <DetailRow label="Interés Corriente" value={`${credit.interestRate}%`} />
            <DetailRow label="Periodicidad" value={credit.paymentFrequency} />
            <DetailRow label="Plazo (meses)" value={credit.termMonths} />
            <DetailRow label="Fecha Primera Cuota" value={<DateDisplay date={credit.firstPaymentDate} />} />
        </div>

        <SheetFooter className="mt-auto pt-4 border-t">
          {credit.status === 'Approved' ? (
            <div className="grid grid-cols-2 gap-2 w-full">
              <Button variant="destructive" size="lg" onClick={onReject} disabled={isProcessing}>
                {isProcessing ? <Loader2 className="h-4 w-4 animate-spin"/> : <XCircle className="h-4 w-4"/>}
                <span className="ml-2">Denegar</span>
              </Button>
              <Button size="lg" onClick={onDisburse} disabled={isProcessing} className="bg-accent text-accent-foreground hover:bg-accent/90">
                {isProcessing ? <Loader2 className="h-4 w-4 animate-spin"/> : <CheckCircle className="h-4 w-4"/>}
                <span className="ml-2">Desembolsar</span>
              </Button>
            </div>
          ) : (
            <SheetClose asChild>
                <Button variant="outline" className="w-full">Cerrar</Button>
            </SheetClose>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
