'use client';

import React from 'react';
import { useHybridData } from '@/services/hybrid-data';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Search, CreditCard, User, Calendar, DollarSign, Wifi, WifiOff } from 'lucide-react';
import { formatDateForUser } from '@/lib/date-utils';
import type { CreditDetail } from '@/lib/types';
import Link from 'next/link';

// Función local para formatear moneda
const formatCurrency = (amount: number = 0) => `C$${amount.toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// Función local para formatear fecha
const formatDate = (dateInput: string | Date | null | undefined, formatString: string = 'dd/MM/yyyy'): string => {
  return formatDateForUser(dateInput, formatString);
};

export default function OfflineCreditsPage() {
  const { isOnline } = useOnlineStatus();
  const { getCredits, searchCredits, getDataSource } = useHybridData();
  
  const [credits, setCredits] = React.useState<CreditDetail[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [dataSource, setDataSource] = React.useState<'online' | 'offline' | 'none'>('none');

  React.useEffect(() => {
    loadCredits();
    checkDataSource();
  }, []);

  const loadCredits = async () => {
    setLoading(true);
    try {
      const data = await getCredits();
      setCredits(data);
    } catch (error) {
      console.error('Error loading credits:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkDataSource = async () => {
    const source = await getDataSource();
    setDataSource(source);
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.trim()) {
      setLoading(true);
      try {
        const results = await searchCredits(query);
        setCredits(results);
      } catch (error) {
        console.error('Error searching credits:', error);
      } finally {
        setLoading(false);
      }
    } else {
      loadCredits();
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'bg-green-500';
      case 'Pending': return 'bg-yellow-500';
      case 'Paid': return 'bg-blue-500';
      case 'Rejected': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'Active': return 'Activo';
      case 'Pending': return 'Pendiente';
      case 'Paid': return 'Pagado';
      case 'Rejected': return 'Rechazado';
      default: return status;
    }
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      {/* Header con estado de conexión */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Créditos</h1>
          <p className="text-muted-foreground">
            Gestión de créditos {isOnline ? 'online' : 'offline'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isOnline ? (
            <Badge variant="default" className="gap-1">
              <Wifi className="h-3 w-3" />
              Online
            </Badge>
          ) : (
            <Badge variant="secondary" className="gap-1">
              <WifiOff className="h-3 w-3" />
              Offline
            </Badge>
          )}
          <Badge variant="outline">
            {dataSource === 'online' ? 'Datos en vivo' : 
             dataSource === 'offline' ? 'Datos offline' : 'Sin datos'}
          </Badge>
        </div>
      </div>

      {/* Alerta de modo offline */}
      {!isOnline && dataSource === 'offline' && (
        <Alert>
          <WifiOff className="h-4 w-4" />
          <AlertDescription>
            Estás viendo datos offline. Los cambios se sincronizarán cuando vuelva la conexión.
          </AlertDescription>
        </Alert>
      )}

      {/* Sin datos disponibles */}
      {dataSource === 'none' && (
        <Alert>
          <AlertDescription>
            No hay datos disponibles offline. Conecta a internet para descargar datos.
          </AlertDescription>
        </Alert>
      )}

      {/* Barra de búsqueda */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por cliente, número de crédito..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={loadCredits} variant="outline">
          Actualizar
        </Button>
      </div>

      {/* Lista de créditos */}
      <div className="grid gap-4">
        {loading ? (
          // Skeleton loading
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-1/2" />
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                </div>
              </CardContent>
            </Card>
          ))
        ) : credits.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <CreditCard className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {searchQuery ? 'No se encontraron créditos' : 'No hay créditos disponibles'}
              </p>
            </CardContent>
          </Card>
        ) : (
          credits.map((credit) => (
            <Card key={credit.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{credit.creditNumber}</CardTitle>
                  <Badge className={getStatusColor(credit.status)}>
                    {getStatusText(credit.status)}
                  </Badge>
                </div>
                <CardDescription className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  {credit.clientName}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Monto</p>
                      <p className="font-medium">{formatCurrency(credit.amount)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Primer Pago</p>
                      <p className="font-medium">{formatDate(credit.firstPaymentDate)}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Gestor</p>
                    <p className="font-medium text-sm">{credit.collectionsManager || 'Sin asignar'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Frecuencia</p>
                    <p className="font-medium">{credit.paymentFrequency}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/credits/${credit.id}`}>
                      Ver Detalles
                    </Link>
                  </Button>
                  {credit.status === 'Active' && (
                    <Button asChild size="sm">
                      <Link href={`/credits/${credit.id}?action=payment`}>
                        Registrar Pago
                      </Link>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}