
'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Save, Users, Banknote, ArrowRightLeft } from 'lucide-react';
import { useUser } from '@/hooks/use-user';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { BilletajeForm } from './BilletajeForm';
import { generateDailyActivityReport, type DailyActivityReport } from '@/services/closure-service';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format, parseISO } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getUsers } from '@/services/user-service-client';
import type { User, UserRole, CashClosure } from '@/lib/types';
import { saveClosure } from '../actions';


const formatCurrency = (amount: number, currency: 'NIO' | 'USD' = 'NIO') => {
    return new Intl.NumberFormat('es-NI', {
        style: 'currency',
        currency: currency,
        currencyDisplay: 'code'
    }).format(amount).replace(currency, '').trim();
};

const NIO_KEYS = ['1000', '500', '200', '100', '50', '20', '10', '5', '1', '0.50', '0.25'];
const USD_KEYS = ['100', '50', '20', '10', '5', '1'];

const createInitialDenominations = (keys: string[]) => {
    const denoms: Record<string, { value: number; count: number }> = {};
    keys.forEach(k => denoms[k] = { value: parseFloat(k), count: 0 });
    return denoms;
};

export function ClosureForm() {
  const { user } = useUser();
  const { toast } = useToast();
  const router = useRouter();
  const [reportData, setReportData] = React.useState<DailyActivityReport | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  
  const [fieldUsers, setFieldUsers] = React.useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = React.useState<string>('');
  const [selectedUser, setSelectedUser] = React.useState<User | null>(null);

  const [nioDenominations, setNioDenominations] = React.useState(() => createInitialDenominations(NIO_KEYS));
  const [usdDenominations, setUsdDenominations] = React.useState(() => createInitialDenominations(USD_KEYS));
  
  const [exchangeRate, setExchangeRate] = React.useState(37.50);
  const [clientDeposits, setClientDeposits] = React.useState(0);
  const [manualTransfers, setManualTransfers] = React.useState(0);

  React.useEffect(() => {
    const fetchFieldUsers = async () => {
        const allUsers = await getUsers();
        let availableUsers = [];
        
        if (user?.role === 'ADMINISTRADOR' || user?.role === 'FINANZAS') {
            // Pueden arquear a GERENTES y GESTORES de todas las sucursales
            availableUsers = allUsers.filter(u => ['GERENTE', 'GESTOR'].includes(u.role));
        } else if (user?.role === 'GERENTE') {
            // Pueden arquear a GESTORES de su sucursal y a sí mismos
            availableUsers = allUsers.filter(u => 
                (u.role === 'GESTOR' && u.sucursal === user.sucursal) || 
                (u.role === 'GERENTE' && u.id === user.id)
            );
        } else if (user?.role === 'OPERATIVO') {
            // Pueden arquear a GERENTES y GESTORES de su sucursal
            availableUsers = allUsers.filter(u => 
                ['GERENTE', 'GESTOR'].includes(u.role) && u.sucursal === user.sucursal
            );
        } else {
            // Para otros roles, solo GESTORES (comportamiento anterior)
            availableUsers = allUsers.filter(u => u.role === 'GESTOR');
        }
        
        setFieldUsers(availableUsers);
    };
    fetchFieldUsers();
  }, [user]);
  
  const handleUserSelection = (userId: string) => {
    setSelectedUserId(userId);
    const userFound = fieldUsers.find(u => u.id === userId);
    setSelectedUser(userFound || null);
  }

  const handleDenominationChange = (currency: 'NIO' | 'USD', key: string, count: number) => {
    if (currency === 'NIO') {
      setNioDenominations(prev => ({
        ...prev,
        [key]: { ...prev[key], count }
      }));
    } else {
      setUsdDenominations(prev => ({
        ...prev,
        [key]: { ...prev[key], count }
      }));
    }
  };
  
  React.useEffect(() => {
    if (selectedUserId) {
      const fetchData = async () => {
        setIsLoading(true);
        try {
          const data = await generateDailyActivityReport(selectedUserId);
          setReportData(data);
        } catch (error) {
          toast({ title: 'Error', description: 'No se pudo cargar la actividad del día para este usuario.', variant: 'destructive' });
        }
        setIsLoading(false);
      };
      fetchData();
    } else {
        setReportData(null);
        setIsLoading(false);
    }
  }, [selectedUserId, toast]);

  const totalNIO = React.useMemo(() => NIO_KEYS.reduce((sum, key) => sum + (nioDenominations[key].value * nioDenominations[key].count), 0), [nioDenominations]);
  const totalUSD = React.useMemo(() => USD_KEYS.reduce((sum, key) => sum + (usdDenominations[key].value * usdDenominations[key].count), 0), [usdDenominations]);
  const totalUSDinNIO = totalUSD * exchangeRate;
  const physicalTotal = totalNIO + totalUSDinNIO + clientDeposits;
  
  const userRole = selectedUser?.role.toUpperCase() as UserRole | undefined;

  let systemExpectedCash = 0;
  if (reportData) {
      if (userRole === 'GESTOR') {
          systemExpectedCash = reportData.collections.totalActivityAmount - manualTransfers;
      } else if (userRole === 'GERENTE') {
          systemExpectedCash = reportData.collections.totalActivityAmount - (reportData.disbursements.totalActivityAmount + manualTransfers);
      }
  }

  const difference = physicalTotal - systemExpectedCash;

  const handleSubmit = async () => {
      if (!user || !selectedUser) {
        toast({ title: "Error", description: "Falta información del usuario.", variant: "destructive" });
        return;
      }
    setIsSubmitting(true);
    
    const nioDenominationsSummary = NIO_KEYS.reduce((acc, key) => {
        if(nioDenominations[key].count > 0) acc[key] = nioDenominations[key].count;
        return acc;
    }, {} as Record<string, number>);
    
    const usdDenominationsSummary = USD_KEYS.reduce((acc, key) => {
        if(usdDenominations[key].count > 0) acc[key] = usdDenominations[key].count;
        return acc;
    }, {} as Record<string, number>);

     const closureData: Omit<CashClosure, 'id' | 'closureDate'> = {
        userId: selectedUser.id,
        userName: selectedUser.fullName,
        sucursalId: selectedUser.sucursal || 'N/A',
        systemBalance: systemExpectedCash,
        physicalBalance: physicalTotal,
        difference: difference,
        denominationsNIO: nioDenominationsSummary,
        denominationsUSD: usdDenominationsSummary,
        exchangeRate: exchangeRate,
        clientDeposits: clientDeposits,
        manualTransfers,
        closedByUserId: user.id,
        closedByUserName: user.fullName,
    };
    
    try {
        const result = await saveClosure(closureData, user);
        if (result.success) {
            toast({
                title: 'Arqueo Guardado Correctamente',
                description: `El arqueo para ${selectedUser.fullName} ha sido guardado.`,
            });
            router.push('/reports/closures-history');
        } else {
            throw new Error(result.error || 'No se pudo guardar el arqueo.');
        }
    } catch (error: any) {
        toast({ title: 'Error al Guardar', description: error.message, variant: 'destructive' });
    } finally {
        setIsSubmitting(false);
    }
  };
  
  const renderSystemSummary = () => {
    if (!reportData) return null;

    const cards = [];
    
    if (userRole === 'GESTOR') {
        cards.push(
            <div key="cobranza" className="p-4 bg-green-50 rounded-lg">
                <p className="text-sm font-medium text-green-700">Total Cobranza</p>
                <p className="text-2xl font-bold text-green-800">C$ {formatCurrency(reportData.collections.totalActivityAmount)}</p>
            </div>
        );
    } else { // Gerente and others
        cards.push(
             <div key="cobranza" className="p-4 bg-green-50 rounded-lg">
                <p className="text-sm font-medium text-green-700">Total Cobranza</p>
                <p className="text-2xl font-bold text-green-800">C$ {formatCurrency(reportData.collections.totalActivityAmount)}</p>
            </div>
        );
        cards.push(
            <div key="desembolsos" className="p-4 bg-red-50 rounded-lg">
                <p className="text-sm font-medium text-red-700">Total Desembolsos</p>
                <p className="text-2xl font-bold text-red-800">C$ {formatCurrency(reportData.disbursements.totalActivityAmount)}</p>
            </div>
        );
    }
    
     cards.push(
        <div key="esperado" className="p-4 bg-blue-50 rounded-lg">
            <p className="text-sm font-medium text-blue-700">Efectivo Esperado en Caja</p>
            <p className="text-2xl font-bold text-blue-800">C$ {formatCurrency(systemExpectedCash)}</p>
        </div>
    );

    return <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">{cards}</div>;
  };

  return (
    <div className="space-y-6">
        <Card>
            <CardHeader>
                <CardTitle>Selección de Usuario</CardTitle>
                <CardDescription>Elige al usuario de campo para realizar su arqueo de caja.</CardDescription>
            </CardHeader>
            <CardContent>
                <Select value={selectedUserId} onValueChange={handleUserSelection}>
                     <SelectTrigger className="w-full md:w-1/2">
                        <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <SelectValue placeholder="Seleccionar un usuario..." />
                        </div>
                    </SelectTrigger>
                    <SelectContent>
                        {fieldUsers.map(u => (
                            <SelectItem key={u.id} value={u.id}>
                                {u.fullName} ({u.role})
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </CardContent>
        </Card>

        {isLoading ? (
             <div className="flex h-64 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-2">Cargando actividad del día...</p>
            </div>
        ) : !selectedUserId ? (
             <div className="text-center text-muted-foreground py-16">
                <p>Por favor, selecciona un usuario para ver su actividad.</p>
            </div>
        ) : reportData && (
            <>
            <Card>
                <CardHeader>
                    <CardTitle>Resumen de Actividad del Sistema</CardTitle>
                    <CardDescription>Saldos esperados en caja según las transacciones del día para el usuario seleccionado.</CardDescription>
                </CardHeader>
                <CardContent>
                    {renderSystemSummary()}
                </CardContent>
            </Card>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <BilletajeForm denominations={nioDenominations} onDenominationChange={handleDenominationChange} currency="NIO" />
                <BilletajeForm denominations={usdDenominations} onDenominationChange={handleDenominationChange} currency="USD" />
        </div>
        
        <Card>
                <CardHeader><CardTitle>Totales y Cierre</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="client-deposits">Depósitos de Clientes (Banco)</Label>
                             <div className="relative">
                                <Banknote className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input 
                                    id="client-deposits"
                                    type="number" 
                                    placeholder="0.00"
                                    value={clientDeposits || ''} 
                                    onChange={e => setClientDeposits(parseFloat(e.target.value) || 0)} 
                                    className="pl-9" 
                                />
                             </div>
                        </div>
                         <div>
                            <Label htmlFor="manual-transfers">Transferencias (Manual)</Label>
                             <div className="relative">
                                <ArrowRightLeft className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input 
                                    id="manual-transfers"
                                    type="number" 
                                    placeholder="0.00"
                                    value={manualTransfers || ''} 
                                    onChange={e => setManualTransfers(parseFloat(e.target.value) || 0)} 
                                    className="pl-9" 
                                />
                             </div>
                        </div>
                    </div>
                     <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 items-end pt-4 border-t">
                        <div><Label>Total Físico C$</Label><Input readOnly value={formatCurrency(totalNIO)} className="font-bold text-lg h-11" /></div>
                        <div><Label>Total Físico U$</Label><Input readOnly value={formatCurrency(totalUSD, 'USD')} className="font-bold text-lg h-11" /></div>
                        <div className="grid grid-cols-2 gap-2">
                            <div><Label>T.C.</Label><Input type="number" value={exchangeRate} onChange={e => setExchangeRate(parseFloat(e.target.value) || 0)} className="h-11"/></div>
                            <div><Label>Conversión a C$</Label><Input readOnly value={formatCurrency(totalUSDinNIO)} className="font-bold text-lg h-11 bg-muted" /></div>
                        </div>
                        <div><Label>Subtotal C$ + U$ + Dep.</Label><Input readOnly value={formatCurrency(physicalTotal)} className="font-bold text-lg h-11 bg-blue-100" /></div>
                    </div>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 items-center pt-4 border-t">
                        <div className="lg:col-span-2" />
                        <div className="font-semibold text-right text-lg">Diferencia:</div>
                        <Input readOnly value={formatCurrency(difference)} className={`font-bold text-lg h-11 ${difference === 0 ? 'bg-green-100' : 'bg-red-100'}`} />
                    </div>
                </CardContent>
        </Card>

        <Card>
                <CardHeader><CardTitle>Lista de Abonos Recibidos Hoy</CardTitle></CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader><TableRow><TableHead>Consecutivo</TableHead><TableHead>Cliente</TableHead><TableHead className="text-right">Monto</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {reportData.collections.transactions.length > 0 ? (
                                reportData.collections.transactions.map(tx => (
                                    <TableRow key={tx.id}>
                                        <TableCell>{tx.id.slice(-6)}</TableCell>
                                        <TableCell>{tx.description}</TableCell>
                                        <TableCell className="text-right">{formatCurrency(tx.amount)}</TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow><TableCell colSpan={3} className="text-center h-24">No hay abonos registrados hoy.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
        </Card>
        
        <div className="flex justify-end pt-4">
                <Button size="lg" onClick={handleSubmit} disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4" />}
                    Guardar Arqueo
                </Button>
        </div>
        </>
        )}
    </div>
  );
}
