'use client';

import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DateInput } from '@/components/ui/date-input';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/hooks/use-user';
import { updatePaymentPlanDatesAction } from '../payment-plan-actions';
import { formatDateForUser } from '@/lib/date-utils';
import { Loader2, Save, X, Calendar, AlertTriangle } from 'lucide-react';
import type { Payment } from '@/lib/types';

// Función local para formatear moneda
const formatCurrency = (amount?: number) => {
  if (typeof amount !== 'number' || isNaN(amount)) return 'C$0.00';
  return `C$${amount.toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

interface EditPaymentPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  creditId: string;
  creditNumber: string;
  clientName: string;
  paymentPlan: Payment[];
  onSuccess: () => void;
}

export function EditPaymentPlanModal({
  isOpen,
  onClose,
  creditId,
  creditNumber,
  clientName,
  paymentPlan,
  onSuccess
}: EditPaymentPlanModalProps) {
  const { toast } = useToast();
  const { user } = useUser();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [editedDates, setEditedDates] = React.useState<Record<number, string>>({});

  // Verificar que el usuario es administrador
  const isAdmin = user?.role === 'ADMINISTRADOR';

  React.useEffect(() => {
    if (isOpen) {
      // Inicializar las fechas editadas con las fechas actuales
      const initialDates: Record<number, string> = {};
      paymentPlan.forEach(payment => {
        if (payment.paymentDate) {
          initialDates[payment.paymentNumber] = payment.paymentDate;
        }
      });
      setEditedDates(initialDates);
    }
  }, [isOpen, paymentPlan]);

  const handleDateChange = (paymentNumber: number, newDate: string) => {
    setEditedDates((prev: Record<number, string>) => ({
      ...prev,
      [paymentNumber]: newDate
    }));
  };

  const handleSubmit = async () => {
    if (!user || !isAdmin) {
      toast({
        title: "Error de permisos",
        description: "Solo los administradores pueden editar fechas del plan de pagos.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Preparar los datos para enviar
      const updatedPayments = Object.entries(editedDates).map(([paymentNumber, date]) => ({
        paymentNumber: parseInt(paymentNumber),
        paymentDate: formatDateForUser(date, 'yyyy-MM-dd')
      }));

      // Filtrar solo las fechas que realmente cambiaron
      const changedPayments = updatedPayments.filter(updated => {
        const original = paymentPlan.find(p => p.paymentNumber === updated.paymentNumber);
        if (!original?.paymentDate) return true;
        
        const originalDate = original.paymentDate ? formatDateForUser(original.paymentDate, 'yyyy-MM-dd') : '';
        return originalDate !== updated.paymentDate;
      });

      if (changedPayments.length === 0) {
        toast({
          title: "Sin cambios",
          description: "No se detectaron cambios en las fechas.",
          variant: "default"
        });
        onClose();
        return;
      }

      console.log('Enviando cambios de fechas:', changedPayments);

      const result = await updatePaymentPlanDatesAction(creditId, changedPayments, user);

      console.log('Resultado de la actualización:', result);

      if (result.success) {
        toast({
          title: "Fechas actualizadas",
          description: `Se actualizaron ${changedPayments.length} fechas del plan de pagos para ${clientName}.`,
        });
        onSuccess();
        onClose();
      } else {
        throw new Error(result.error || "Error desconocido");
      }

    } catch (error) {
      console.error('Error al actualizar fechas:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Ocurrió un error al actualizar las fechas.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setEditedDates({});
      onClose();
    }
  };

  if (!isAdmin) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader className="pb-2">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Calendar className="h-4 w-4" />
            Editar Fechas del Plan de Pagos
          </DialogTitle>
          <DialogDescription className="text-xs">
            Editando fechas para el crédito <strong>{creditNumber}</strong> de <strong>{clientName}</strong>.
            <br />
            <span className="flex items-center gap-1 text-amber-600 mt-1.5">
              <AlertTriangle className="h-3.5 w-3.5" />
              Solo modifica las fechas si es absolutamente necesario. Los cambios afectarán los cálculos de mora.
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">#</TableHead>
                <TableHead className="w-40">Fecha Original</TableHead>
                <TableHead className="w-40">Nueva Fecha</TableHead>
                <TableHead>Capital</TableHead>
                <TableHead>Interés</TableHead>
                <TableHead>Monto Cuota</TableHead>
                <TableHead>Saldo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paymentPlan.map((payment) => (
                <TableRow key={payment.paymentNumber}>
                  <TableCell className="font-medium">{payment.paymentNumber}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {payment.paymentDate ? formatDateForUser(payment.paymentDate, 'dd/MM/yyyy') : 'N/A'}
                  </TableCell>
                  <TableCell>
                    <DateInput
                      value={editedDates[payment.paymentNumber] || ''}
                      onChange={(value: string | null) => handleDateChange(payment.paymentNumber, value || '')}
                      className="w-full"
                      disabled={isSubmitting}
                    />
                  </TableCell>
                  <TableCell>{formatCurrency(payment.principal)}</TableCell>
                  <TableCell>{formatCurrency(payment.interest)}</TableCell>
                  <TableCell>{formatCurrency(payment.amount)}</TableCell>
                  <TableCell>{formatCurrency(payment.balance)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <DialogFooter className="flex gap-2">
          <Button 
            type="button" 
            variant="outline" 
            onClick={handleClose}
            disabled={isSubmitting}
          >
            <X className="mr-2 h-4 w-4" />
            Cancelar
          </Button>
          <Button 
            type="button" 
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            {isSubmitting ? 'Guardando...' : 'Guardar Cambios'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}