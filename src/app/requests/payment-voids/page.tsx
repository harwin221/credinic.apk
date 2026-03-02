'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, X, Eye, Loader2 } from 'lucide-react';
import { useUser } from '@/hooks/use-user';
import { AccessDenied } from '@/components/AccessDenied';
import { formatDate } from '@/lib/utils';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface PendingVoidRequest {
  id: string;
  creditId: string;
  creditNumber: string;
  clientName: string;
  amount: number;
  paymentDate: string;
  managedBy: string;
  voidRequestedBy: string;
  voidReason: string;
  requestDate: string;
}

const formatCurrency = (amount: number) => {
  return `C${amount.toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export default function PaymentVoidsPage() {
  const { user } = useUser();
  const { toast } = useToast();
  const [requests, setRequests] = React.useState<PendingVoidRequest[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [processingId, setProcessingId] = React.useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = React.useState<PendingVoidRequest | null>(null);
  const [actionType, setActionType] = React.useState<'approve' | 'reject' | null>(null);

  const fetchPendingRequests = async () => {
    try {
      const response = await fetch('/api/payments/void-requests');
      const data = await response.json();
      
      if (data.success) {
        setRequests(data.requests);
      } else {
        throw new Error(data.error || 'Error obteniendo solicitudes');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudieron cargar las solicitudes de anulación.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAction = async (request: PendingVoidRequest, action: 'approve' | 'reject') => {
    setProcessingId(request.id);
    try {
      const response = await fetch(`/api/payments/void-requests/${request.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      
      const result = await response.json();
      
      if (result.success) {
        toast({
          title: action === 'approve' ? 'Anulación Aprobada' : 'Solicitud Rechazada',
          description: action === 'approve' 
            ? 'El pago ha sido anulado exitosamente.' 
            : 'La solicitud de anulación ha sido rechazada.'
        });
        fetchPendingRequests(); // Refrescar lista
      } else {
        throw new Error(result.error || 'Error procesando solicitud');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: `No se pudo ${action === 'approve' ? 'aprobar' : 'rechazar'} la solicitud.`,
        variant: 'destructive'
      });
    } finally {
      setProcessingId(null);
      setSelectedRequest(null);
      setActionType(null);
    }
  };

  const openConfirmDialog = (request: PendingVoidRequest, action: 'approve' | 'reject') => {
    setSelectedRequest(request);
    setActionType(action);
  };

  React.useEffect(() => {
    if (user?.role === 'ADMINISTRADOR') {
      fetchPendingRequests();
    }
  }, [user]);

  if (!user) return null;
  if (user.role !== 'ADMINISTRADOR') {
    return <AccessDenied />;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Solicitudes de Anulación de Pagos</h1>
          <p className="text-muted-foreground">Aprobar o rechazar solicitudes de anulación enviadas por gestores</p>
        </div>
        <Button onClick={fetchPendingRequests} disabled={isLoading}>
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Eye className="mr-2 h-4 w-4" />}
          Actualizar
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Solicitudes Pendientes
            <Badge variant="secondary">{requests.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No hay solicitudes de anulación pendientes
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Crédito</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead>Fecha Pago</TableHead>
                  <TableHead>Gestor Original</TableHead>
                  <TableHead>Solicitado Por</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead>Fecha Solicitud</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell className="font-medium">{request.creditNumber}</TableCell>
                    <TableCell>{request.clientName}</TableCell>
                    <TableCell>{formatCurrency(request.amount)}</TableCell>
                    <TableCell>{formatDate(request.paymentDate)}</TableCell>
                    <TableCell>{request.managedBy}</TableCell>
                    <TableCell>{request.voidRequestedBy}</TableCell>
                    <TableCell className="max-w-xs truncate" title={request.voidReason}>
                      {request.voidReason}
                    </TableCell>
                    <TableCell>{formatDate(request.requestDate)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-green-600 border-green-300 hover:bg-green-50"
                          onClick={() => openConfirmDialog(request, 'approve')}
                          disabled={processingId === request.id}
                        >
                          <CheckCircle className="mr-1 h-4 w-4" />
                          Aprobar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 border-red-300 hover:bg-red-50"
                          onClick={() => openConfirmDialog(request, 'reject')}
                          disabled={processingId === request.id}
                        >
                          <X className="mr-1 h-4 w-4" />
                          Rechazar
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog de confirmación */}
      <AlertDialog open={selectedRequest !== null} onOpenChange={() => setSelectedRequest(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {actionType === 'approve' ? 'Aprobar Anulación' : 'Rechazar Solicitud'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {selectedRequest && (
                <div className="space-y-2">
                  <p><strong>Crédito:</strong> {selectedRequest.creditNumber} - {selectedRequest.clientName}</p>
                  <p><strong>Monto:</strong> {formatCurrency(selectedRequest.amount)}</p>
                  <p><strong>Solicitado por:</strong> {selectedRequest.voidRequestedBy}</p>
                  <p><strong>Motivo:</strong> {selectedRequest.voidReason}</p>
                  <p className="mt-4">
                    {actionType === 'approve' 
                      ? '¿Confirma que desea aprobar esta anulación? El pago será marcado como anulado.'
                      : '¿Confirma que desea rechazar esta solicitud? El pago permanecerá válido.'
                    }
                  </p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => selectedRequest && actionType && handleAction(selectedRequest, actionType)}
              disabled={processingId !== null}
              className={actionType === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
            >
              {processingId && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {actionType === 'approve' ? 'Aprobar Anulación' : 'Rechazar Solicitud'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}