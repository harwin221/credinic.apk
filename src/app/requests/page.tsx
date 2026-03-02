
'use client';

import * as React from 'react';
import { useUser } from '@/hooks/use-user';
import { updateCredit } from '@/app/credits/actions';
import { nowInNicaragua } from '@/lib/date-utils';
import type { CreditDetail, AppUser as User, UserRole } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, Loader2, Edit, Settings } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AccessDenied } from '@/components/AccessDenied';
import { format, parseISO, isToday } from 'date-fns';
import { es } from 'date-fns/locale';
import { useRouter } from 'next/navigation';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getClient } from '@/services/client-service-server';
import { RejectionDialog } from '@/components/RejectionDialog';
import { getUsers as getUsersClient } from "@/services/user-service-client";
import { getCreditsAdmin } from '@/services/credit-service-server';

const ALLOWED_ROLES: UserRole[] = ['ADMINISTRADOR', 'GERENTE', 'FINANZAS', 'OPERATIVO'];

const formatCurrency = (amount: number = 0) => `C$${amount.toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

interface CreditLists {
  pending: CreditDetail[];
  denied: CreditDetail[];
}



function CreditApprovalTabs({ user }: { user: User }) {
  const { toast } = useToast();
  const router = useRouter();
  const [creditLists, setCreditLists] = React.useState<CreditLists>({ pending: [], denied: [] });
  const [isLoading, setIsLoading] = React.useState(true);
  const [isProcessing, setIsProcessing] = React.useState<string | null>(null);
  const [selectedCredit, setSelectedCredit] = React.useState<CreditDetail | null>(null);
  const [isRejectionModalOpen, setIsRejectionModalOpen] = React.useState(false);

  const isAdmin = user.role === 'ADMINISTRADOR';

  const fetchRequests = React.useCallback(async () => {
    if (!user) return;
    setIsLoading(true);

    try {
      const todayNicaragua = format(new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Managua' })), 'yyyy-MM-dd');

      const { credits: pendingCredits } = await getCreditsAdmin({ status: 'Pending', user });
      const { credits: rejectedCreditsToday } = await getCreditsAdmin({ status: 'Rejected', user, dateFrom: todayNicaragua, dateTo: todayNicaragua });

      setCreditLists({
        pending: pendingCredits.sort((a, b) => new Date(b.applicationDate).getTime() - new Date(a.applicationDate).getTime()),
        denied: rejectedCreditsToday
      });

    } catch (error) {
      console.error("Error fetching requests:", error);
      toast({ title: 'Error', description: 'No se pudieron cargar las solicitudes.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);

  React.useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleApprove = async (creditId: string) => {
    setIsProcessing(creditId);
    try {
      await updateCredit(creditId, {
        status: 'Approved',
        approvalDate: nowInNicaragua(),
        approvedBy: user.fullName
      }, user);
      toast({ title: 'Solicitud Aprobada', description: 'El estado del crédito ha sido actualizado.', variant: 'info' });
      fetchRequests(); // Re-fetch data after action
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'No se pudo procesar la aprobación.', variant: 'destructive' });
    } finally {
      setIsProcessing(null);
    }
  }

  const handleReject = async (creditId: string, reason: string) => {
    setIsProcessing(creditId);
    try {
      await updateCredit(creditId, {
        status: 'Rejected',
        approvalDate: nowInNicaragua(),
        rejectionReason: reason,
        rejectedBy: user.fullName
      }, user);
      toast({ title: 'Solicitud Rechazada', description: 'La solicitud ha sido rechazada.', variant: 'destructive' });
      setIsRejectionModalOpen(false);
      fetchRequests(); // Re-fetch data after action
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'No se pudo procesar el rechazo.', variant: 'destructive' });
    } finally {
      setIsProcessing(null);
    }
  }

  const openRejectionDialog = (credit: CreditDetail) => {
    setSelectedCredit(credit);
    setIsRejectionModalOpen(true);
  }

  const renderTable = (credits: CreditDetail[], tabType: 'Pending' | 'Denied') => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Cliente</TableHead>
          <TableHead>Monto Solicitado</TableHead>
          <TableHead>{tabType === 'Denied' ? 'Motivo del Rechazo' : 'Gestor'}</TableHead>
          <TableHead>{tabType === 'Denied' ? 'Fecha' : 'Sucursal'}</TableHead>
          {tabType !== 'Denied' && <TableHead className="text-right">Acciones</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {credits.length > 0 ? (
          credits.map((credit) => (
            <TableRow key={credit.id}>
              <TableCell className="font-medium">{credit.clientName}</TableCell>
              <TableCell>{formatCurrency(credit.amount)}</TableCell>
              <TableCell>{tabType === 'Denied' ? credit.rejectionReason : credit.collectionsManager}</TableCell>
              <TableCell>{tabType === 'Denied' ? (credit.approvalDate ? format(typeof credit.approvalDate === 'string' ? parseISO(credit.approvalDate) : credit.approvalDate, 'dd/MM/yyyy') : 'N/A') : credit.branchName}</TableCell>
              {tabType !== 'Denied' && (
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" disabled={!!isProcessing}>
                        {isProcessing === credit.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Settings className="h-4 w-4" />}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onSelect={() => handleApprove(credit.id)}>
                        <CheckCircle2 className="mr-2 h-4 w-4" /> Aprobar
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => openRejectionDialog(credit)} className="text-destructive">
                        <XCircle className="mr-2 h-4 w-4" /> Rechazar
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => router.push(`/credits/${credit.id}/edit`)}>
                        <Edit className="mr-2 h-4 w-4" /> Editar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              )}
            </TableRow>
          ))
        ) : (
          <TableRow>
            <TableCell colSpan={5} className="h-24 text-center">No hay solicitudes en esta categoría.</TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );

  if (isLoading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
  }

  return (
    <>
      <Tabs defaultValue="pending">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="pending">Créditos Pendientes ({creditLists.pending.length})</TabsTrigger>
          <TabsTrigger value="denied">Denegadas Hoy ({creditLists.denied.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="pending" className="mt-4">
          {renderTable(creditLists.pending, 'Pending')}
        </TabsContent>
        <TabsContent value="denied" className="mt-4">
          {renderTable(creditLists.denied, 'Denied')}
        </TabsContent>
      </Tabs>
      <RejectionDialog
        isOpen={isRejectionModalOpen}
        onClose={() => setIsRejectionModalOpen(false)}
        onSubmit={(reason) => {
          if (selectedCredit) handleReject(selectedCredit.id, reason);
        }}
        isProcessing={!!isProcessing}
      />
    </>
  );
}

export default function RequestsPage() {
  const { user, loading: userLoading } = useUser();

  if (userLoading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!user || !ALLOWED_ROLES.includes(user.role.toUpperCase() as UserRole)) {
    return <AccessDenied />;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <CreditApprovalTabs user={user} />
        </CardContent>
      </Card>
    </div>
  );
}
