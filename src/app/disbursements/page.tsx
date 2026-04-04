'use client';

import * as React from 'react';
import { useUser } from '@/hooks/use-user';
import { updateCredit as updateCreditAction } from '@/app/credits/actions';
import type { CreditDetail, UserRole } from '@/lib/types';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AccessDenied } from '@/components/AccessDenied';
import { getClient } from '@/services/client-service-server';
import { calculateCreditStatusDetails } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, parseISO, isValid } from 'date-fns';
import { todayInNicaragua, formatDateForUser, nowInNicaragua, userInputToISO } from '@/lib/date-utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { RejectionDialog } from '@/components/RejectionDialog';
import { DisbursementForm, DisbursementFormValues } from './components/DisbursementForm';
import { DisbursementDetailSheet } from './components/DisbursementDetailSheet';
import { Button } from '@/components/ui/button';
import { addPayment, getCredit, getCreditsAdmin } from '@/services/credit-service-server';

const ALLOWED_ROLES: UserRole[] = ['ADMINISTRADOR', 'GERENTE', 'OPERATIVO'];

const formatCurrency = (amount: number | null | undefined) => `C$${(amount || 0).toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

interface CreditLists {
  pending: CreditDetail[];
  disbursedToday: CreditDetail[];
  deniedToday: CreditDetail[];
}

export default function DisbursementsPage() {
  const { user } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const [creditLists, setCreditLists] = React.useState<CreditLists>({ pending: [], disbursedToday: [], deniedToday: [] });
  const [isLoading, setIsLoading] = React.useState(true);
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [selectedCredit, setSelectedCredit] = React.useState<CreditDetail | null>(null);
  const [isSheetOpen, setIsSheetOpen] = React.useState(false);
  const [isDisbursementFormOpen, setIsDisbursementFormOpen] = React.useState(false);
  const [isRejectionModalOpen, setIsRejectionModalOpen] = React.useState(false);

  const fetchDisbursements = React.useCallback(async () => {
    if (!user || !ALLOWED_ROLES.includes(user.role as UserRole)) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const { credits: allCredits } = await getCreditsAdmin({ user });

      const todayStr = todayInNicaragua();
      console.log('[DISBURSEMENTS] todayStr:', todayStr);

      const approvedCredits = allCredits.filter(c => c.status === 'Approved');
      const activeCredits = allCredits.filter(c => c.status === 'Active');
      const rejectedCredits = allCredits.filter(c => c.status === 'Rejected');

      const disbursedToday = activeCredits.filter(c => {
        if (!c.deliveryDate) return false;
        try {
          // Convertir la fecha UTC a Nicaragua antes de comparar (igual que el reporte)
          const deliveryDateNic = formatDateForUser(c.deliveryDate, 'yyyy-MM-dd');
          console.log('[DISBURSEMENTS] Credit:', c.creditNumber, 'deliveryDate:', c.deliveryDate, 'in Nicaragua:', deliveryDateNic, 'matches today?', deliveryDateNic === todayStr);
          return deliveryDateNic === todayStr;
        } catch (error) {
          console.error('Error parsing deliveryDate:', c.deliveryDate, error);
          return false;
        }
      });

      const deniedToday = rejectedCredits.filter(c => {
        if (!c.approvalDate) return false;
        try {
          // Convertir la fecha UTC a Nicaragua antes de comparar
          const approvalDateNic = formatDateForUser(c.approvalDate, 'yyyy-MM-dd');
          return approvalDateNic === todayStr;
        } catch (error) {
          console.error('Error parsing approvalDate:', c.approvalDate, error);
          return false;
        }
      });

      const clientIdsWithPending = [...new Set(approvedCredits.map(c => c.clientId))];
      const relevantActiveCredits = activeCredits.filter(ac => clientIdsWithPending.includes(ac.clientId));

      const enhancedPendingPromises = approvedCredits.map(async (credit) => {
        let outstandingBalance = 0;
        const activeCreditForClient = relevantActiveCredits.find(ac => ac.clientId === credit.clientId);
        if (activeCreditForClient) {
          // Fetch full credit details to get registeredPayments
          const fullActiveCredit = await getCredit(activeCreditForClient.id);
          if (fullActiveCredit) {
            outstandingBalance = calculateCreditStatusDetails(fullActiveCredit).remainingBalance;
          }
        }
        const netDisbursementAmount = credit.amount - outstandingBalance;
        return { ...credit, outstandingBalance, netDisbursementAmount: netDisbursementAmount > 0 ? netDisbursementAmount : 0, activeCreditId: activeCreditForClient?.id };
      });

      const enhancedPending = (await Promise.all(enhancedPendingPromises)).sort((a, b) => {
        if (!a.approvalDate || !b.approvalDate) return 0;
        try {
          const dateA = typeof a.approvalDate === 'string' ? parseISO(a.approvalDate) : new Date(a.approvalDate);
          const dateB = typeof b.approvalDate === 'string' ? parseISO(b.approvalDate) : new Date(b.approvalDate);
          if (!isValid(dateA) || !isValid(dateB)) return 0;
          return dateB.getTime() - dateA.getTime();
        } catch (error) {
          console.error('Error sorting by approvalDate:', error);
          return 0;
        }
      });

      setCreditLists({
        pending: enhancedPending,
        disbursedToday: disbursedToday.sort((a, b) => {
          if (!a.deliveryDate || !b.deliveryDate) return 0;
          try {
            const dateA = typeof a.deliveryDate === 'string' ? parseISO(a.deliveryDate) : new Date(a.deliveryDate);
            const dateB = typeof b.deliveryDate === 'string' ? parseISO(b.deliveryDate) : new Date(b.deliveryDate);
            if (!isValid(dateA) || !isValid(dateB)) return 0;
            return dateB.getTime() - dateA.getTime();
          } catch (error) {
            console.error('Error sorting by deliveryDate:', error);
            return 0;
          }
        }),
        deniedToday: deniedToday
      });

    } catch (error) {
      console.error("Error en la carga de datos (desembolsos): ", error);
      toast({ title: 'Error de Permisos', description: 'No se pudo cargar la lista de desembolsos. Contacte al administrador.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);


  React.useEffect(() => {
    fetchDisbursements();
  }, [fetchDisbursements]);

  const handleOpenSheet = async (credit: CreditDetail) => {
    const fullClient = await getClient(credit.clientId);
    const creditWithDetails = { ...credit, clientDetails: fullClient || undefined };
    setSelectedCredit(creditWithDetails);
    setIsSheetOpen(true);
  };

  const handleOpenDisbursementForm = async () => {
    if (!selectedCredit) return;
    setIsDisbursementFormOpen(true);
    setIsSheetOpen(false);
  }

  const openRejectionDialog = async () => {
    setIsSheetOpen(false);
    setIsRejectionModalOpen(true);
  }

  const handleDisbursement = async (data: DisbursementFormValues) => {
    if (!selectedCredit || !user) return;
    setIsProcessing(true);
    try {
      // Convertir la fecha del formulario a formato ISO
      const firstPaymentDateISO = userInputToISO(data.firstPaymentDate);
      if (!firstPaymentDateISO) {
        toast({ title: 'Error de Fecha', description: 'La fecha de primera cuota no es válida.', variant: 'destructive' });
        return;
      }

      // Si es un représtamo (hay saldo pendiente), liquidar el crédito anterior.
      if (selectedCredit.outstandingBalance && selectedCredit.outstandingBalance > 0 && (selectedCredit as any).activeCreditId) {
        const oldCreditId = (selectedCredit as any).activeCreditId;

        // 1. Registrar el pago de cancelación en el crédito antiguo.
        const payoffPaymentData = {
          paymentDate: nowInNicaragua(),
          amount: selectedCredit.outstandingBalance,
          managedBy: user.fullName, // El usuario que hace el desembolso
          transactionNumber: `REFIN-${selectedCredit.creditNumber}`,
          status: 'VALIDO' as const
        };
        await addPayment(oldCreditId, payoffPaymentData, user);
        // La función addPayment se encarga de cambiar el estado a 'Paid' si el saldo es 0.
      }

      // 2. Activar el nuevo crédito (lógica existente)
      await updateCreditAction(selectedCredit.id, {
        status: 'Active',
        disbursedAmount: selectedCredit.amount, // FIX: Usar el monto total aprobado, no el neto.
        firstPaymentDate: firstPaymentDateISO,
        deliveryDate: nowInNicaragua(), // Fecha automática del desembolso
        disbursedBy: user.fullName,
      }, user);

      toast({ title: `Crédito Desembolsado`, description: `El crédito para ${selectedCredit.clientName} ha sido activado.` });
      setIsDisbursementFormOpen(false);
      setSelectedCredit(null);
      await fetchDisbursements();
    } catch (error) {
      console.error("Error during disbursement transaction:", error);
      toast({ title: 'Error en Transacción', description: 'No se pudo procesar el desembolso.', variant: 'destructive' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRejection = async (reason: string) => {
    if (!selectedCredit || !user) return;
    setIsProcessing(true);
    try {
      await updateCreditAction(selectedCredit.id, {
        status: 'Rejected',
        rejectionReason: `Rechazado en etapa de desembolso: ${reason}`,
        rejectedBy: user.fullName,
        approvalDate: nowInNicaragua()
      }, user);
      toast({ title: `Crédito Rechazado`, description: `La solicitud para ${selectedCredit.clientName} ha sido rechazada.`, variant: 'destructive' });
      setIsRejectionModalOpen(false);
      setSelectedCredit(null);
      await fetchDisbursements();
    } catch (error) {
      toast({ title: 'Error', description: 'No se pudo procesar el rechazo.', variant: 'destructive' });
    } finally {
      setIsProcessing(false);
    }
  }

  if (isLoading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!user || !ALLOWED_ROLES.includes(user.role as UserRole)) {
    return <AccessDenied />;
  }

  const renderDesktopTable = (credits: CreditDetail[], type: 'pending' | 'disbursed' | 'denied') => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Cliente</TableHead>
          <TableHead>{type === 'pending' ? 'Monto a Entregar' : 'Monto Desembolsado'}</TableHead>
          <TableHead>Gestor</TableHead>
          <TableHead>{type === 'denied' ? 'Fecha de Rechazo' : 'Fecha Aprobación'}</TableHead>
          {type === 'pending' && <TableHead className="text-right">Acciones</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {credits.length > 0 ? (
          credits.map((credit) => (
            <TableRow key={credit.id}>
              <TableCell className="font-medium">{credit.clientName}</TableCell>
              <TableCell>{formatCurrency(type === 'pending' ? (credit.netDisbursementAmount ?? credit.amount) : (credit.disbursedAmount || credit.amount))}</TableCell>
              <TableCell>{credit.collectionsManager}</TableCell>
              <TableCell>{credit.approvalDate ? formatDateForUser(credit.approvalDate) : 'N/A'}</TableCell>
              {type === 'pending' &&
                <TableCell className="text-right">
                  <Button variant="outline" size="sm" onClick={() => handleOpenSheet(credit)}>
                    Ver Detalles
                  </Button>
                </TableCell>
              }
            </TableRow>
          ))
        ) : (
          <TableRow>
            <TableCell colSpan={5} className="h-24 text-center">
              No hay créditos en esta categoría.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );

  return (
    <>
      <div className="space-y-6">
        <Tabs defaultValue="pending" className="w-full">
          <TabsList className="grid w-full grid-cols-3 h-11 bg-muted/50 p-1">
            <TabsTrigger
              value="pending"
              className="data-[state=active]:bg-orange-500 data-[state=active]:text-white data-[state=active]:shadow-sm transition-all"
            >
              Por Desembolsar ({creditLists.pending.length})
            </TabsTrigger>
            <TabsTrigger
              value="disbursed"
              className="data-[state=active]:bg-green-600 data-[state=active]:text-white data-[state=active]:shadow-sm transition-all"
            >
              Desembolsados Hoy ({creditLists.disbursedToday.length})
            </TabsTrigger>
            <TabsTrigger
              value="denied"
              className="data-[state=active]:bg-red-600 data-[state=active]:text-white data-[state=active]:shadow-sm transition-all"
            >
              Denegados Hoy ({creditLists.deniedToday.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="mt-4">
            {renderDesktopTable(creditLists.pending, 'pending')}
          </TabsContent>
          <TabsContent value="disbursed" className="mt-4">
            {renderDesktopTable(creditLists.disbursedToday, 'disbursed')}
          </TabsContent>
          <TabsContent value="denied" className="mt-4">
            {renderDesktopTable(creditLists.deniedToday, 'denied')}
          </TabsContent>
        </Tabs>
      </div>

      <DisbursementDetailSheet
        isOpen={isSheetOpen}
        onClose={async () => setIsSheetOpen(false)}
        credit={selectedCredit}
        onDisburse={handleOpenDisbursementForm}
        onReject={openRejectionDialog}
      />

      <DisbursementForm
        isOpen={isDisbursementFormOpen}
        onClose={async () => {
          setIsDisbursementFormOpen(false);
          setSelectedCredit(null);
        }}
        credit={selectedCredit}
        onSubmit={handleDisbursement}
      />
      <RejectionDialog
        isOpen={isRejectionModalOpen}
        onClose={async () => setIsRejectionModalOpen(false)}
        onSubmit={handleRejection}
        isProcessing={isProcessing}
      />
    </>
  );
}
