
'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Loader2, Search } from 'lucide-react';
import { searchActiveCreditsGlobally } from '@/services/credit-service-server';
import { getClient } from '@/services/client-service';
import { searchOfflineCredits, getOfflineClient } from '@/services/offline-db';
import { useOnlineStatus } from '@/hooks/use-online-status';
import type { CreditDetail, Client } from '@/lib/types';
import { useDebounce } from 'use-debounce';
import { useUser } from '@/hooks/use-user';

interface CreditWithClient extends CreditDetail {
  clientDetails: Client;
}
interface CreditSearchDialogProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'credit' | 'statement';
  onSelectCreditForPayment: (credit: CreditDetail) => void;
}

export function CreditSearchDialog({ isOpen, onClose, mode, onSelectCreditForPayment }: CreditSearchDialogProps) {
  const router = useRouter();
  const { user } = useUser();
  const [searchTerm, setSearchTerm] = React.useState('');
  const [debouncedSearchTerm] = useDebounce(searchTerm, 300);
  const [results, setResults] = React.useState<CreditWithClient[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const { isOnline } = useOnlineStatus();

  React.useEffect(() => {
    if (debouncedSearchTerm.length > 2 && user) {
      const fetchResults = async () => {
        setIsLoading(true);
        try {
          // Detectar conexión real
          const isReallyOnline = navigator.onLine && isOnline;

          if (!isReallyOnline) {
            console.log("🔍 Buscando en modo offline...");
            const offlineCredits = await searchOfflineCredits(debouncedSearchTerm);
            const resultsWithDetails = await Promise.all(
              offlineCredits.map(async (credit) => {
                const client = await getOfflineClient(credit.clientId);
                return { ...credit, clientDetails: client || {} as Client };
              })
            );
            setResults(resultsWithDetails as CreditWithClient[]);
            setIsLoading(false);
            return;
          }

          // Modo Online
          const credits = await searchActiveCreditsGlobally(debouncedSearchTerm);
          const creditsWithDetails = await Promise.all(
            credits.map(async (credit) => {
              const client = await getClient(credit.clientId);
              return { ...credit, clientDetails: client! };
            })
          );
          setResults(creditsWithDetails.filter(c => c.clientDetails) as CreditWithClient[]);
        } catch (error) {
          console.error("Error en búsqueda:", error);
          // Fallback a offline si falló el fetch
          const offlineCredits = await searchOfflineCredits(debouncedSearchTerm);
          const resultsWithDetails = await Promise.all(
            offlineCredits.map(async (credit) => {
              const client = await getOfflineClient(credit.clientId);
              return { ...credit, clientDetails: client || {} as Client };
            })
          );
          setResults(resultsWithDetails as CreditWithClient[]);
        } finally {
          setIsLoading(false);
        }
      };
      fetchResults();
    } else {
      setResults([]);
    }
  }, [debouncedSearchTerm, user, isOnline]);

  React.useEffect(() => {
    if (!isOpen) {
      setSearchTerm('');
      setResults([]);
    }
  }, [isOpen]);

  const handleSelect = (credit: CreditWithClient) => {
    onClose();
    if (mode === 'credit') {
      onSelectCreditForPayment(credit);
    } else {
      router.push(`/reports/account-statement?clientId=${credit.clientId}`);
    }
  };

  const getFullAddress = (client: Client) => {
    return [
      client?.department,
      client?.municipality,
      client?.neighborhood,
      client?.address,
    ].filter(Boolean).join(', ');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] sm:max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === 'credit' ? 'Buscar Cliente para Pago' : 'Buscar Estado de Cuenta'}
          </DialogTitle>
          <DialogDescription>
            Escribe el nombre, cédula o código del cliente para encontrar su crédito activo.
          </DialogDescription>
        </DialogHeader>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            autoFocus
          />
        </div>
        <div className="mt-4 max-h-60 overflow-y-auto">
          {isLoading && (
            <div className="flex justify-center items-center py-4">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          )}
          {!isLoading && results.length > 0 && (
            <ul className="space-y-2">
              {results.map((credit) => (
                <li
                  key={credit.id}
                  onClick={() => handleSelect(credit)}
                  className="p-3 rounded-md hover:bg-accent cursor-pointer"
                >
                  <p className="font-medium">{credit.clientName}</p>
                  <p className="text-sm text-muted-foreground">Crédito #{credit.creditNumber}</p>
                  <p className="text-xs text-muted-foreground mt-1">{getFullAddress(credit.clientDetails)}</p>
                </li>
              ))}
            </ul>
          )}
          {!isLoading && debouncedSearchTerm.length > 2 && results.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-4">No se encontraron resultados.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
