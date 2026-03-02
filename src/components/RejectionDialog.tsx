
'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

interface RejectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => void;
  isProcessing?: boolean;
}

export function RejectionDialog({ isOpen, onClose, onSubmit, isProcessing }: RejectionDialogProps) {
  const [reason, setReason] = React.useState('');

  const handleSubmit = () => {
    if (reason.trim()) {
      onSubmit(reason);
    }
  };

  React.useEffect(() => {
    if (isOpen) {
      setReason(''); // Reset reason when dialog opens
    }
  }, [isOpen]);

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirmar Rechazo de Solicitud</AlertDialogTitle>
          <AlertDialogDescription>
            Por favor, especifica el motivo del rechazo. Esta información es importante para el historial del cliente y los análisis futuros.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="py-4">
          <Label htmlFor="rejection-reason" className="sr-only">
            Motivo del rechazo
          </Label>
          <Textarea
            id="rejection-reason"
            placeholder="Escribe el motivo aquí..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isProcessing}>Cancelar</AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={handleSubmit}
            disabled={!reason.trim() || isProcessing}
          >
            {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirmar Rechazo
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
