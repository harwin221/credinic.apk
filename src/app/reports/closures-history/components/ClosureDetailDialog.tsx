'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { CashClosure } from '@/lib/types';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

const formatCurrency = (amount: number, symbol: 'C$' | 'U$' = 'C$') => `${symbol}${amount.toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
        return format(parseISO(dateString), 'dd/MM/yyyy HH:mm:ss', { locale: es });
    } catch {
        return 'Fecha Inválida';
    }
}

interface ClosureDetailDialogProps {
  isOpen: boolean;
  onClose: () => void;
  closure: CashClosure | null;
}

const DenominationTable = ({ title, denominations }: { title: string; denominations?: Record<string, number> }) => {
    if (!denominations || Object.keys(denominations).length === 0) {
        return null;
    }
    const sortedDenominations = Object.entries(denominations).sort((a,b) => parseFloat(b[0]) - parseFloat(a[0]));

    return (
        <div>
            <h4 className="font-semibold text-sm mb-2">{title}</h4>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Denominación</TableHead>
                        <TableHead>Cantidad</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {sortedDenominations.map(([key, count]) => (
                        <TableRow key={key}>
                            <TableCell>{formatCurrency(parseFloat(key), title.includes('USD') ? 'U$' : 'C$')}</TableCell>
                            <TableCell>{count}</TableCell>
                            <TableCell className="text-right">{formatCurrency(parseFloat(key) * count, title.includes('USD') ? 'U$' : 'C$')}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
};


export function ClosureDetailDialog({ isOpen, onClose, closure }: ClosureDetailDialogProps) {
  if (!closure) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-lg">Detalle del Arqueo de Caja</DialogTitle>
          <DialogDescription className="text-xs">
            Arqueo realizado para <strong>{closure.userName}</strong> el {formatDate(closure.closureDate)}.
          </DialogDescription>
        </DialogHeader>

        <div className="py-3 space-y-3 overflow-y-auto pr-3 flex-1">
            <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="space-y-1">
                    <p className="text-muted-foreground">Usuario Arqueado</p>
                    <p className="font-semibold">{closure.userName}</p>
                </div>
                 <div className="space-y-1">
                    <p className="text-muted-foreground">Cerrado Por</p>
                    <p className="font-semibold">{closure.closedByUserName}</p>
                </div>
            </div>
            
             <div className="grid grid-cols-3 gap-4 text-center">
                 <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">Saldo Sistema</p>
                    <p className="font-bold text-lg">{formatCurrency(closure.systemBalance)}</p>
                 </div>
                 <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">Saldo Físico</p>
                    <p className="font-bold text-lg">{formatCurrency(closure.physicalBalance)}</p>
                 </div>
                 <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">Diferencia</p>
                    <p className={`font-bold text-lg ${closure.difference < 0 ? 'text-destructive' : 'text-green-600'}`}>{formatCurrency(closure.difference)}</p>
                 </div>
            </div>
            
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                <DenominationTable title="Billetaje en Córdobas (NIO)" denominations={closure.denominationsNIO} />
                <DenominationTable title="Billetaje en Dólares (USD)" denominations={closure.denominationsUSD} />
             </div>
              <div className="grid grid-cols-2 gap-4 text-sm pt-4 border-t">
                 <div className="space-y-1">
                    <p className="text-muted-foreground">Depósitos de Clientes</p>
                    <p className="font-semibold">{formatCurrency(closure.clientDeposits || 0)}</p>
                </div>
                 <div className="space-y-1">
                    <p className="text-muted-foreground">Transferencias Manuales</p>
                    <p className="font-semibold">{formatCurrency(closure.manualTransfers || 0)}</p>
                </div>
            </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
