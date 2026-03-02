
'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Loader2, Search } from 'lucide-react';
import { getClients as getClientsServer } from '@/services/client-service-server';
import type { Client } from '@/lib/types';
import { useDebounce } from 'use-debounce';
import { useRouter } from 'next/navigation';
import { useUser } from '@/hooks/use-user';

interface ReportClientSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportUrl: string;
  reportTitle: string;
}

export function ReportClientSearchModal({
  isOpen,
  onClose,
  reportUrl,
  reportTitle,
}: ReportClientSearchModalProps) {
  const router = useRouter();
  const { user } = useUser();
  const [searchTerm, setSearchTerm] = React.useState('');
  const [debouncedSearchTerm] = useDebounce(searchTerm, 300);
  const [results, setResults] = React.useState<Client[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);

  React.useEffect(() => {
    if (debouncedSearchTerm.length > 2 && user) {
      const fetchResults = async () => {
        setIsLoading(true);
        // Indica a la función que es para una búsqueda general, no para el dashboard del gestor.
        const { clients } = await getClientsServer({
          searchTerm: debouncedSearchTerm,
          user: user,
          forSearch: true,
        });
        setResults(clients);
        setIsLoading(false);
      };
      fetchResults();
    } else {
      setResults([]);
    }
  }, [debouncedSearchTerm, user]);

  React.useEffect(() => {
    if (!isOpen) {
      setSearchTerm('');
      setResults([]);
    }
  }, [isOpen]);

  const handleSelect = (client: Client) => {
    const url = `${reportUrl}?clientId=${client.id}`;
    window.open(url, '_blank');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Generar: {reportTitle}</DialogTitle>
          <DialogDescription>
            Busca y selecciona un cliente para generar el reporte.
          </DialogDescription>
        </DialogHeader>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre, cédula o código..."
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
              {results.map((client) => (
                <li
                  key={client.id}
                  onClick={() => handleSelect(client)}
                  className="p-3 rounded-md hover:bg-accent cursor-pointer"
                >
                  <p className="font-medium">{client.name}</p>
                  <p className="text-sm text-muted-foreground">#{client.clientNumber}</p>
                </li>
              ))}
            </ul>
          )}
          {!isLoading && debouncedSearchTerm.length > 2 && results.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-4">
              No se encontraron resultados.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
