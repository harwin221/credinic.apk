'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, TrendingUp, TrendingDown, Download } from 'lucide-react';
import { useUser } from '@/hooks/use-user';
import { getSucursales } from '@/services/sucursal-service';
import { getUsers } from '@/services/user-service-client';
import type { Sucursal, AppUser } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';

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

export default function GanadosPerdidosPage() {
  const { user } = useUser();
  const [loading, setLoading] = useState(false);
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [gestores, setGestores] = useState<AppUser[]>([]);
  const [allGestores, setAllGestores] = useState<AppUser[]>([]);
  
  const [selectedSucursal, setSelectedSucursal] = useState<string>('');
  const [selectedGestor, setSelectedGestor] = useState<string>('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  
  const [data, setData] = useState<GestorData[]>([]);

  const isAdmin = user?.role === 'ADMINISTRADOR';
  const isGerente = user?.role === 'GERENTE';

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [sucursalesData, usersData] = await Promise.all([
          getSucursales(),
          getUsers()
        ]);

        if (sucursalesData) setSucursales(sucursalesData);
        
        const gestoresData = usersData.filter(u => u.role === 'GESTOR');
        setAllGestores(gestoresData);

        if (isGerente && user?.sucursal) {
          setSelectedSucursal(user.sucursal);
          setGestores(gestoresData.filter(g => g.sucursal === user.sucursal));
        } else if (isAdmin) {
          setGestores(gestoresData);
        }

        // Establecer fechas por defecto (mes actual)
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        setFechaDesde(firstDay.toISOString().split('T')[0]);
        setFechaHasta(today.toISOString().split('T')[0]);

      } catch (error) {
        console.error('Error fetching initial data:', error);
      }
    };

    if (user) fetchInitialData();
  }, [user, isAdmin, isGerente]);

  useEffect(() => {
    if (selectedSucursal && isAdmin) {
      const filtered = allGestores.filter(g => g.sucursal === selectedSucursal);
      setGestores(filtered);
      setSelectedGestor('');
    }
  }, [selectedSucursal, allGestores, isAdmin]);

  const handleGenerate = async () => {
    if (!fechaDesde || !fechaHasta) {
      alert('Por favor selecciona el rango de fechas');
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams({
        fechaDesde,
        fechaHasta,
        ...(selectedSucursal && { sucursalId: selectedSucursal }),
        ...(selectedGestor && { gestorId: selectedGestor }),
      });

      const response = await fetch(`/api/reports/ganados-perdidos?${params}`);
      const result = await response.json();

      if (result.success) {
        setData(result.data);
      } else {
        alert('Error al generar el reporte');
      }
    } catch (error) {
      console.error('Error generating report:', error);
      alert('Error al generar el reporte');
    } finally {
      setLoading(false);
    }
  };

  const totalGeneral = data.reduce((acc, gestor) => ({
    ganados: acc.ganados + gestor.totalGanados,
    perdidos: acc.perdidos + gestor.totalPerdidos,
    montoGanados: acc.montoGanados + gestor.montoGanados,
    montoPerdidos: acc.montoPerdidos + gestor.montoPerdidos,
  }), { ganados: 0, perdidos: 0, montoGanados: 0, montoPerdidos: 0 });

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Créditos Ganados y Perdidos</h1>
          <p className="text-muted-foreground">Análisis de clientes nuevos, recuperados y perdidos por gestor</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>Selecciona los criterios para generar el reporte</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {isAdmin && (
              <div className="space-y-2">
                <Label>Sucursal</Label>
                <Select value={selectedSucursal} onValueChange={setSelectedSucursal}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas las sucursales" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las sucursales</SelectItem>
                    {sucursales.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Gestor</Label>
              <Select value={selectedGestor} onValueChange={setSelectedGestor}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos los gestores" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los gestores</SelectItem>
                  {gestores.map(g => (
                    <SelectItem key={g.id} value={g.id}>{g.fullName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Fecha Desde</Label>
              <Input
                type="date"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Fecha Hasta</Label>
              <Input
                type="date"
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
              />
            </div>
          </div>

          <Button onClick={handleGenerate} disabled={loading} className="w-full md:w-auto">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generando...
              </>
            ) : (
              'Generar Reporte'
            )}
          </Button>
        </CardContent>
      </Card>

      {data.length > 0 && (
        <>
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
        </>
      )}

      {data.length === 0 && !loading && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Selecciona los filtros y genera el reporte para ver los resultados
          </CardContent>
        </Card>
      )}
    </div>
  );
}
