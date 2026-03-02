'use client';

import * as React from 'react';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, ArrowLeft, FilterX, Calendar as CalendarIcon, Search, ArrowRight } from 'lucide-react';
import { useUser } from '@/hooks/use-user';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import type { FundTransfer, Sucursal, UserRole, User } from '@/lib/types';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { AccessDenied } from '@/components/AccessDenied';
import { getSucursales } from '@/services/sucursal-service';
import { getUsers } from '@/services/user-service-client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useDebounce } from 'use-debounce';
import { Input } from '@/components/ui/input';

const ALLOWED_ROLES: UserRole[] = ['ADMINISTRADOR', 'OPERATIVO', 'FINANZAS', 'GERENTE', 'GESTOR', 'DESEMBOLSADOR'];

const formatCurrency = (amount: number) => `C$${amount.toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
import { formatDateTimeForUser } from '@/lib/date-utils';

const formatDate = (dateString: string) => formatDateTimeForUser(dateString);

export default function TransfersHistoryPage() {
    const { user } = useUser();
    const router = useRouter();
    const { toast } = useToast();
    const [transfers, setTransfers] = React.useState<FundTransfer[]>([]);
    const [filteredTransfers, setFilteredTransfers] = React.useState<FundTransfer[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    
    // --- Data for filters ---
    const [users, setUsers] = React.useState<User[]>([]);
    const [sucursales, setSucursales] = React.useState<Sucursal[]>([]);
    
    // --- Filter states ---
    const [selectedUser, setSelectedUser] = React.useState('all');
    const [selectedSucursal, setSelectedSucursal] = React.useState('all');
    const [selectedStatus, setSelectedStatus] = React.useState('all');
    const [dateFrom, setDateFrom] = React.useState<Date | undefined>();
    const [dateTo, setDateTo] = React.useState<Date | undefined>();
    const [searchTerm, setSearchTerm] = React.useState('');
    const [debouncedSearchTerm] = useDebounce(searchTerm, 500);

    const canView = user && ALLOWED_ROLES.includes(user.role.toUpperCase() as UserRole);
    const hasGlobalView = user && ['ADMINISTRADOR', 'FINANZAS', 'OPERATIVO'].includes(user.role.toUpperCase() as UserRole);

    React.useEffect(() => {
        if (!canView) {
            setIsLoading(false);
            return;
        }

        const fetchFilterData = async () => {
            const [fetchedUsers, fetchedSucursales] = await Promise.all([getUsers(), getSucursales()]);
            setUsers(fetchedUsers);
            setSucursales(fetchedSucursales);
        };
        fetchFilterData();

        // Esta sección está comentada porque la funcionalidad de transferencias fue descontinuada.
        // No se harán llamadas a la base de datos.
        setIsLoading(false);
        setTransfers([]);

    }, [canView, hasGlobalView, user, toast]);
    
     React.useEffect(() => {
        let filtered = transfers;

        if (selectedStatus !== 'all') {
            filtered = filtered.filter(t => t.status === selectedStatus);
        }
        if (debouncedSearchTerm) {
            const lowercasedFilter = debouncedSearchTerm.toLowerCase();
            filtered = filtered.filter(t =>
                t.fromUserName.toLowerCase().includes(lowercasedFilter) ||
                t.toUserName.toLowerCase().includes(lowercasedFilter)
            );
        }
        if (dateFrom) {
            filtered = filtered.filter(t => new Date(t.requestTimestamp) >= dateFrom);
        }
        if (dateTo) {
            filtered = filtered.filter(t => new Date(t.requestTimestamp) <= endOfDay(dateTo));
        }

        setFilteredTransfers(filtered);
    }, [transfers, selectedStatus, debouncedSearchTerm, dateFrom, dateTo]);


    if (!canView) return <AccessDenied />;
    
    if (isLoading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;

    const endOfDay = (date: Date): Date => {
        const newDate = new Date(date);
        newDate.setHours(23, 59, 59, 999);
        return newDate;
    };

    return (
        <div className="space-y-6">
             <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold tracking-tight">Historial de Transferencias</h2>
                <Button 
                    variant="default" 
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() => router.push('/arqueo')} 
                    prefetch={false}
                >
                    <ArrowLeft className="mr-2 h-4 w-4" /> Regresar
                </Button>
             </div>
             <Card>
                <CardHeader>
                    <CardTitle>Transferencias Registradas</CardTitle>
                    <CardDescription>Esta funcionalidad ha sido descontinuada. Los movimientos ahora se registran en el módulo de Arqueo.</CardDescription>
                </CardHeader>
             </Card>
        </div>
    );
}
