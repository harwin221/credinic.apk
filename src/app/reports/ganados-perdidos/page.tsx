'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, TrendingUp, TrendingDown, Printer } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { ReportHeader } from '@/app/reports/components/ReportHeader';

interface ClienteGanadoPerdido {
  clientId: string;
  clientName: string;
  montoEntregado: number;
  fecha: string;
  promedioCredito: number;
  promedioCliente: number;
  estado: 'NUEVO' | 'INACTIVO' | 'PERDIDO';
}

interface GestorData {
  gestorName: string;
  ganados: ClienteGanadoPerdido[];
  perdidos: ClienteGanadoPerdido[];
  totalGanados: number;
  totalPerdidos: number;
  montoGanados: number;
  montoPerdidos: number;
}

function GanadosPerdidosReportContent() {
  const searchParams = useSearchParams();
  const [data, setData] = React.useState<GestorData[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        
        // Obtener parámetros de URL
        const sucursales = searchParams.getAll('sucursal');
        const users = searchParams.getAll('user');
        const from = searchParams.get('from');
        const to = searchParams.get('to');

        // Construir parámetros para el API
        if (sucursales.length > 0) {
          sucursales.forEach(s => params.append('sucursalId', s));
        }
        if (users.length > 0) {
          users.forEach(u => params.append('gestorId', u));
        }
        if (from) params.set('fechaDesde', from);
        if (to) params.set('fechaHasta', to);

        const response = await fetch(`/api/reports/ganados-perdidos?${params}`);
        const result = await response.json();

        if (result.success) {
          setData(result.data);
        }
      } catch (error) {
        console.error('Error generating report:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [searchParams]);

  const totalGeneral = data.reduce((acc, gestor) => ({
    ganados: acc.ganados + gestor.totalGanados,
    perdidos: acc.perdidos + gestor.totalPerdidos,
    montoGanados: acc.montoGanados + gestor.montoGanados,
    montoPerdidos: acc.montoPerdidos + gestor.montoPerdidos,
  }), { ganados: 0, perdidos: 0, montoGanados: 0, montoPerdidos: 0 });

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="ml-2">Generando reporte de créditos ganados y perdidos...</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 print-container bg-white text-black">
      <div className="report-container mx-auto">
        <ReportHeader title="Reporte Créditos Ganados y Perdidos" />
        
        <div className="flex justify-end mb-4 no-print gap-2">
          <Button onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" /> Imprimir
          </Button>
        </div>

        {data.length > 0 ? (
          <div className="space-y-6">
            {/* Resumen General */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Clientes Ganados</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="text-2xl font-bold text-green-600">{totalGeneral.ganados}</div>
                    <TrendingUp className="h-8 w-8 text-green-600" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatCurrency(totalGeneral.montoGanados)}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Clientes Perdidos</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="text-2xl font-bold text-red-600">{totalGeneral.perdidos}</div>
                    <TrendingDown className="h-8 w-8 text-red-600" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatCurrency(totalGeneral.montoPerdidos)}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Balance Neto</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {totalGeneral.ganados - totalGeneral.perdidos > 0 ? '+' : ''}
                    {totalGeneral.ganados - totalGeneral.perdidos}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Clientes</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Balance Monto</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatCurrency(totalGeneral.montoGanados - totalGeneral.montoPerdidos)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Diferencia</p>
                </CardContent>
              </Card>
            </div>

            {/* Detalle por Gestor */}
            {data.map((gestorData) => (
              <Card key={gestorData.gestorName}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Gestor: {gestorData.gestorName}</span>
                    <div className="flex gap-4 text-sm font-normal">
                      <span className="text-green-600">+{gestorData.totalGanados} Ganados</span>
                      <span className="text-red-600">-{gestorData.totalPerdidos} Perdidos</span>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* GANADOS */}
                  {gestorData.ganados.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold mb-3 text-green-600 flex items-center gap-2">
                        <TrendingUp className="h-5 w-5" />
                        GANADOS
                      </h3>
                      <div className="border rounded-lg overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Nombre del Cliente</TableHead>
                              <TableHead className="text-right">Monto Entregado</TableHead>
                              <TableHead>Fecha Entrega</TableHead>
                              <TableHead className="text-right">Promedio Crédito</TableHead>
                              <TableHead className="text-right">Promedio Cliente</TableHead>
                              <TableHead>Estado Cliente</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {gestorData.ganados.map((cliente) => (
                              <TableRow key={cliente.clientId}>
                                <TableCell className="font-medium">{cliente.clientName}</TableCell>
                                <TableCell className="text-right">{formatCurrency(cliente.montoEntregado)}</TableCell>
                                <TableCell>{new Date(cliente.fecha).toLocaleDateString('es-NI')}</TableCell>
                                <TableCell className="text-right">{cliente.promedioCredito.toFixed(2)}</TableCell>
                                <TableCell className="text-right">{cliente.promedioCliente.toFixed(2)}</TableCell>
                                <TableCell>
                                  <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                    cliente.estado === 'NUEVO' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                                  }`}>
                                    {cliente.estado}
                                  </span>
                                </TableCell>
                              </TableRow>
                            ))}
                            <TableRow className="bg-green-50 font-semibold">
                              <TableCell>TOTAL</TableCell>
                              <TableCell className="text-right">{formatCurrency(gestorData.montoGanados)}</TableCell>
                              <TableCell colSpan={3}></TableCell>
                              <TableCell>{gestorData.totalGanados} clientes</TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}

                  {/* PERDIDOS */}
                  {gestorData.perdidos.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold mb-3 text-red-600 flex items-center gap-2">
                        <TrendingDown className="h-5 w-5" />
                        PERDIDOS
                      </h3>
                      <div className="border rounded-lg overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Nombre del Cliente</TableHead>
                              <TableHead className="text-right">Monto Entregado</TableHead>
                              <TableHead>Fecha Cancelación</TableHead>
                              <TableHead className="text-right">Promedio Crédito</TableHead>
                              <TableHead className="text-right">Promedio Cliente</TableHead>
                              <TableHead>Estado Cliente</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {gestorData.perdidos.map((cliente) => (
                              <TableRow key={cliente.clientId}>
                                <TableCell className="font-medium">{cliente.clientName}</TableCell>
                                <TableCell className="text-right">{formatCurrency(cliente.montoEntregado)}</TableCell>
                                <TableCell>{new Date(cliente.fecha).toLocaleDateString('es-NI')}</TableCell>
                                <TableCell className="text-right">{cliente.promedioCredito.toFixed(2)}</TableCell>
                                <TableCell className="text-right">{cliente.promedioCliente.toFixed(2)}</TableCell>
                                <TableCell>
                                  <span className="px-2 py-1 rounded text-xs font-semibold bg-red-100 text-red-800">
                                    {cliente.estado}
                                  </span>
                                </TableCell>
                              </TableRow>
                            ))}
                            <TableRow className="bg-red-50 font-semibold">
                              <TableCell>TOTAL</TableCell>
                              <TableCell className="text-right">{formatCurrency(gestorData.montoPerdidos)}</TableCell>
                              <TableCell colSpan={3}></TableCell>
                              <TableCell>{gestorData.totalPerdidos} clientes</TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No se encontraron datos para los filtros seleccionados
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

export default function GanadosPerdidosPage() {
  return (
    <React.Suspense fallback={
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="ml-2">Cargando reporte...</p>
      </div>
    }>
      <GanadosPerdidosReportContent />
    </React.Suspense>
  );
}
