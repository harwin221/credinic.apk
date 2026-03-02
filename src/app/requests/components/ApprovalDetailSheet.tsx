
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
  SheetClose
} from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import type { CreditDetail } from '@/lib/types';
import { XCircle, CheckCircle, Loader2, Edit } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { useRouter } from 'next/navigation';

const formatCurrency = (amount?: number) => {
    if (typeof amount !== 'number' || isNaN(amount)) return 'C$0.00';
    return `C$${amount.toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

interface ApprovalDetailSheetProps {
  isOpen: boolean;
  onClose: () => void;
  credit: CreditDetail | null;
  onApprove: (creditId: string) => Promise<void>;
  onReject: (creditId: string) => Promise<void>;
}

const DetailRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="flex justify-between items-center py-2 text-sm">
    <p className="text-muted-foreground">{label}</p>
    <p className="font-semibold text-right">{value}</p>
  </div>
);

export function ApprovalDetailSheet({ isOpen, onClose, credit, onApprove, onReject }: ApprovalDetailSheetProps) {
  const [isProcessing, setIsProcessing] = React.useState(false);
  const router = useRouter();

  if (!credit) return null;

  const handleAction = async (action: 'approve' | 'reject') => {
      setIsProcessing(true);
      if (action === 'approve') {
          await onApprove(credit.id);
      } else {
          await onReject(credit.id);
      }
      setIsProcessing(false);
  }

  const handleEdit = () => {
      router.push(`/credits/${credit.id}/edit`);
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full max-w-md flex flex-col">
        <SheetHeader>
          <div className="flex justify-between items-center">
             <SheetTitle>{credit.clientName}</SheetTitle>
             <Button variant="ghost" size="icon" onClick={handleEdit}>
                <Edit className="h-4 w-4" />
             </Button>
          </div>
          <SheetDescription>Solicitud de crédito #{credit.creditNumber}</SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-4 pr-2">
            <DetailRow label="Monto Solicitado" value={formatCurrency(credit.amount)} />
            <DetailRow label="Tasa de Interés" value={`${credit.interestRate}% Mensual`} />
            <DetailRow label="Plazo" value={`${credit.termMonths} meses`} />
            <DetailRow label="Frecuencia" value={credit.paymentFrequency} />
            <DetailRow label="Primer Cuota Propuesta" value={formatDate(credit.firstPaymentDate)} />
            <DetailRow label="Gestor Asignado" value={credit.collectionsManager} />
            
            <Separator className="my-4"/>

            <h4 className="font-semibold text-sm">Garantías Presentadas</h4>
             {(credit.guarantees || []).length > 0 ? (
                <div className="border rounded-md">
                    <div className="p-3">
                        {credit.guarantees.map((g, index) => (
                           <div key={g.id} className={index !== credit.guarantees.length - 1 ? 'border-b pb-2 mb-2' : ''}>
                                <div className="flex justify-between font-medium">
                                    <span>{g.article}</span>
                                    <span>{formatCurrency(g.estimatedValue)}</span>
                                </div>
                                <span className="text-xs text-muted-foreground">{g.brand} {g.model}</span>
                            </div>
                        ))}
                    </div>
                </div>
             ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No se registraron garantías.</p>
             )}
        </div>

        <SheetFooter className="mt-auto grid grid-cols-1 gap-2 pt-4 border-t">
          {credit.status === 'Pending' ? (
              <div className="grid grid-cols-2 gap-2 w-full">
                <Button variant="destructive" size="lg" onClick={() => handleAction('reject')} disabled={isProcessing}>
                    {isProcessing ? <Loader2 className="h-4 w-4 animate-spin"/> : <XCircle className="h-4 w-4"/>}
                    <span className="ml-2">Rechazar</span>
                </Button>
                <Button size="lg" onClick={() => handleAction('approve')} disabled={isProcessing} className="bg-accent text-accent-foreground hover:bg-accent/90">
                    {isProcessing ? <Loader2 className="h-4 w-4 animate-spin"/> : <CheckCircle className="h-4 w-4"/>}
                    <span className="ml-2">Aprobar</span>
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
