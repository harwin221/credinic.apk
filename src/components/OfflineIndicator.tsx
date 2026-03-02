'use client';

import React from 'react';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { useOfflineSync } from '@/services/offline-sync';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Wifi, WifiOff, RefreshCw, Database, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { useUser } from '@/hooks/use-user'; // Importar el hook useUser

export function OfflineIndicator() {
  const { user } = useUser(); // Obtener el usuario actual
  const { isOnline } = useOnlineStatus();
  const { syncNow, getStatus } = useOfflineSync();
  const [status, setStatus] = React.useState({
    hasData: false,
    lastSync: null as string | null,
    totalCredits: 0,
    totalClients: 0,
  });
  const [isSyncing, setIsSyncing] = React.useState(false);

  React.useEffect(() => {
    const updateStatus = async () => {
      const newStatus = await getStatus();
      setStatus(newStatus);
    };

    updateStatus();
    const interval = setInterval(updateStatus, 30000); // Actualizar cada 30 segundos

    return () => clearInterval(interval);
  }, [getStatus]);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await syncNow();
      const newStatus = await getStatus();
      setStatus(newStatus);
    } finally {
      setIsSyncing(false);
    }
  };

  // Si el usuario es ADMINISTRADOR, no renderizar el componente
  if (user?.role === 'ADMINISTRADOR') {
    return null;
  }

  const getLastSyncText = () => {
    if (!status.lastSync) return 'Nunca';
    try {
      return formatDistanceToNow(new Date(status.lastSync), { 
        addSuffix: true, 
        locale: es 
      });
    } catch {
      return 'Desconocido';
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          {isOnline ? (
            <>
              <Wifi className="h-4 w-4 text-green-500" />
              <span>Conectado</span>
            </>
          ) : (
            <>
              <WifiOff className="h-4 w-4 text-red-500" />
              <span>Modo Offline</span>
            </>
          )}
          <Badge variant={status.hasData ? "default" : "secondary"} className="ml-auto">
            {status.hasData ? "Datos disponibles" : "Sin datos"}
          </Badge>
        </CardTitle>
        <CardDescription className="text-xs">
          {isOnline 
            ? "Todas las funciones disponibles" 
            : status.hasData 
              ? "Funciones limitadas disponibles"
              : "Funcionalidad muy limitada"
          }
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {/* Estadísticas de datos offline */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-muted-foreground" />
            <span>Datos offline:</span>
          </div>
          <span className="font-medium">
            {status.totalCredits} créditos, {status.totalClients} clientes
          </span>
        </div>

        {/* Última sincronización */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>Última sync:</span>
          </div>
          <span className="font-medium text-muted-foreground">
            {getLastSyncText()}
          </span>
        </div>

        {/* Botón de sincronización */}
        {isOnline && (
          <Button 
            onClick={handleSync} 
            disabled={isSyncing}
            size="sm" 
            className="w-full"
            variant="outline"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Sincronizando...' : 'Sincronizar ahora'}
          </Button>
        )}

        {/* Mensaje de estado offline */}
        {!isOnline && (
          <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
            {status.hasData 
              ? "✅ Puedes ver créditos y registrar pagos. Los cambios se sincronizarán cuando vuelva la conexión."
              : "⚠️ Sin datos offline. Conecta a internet para descargar datos."
            }
          </div>
        )}
      </CardContent>
    </Card>
  );
}