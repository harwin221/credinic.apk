'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Loader2, RefreshCw, CheckCircle, AlertTriangle, Wrench } from 'lucide-react';
import { useUser } from '@/hooks/use-user';
import { AccessDenied } from '@/components/AccessDenied';

interface PaymentPlanDiagnostic {
  summary: {
    totalActiveCredits: number;
    creditsWithPlan: number;
    creditsWithoutPlan: number;
  };
  creditsWithoutPlan: {
    id: string;
    creditNumber: string;
    clientName: string;
  }[];
}

export default function PaymentPlansDiagnosticPage() {
  const { user } = useUser();
  const { toast } = useToast();
  const [diagnostic, setDiagnostic] = React.useState<PaymentPlanDiagnostic | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isFixing, setIsFixing] = React.useState<string | null>(null);

  const fetchDiagnostic = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/payment-plans/check');
      const data = await response.json();
      
      if (data.success) {
        setDiagnostic(data);
      } else {
        throw new Error(data.error || 'Error obteniendo diagnóstico');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo obtener el diagnóstico de planes de pago.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fixPaymentPlan = async (creditId: string, creditNumber: string) => {
    setIsFixing(creditId);
    try {
      const response = await fetch('/api/payment-plans/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ creditId })
      });
      
      const result = await response.json();
      
      if (result.success && result.created) {
        toast({
          title: 'Plan de Pagos Creado',
          description: `Se generó el plan de pagos para el crédito ${creditNumber}.`
        });
        fetchDiagnostic(); // Refrescar diagnóstico
      } else if (result.success && !result.created) {
        toast({
          title: 'Plan Ya Existe',
          description: `El crédito ${creditNumber} ya tiene un plan de pagos.`
        });
      } else {
        throw new Error(result.error || 'Error creando plan de pagos');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: `No se pudo crear el plan de pagos para ${creditNumber}.`,
        variant: 'destructive'
      });
    } finally {
      setIsFixing(null);
    }
  };

  React.useEffect(() => {
    if (user?.role === 'ADMINISTRADOR') {
      fetchDiagnostic();
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
          <h1 className="text-2xl font-bold">Diagnóstico de Planes de Pago</h1>
          <p className="text-muted-foreground">Verifica y corrige créditos sin planes de pago</p>
        </div>
        <Button onClick={fetchDiagnostic} disabled={isLoading}>
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Actualizar Diagnóstico
        </Button>
      </div>

      {diagnostic && (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Créditos Activos</CardTitle>
                <RefreshCw className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{diagnostic.summary.totalActiveCredits}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Con Plan de Pagos</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{diagnostic.summary.creditsWithPlan}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Sin Plan de Pagos</CardTitle>
                <AlertTriangle className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{diagnostic.summary.creditsWithoutPlan}</div>
              </CardContent>
            </Card>
          </div>

          {diagnostic.creditsWithoutPlan.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  Créditos Sin Plan de Pagos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Número de Crédito</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {diagnostic.creditsWithoutPlan.map((credit) => (
                      <TableRow key={credit.id}>
                        <TableCell className="font-medium">{credit.creditNumber}</TableCell>
                        <TableCell>{credit.clientName}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            onClick={() => fixPaymentPlan(credit.id, credit.creditNumber)}
                            disabled={isFixing === credit.id}
                          >
                            {isFixing === credit.id ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <Wrench className="mr-2 h-4 w-4" />
                            )}
                            {isFixing === credit.id ? 'Creando...' : 'Crear Plan'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {diagnostic.creditsWithoutPlan.length === 0 && (
            <Card>
              <CardContent className="text-center py-8">
                <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-green-600 mb-2">¡Todo en Orden!</h3>
                <p className="text-muted-foreground">Todos los créditos activos tienen sus planes de pago correctamente generados.</p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}