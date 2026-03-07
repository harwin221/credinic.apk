
'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar as CalendarIcon, Loader2 } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import type { AppUser, Sucursal, UserRole } from '@/lib/types';
import { Separator } from '@/components/ui/separator';

interface FilterItem {
  id: string;
  name: string;
}

interface ReportFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (filters: { queryString: string }) => void;
  reportTitle: string;
  sucursales: Sucursal[];
  gestores: AppUser[];
  officeUsers: AppUser[];
  hasViewTypeFilter?: boolean;
  currentUser: AppUser | null;
}

function CheckboxFilterGroup({
  title,
  items,
  selectedItems,
  onSelectedItemsChange,
  disabled = false,
  emptyMessage = "No hay datos",
}: {
  title: string;
  items: FilterItem[];
  selectedItems: string[];
  onSelectedItemsChange: (selected: string[]) => void;
  disabled?: boolean;
  emptyMessage?: string;
}) {
  const isAllSelected = items.length > 0 && selectedItems.length === items.length;

  const handleSelectAll = (checked: boolean) => {
    onSelectedItemsChange(checked ? items.map((item) => item.id) : []);
  };

  const handleItemChange = (itemId: string, checked: boolean) => {
    if (checked) {
      onSelectedItemsChange([...selectedItems, itemId]);
    } else {
      onSelectedItemsChange(selectedItems.filter((id) => id !== itemId));
    }
  };

  return (
    <div className="space-y-1 flex flex-col">
      <Label className={cn("font-semibold text-[11px]", disabled && "text-muted-foreground")}>{title}</Label>
      <div className={cn("rounded-md border p-1 flex-1 flex flex-col", disabled && "bg-muted/50 cursor-not-allowed")}>
        <ScrollArea className="flex-1 h-24">
          <div className={cn("space-y-2 p-1", disabled && "pointer-events-none")}>
            {items.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">{emptyMessage}</p>
            ) : (
              items.map((item) => (
                <div key={`${title}-${item.id}`} className="flex items-start gap-2.5">
                  <Checkbox
                    id={`${item.id}-${title}`}
                    checked={selectedItems.includes(item.id)}
                    onCheckedChange={(checked) => handleItemChange(item.id, !!checked)}
                    className="mt-0.5 h-3.5 w-3.5"
                  />
                  <div className="grid gap-1 leading-none">
                    <Label htmlFor={`${item.id}-${title}`} className="font-normal text-[13px] text-foreground cursor-pointer break-words">
                      {item.name}
                    </Label>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
        {items.length > 0 && (
          <div className={cn("border-t mt-1 pt-1.5 flex items-center space-x-2.5", disabled && "pointer-events-none")}>
            <Checkbox
              id={`select-all-${title.replace(/\s+/g, '-')}`}
              checked={isAllSelected}
              onCheckedChange={handleSelectAll}
              className="h-3.5 w-3.5"
            />
            <Label htmlFor={`select-all-${title.replace(/\s+/g, '-')}`} className="font-normal text-xs cursor-pointer">
              Seleccionar todos
            </Label>
          </div>
        )}
      </div>
    </div>
  );
}

export function ReportFilterModal({
  isOpen,
  onClose,
  onSubmit,
  reportTitle,
  sucursales,
  gestores,
  officeUsers,
  hasViewTypeFilter = false,
  currentUser,
}: ReportFilterModalProps) {
  const [selectedSucursales, setSelectedSucursales] = React.useState<string[]>([]);
  const [selectedUsers, setSelectedUsers] = React.useState<string[]>([]);
  const [selectedOfficeUsers, setSelectedOfficeUsers] = React.useState<string[]>([]);
  const [selectedGestores, setSelectedGestores] = React.useState<string[]>([]);
  const [fechaInicial, setFechaInicial] = React.useState<Date | undefined>();
  const [fechaFinal, setFechaFinal] = React.useState<Date | undefined>();
  const [viewType, setViewType] = React.useState<'detailed' | 'summary'>('detailed');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const officeStaff = React.useMemo(() => {
    return officeUsers.filter(u => {
      // Excluir GESTORES (van en la columna de gestores)
      if (u.role === 'GESTOR') return false;

      // Incluir GERENTE y OPERATIVO (roles que hacen trabajo de campo)
      // GERENTE puede desembolsar y recuperar por cancelaciones
      if (!['GERENTE', 'OPERATIVO'].includes(u.role)) return false;

      // Si no hay sucursales seleccionadas, no mostrar nada
      if (selectedSucursales.length === 0) return false;

      // Si tiene sucursal asignada, verificar que esté en las seleccionadas
      return u.sucursal && selectedSucursales.includes(u.sucursal);
    }).sort((a, b) => a.fullName.localeCompare(b.fullName));
  }, [selectedSucursales, officeUsers]);

  const gestoresStaff = React.useMemo(() => {
    // Si no hay sucursales seleccionadas, no mostrar gestores
    if (selectedSucursales.length === 0) return [];

    // Si hay usuarios de oficina seleccionados
    if (selectedOfficeUsers.length > 0) {
      // Si seleccionó "OFICINA (Todos)", mostrar el gerente de la sucursal
      if (selectedOfficeUsers.includes('ALL_OFFICE')) {
        // Buscar el gerente de las sucursales seleccionadas
        const gerentes = officeUsers.filter(u =>
          u.role === 'GERENTE' &&
          u.sucursal &&
          selectedSucursales.includes(u.sucursal)
        );
        return gerentes.sort((a, b) => a.fullName.localeCompare(b.fullName));
      }

      // Si seleccionó un gerente específico (o cualquier usuario de oficina), mostrar sus gestores
      const selectedStaffSucursales = officeUsers
        .filter(u => selectedOfficeUsers.includes(u.id!))
        .map(u => u.sucursal)
        .filter(Boolean) as string[];

      if (selectedStaffSucursales.length > 0) {
        return gestores.filter(g => g.sucursal && selectedStaffSucursales.includes(g.sucursal))
          .sort((a, b) => a.fullName.localeCompare(b.fullName));
      }
    }

    // Si no hay usuarios de oficina seleccionados, no mostrar gestores
    return [];
  }, [selectedSucursales, selectedOfficeUsers, gestores, officeUsers]);


  // Limpiar usuarios cuando cambian las sucursales
  React.useEffect(() => {
    setSelectedOfficeUsers([]);
    setSelectedGestores([]);
  }, [selectedSucursales]);

  // Cuando se selecciona un usuario específico, deseleccionar "OFICINA (Todos)"
  React.useEffect(() => {
    if (selectedOfficeUsers.includes('ALL_OFFICE') && selectedOfficeUsers.length > 1) {
      // Si hay "OFICINA (Todos)" y otros usuarios, quitar "OFICINA (Todos)"
      setSelectedOfficeUsers(prev => prev.filter(id => id !== 'ALL_OFFICE'));
    }
  }, [selectedOfficeUsers]);

  React.useEffect(() => {
    if (isOpen) {
      // Si no es admin ni finanzas, restringir a su sucursal
      const isRestricted = currentUser && !['ADMINISTRADOR', 'FINANZAS'].includes(currentUser.role.toUpperCase());

      if (isRestricted && currentUser.sucursal) {
        setSelectedSucursales([currentUser.sucursal]);
      } else {
        setSelectedSucursales([]);
      }

      setSelectedOfficeUsers([]);
      setSelectedGestores([]);
      setFechaInicial(undefined);
      setFechaFinal(undefined);
      setViewType('detailed');
    }
  }, [isOpen, currentUser]);

  const isSucursalDisabled = React.useMemo(() => {
    if (!currentUser) return false;
    const role = currentUser.role.toUpperCase();
    return !['ADMINISTRADOR', 'FINANZAS'].includes(role);
  }, [currentUser]);

  const handleSubmit = () => {
    setIsSubmitting(true);

    const params = new URLSearchParams();
    selectedSucursales.forEach(s => params.append('sucursal', s));

    // Combinar usuarios seleccionados de ambas columnas
    let finalSelectedUsers: string[] = [];

    // Manejar selección de "OFICINA (Todos)"
    if (selectedOfficeUsers.includes('ALL_OFFICE')) {
      // Agregar todos los usuarios de oficina visibles actualmente
      officeStaff.forEach(u => {
        if (u.id) finalSelectedUsers.push(u.id);
      });
    } else {
      finalSelectedUsers.push(...selectedOfficeUsers);
    }

    finalSelectedUsers.push(...selectedGestores);
    finalSelectedUsers = [...new Set(finalSelectedUsers)]; // Eliminar duplicados si los hubiera

    // Si no hay ninguno seleccionado explícitamente, pero hay una sucursal, enviar todos los de esa sucursal
    // Si no hay sucursal ni usuarios, enviar vacío (el reporte decidirá si muestra todo)
    const usersToFilter = finalSelectedUsers.length > 0 ? finalSelectedUsers :
      (selectedSucursales.length > 0 ? [...officeStaff, ...gestoresStaff].map(u => u.id!) : []);

    usersToFilter.forEach(u => params.append('user', u));

    if (fechaInicial) params.set('from', format(fechaInicial, 'yyyy-MM-dd'));
    if (fechaFinal) params.set('to', format(fechaFinal, 'yyyy-MM-dd'));
    if (hasViewTypeFilter) params.set('viewType', viewType);

    setTimeout(() => {
      onSubmit({ queryString: params.toString() });
      setIsSubmitting(false);
      onClose();
    }, 500);
  };

  const officeStaffItems = React.useMemo(() => {
    const items = officeStaff.map(u => ({
      id: u.id!,
      name: `${u.fullName} (${u.role === 'GERENTE' ? 'Gerente' : 'Operativo'})`
    }));
    if (items.length > 0) {
      return [{ id: 'ALL_OFFICE', name: 'OFICINA (Todos)' }, ...items];
    }
    return items;
  }, [officeStaff]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full sm:max-w-4xl max-h-[90vh] p-0 overflow-hidden flex flex-col">
        <DialogHeader className="p-3 pb-1">
          <DialogTitle className="text-base">{reportTitle}</DialogTitle>
          <DialogDescription className="text-xs">Selecciona los filtros para generar el reporte.</DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 px-3">
          <div className="space-y-2 py-1">

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 py-1 min-h-[160px]">
              <div className="animate-in fade-in slide-in-from-left-4 duration-300">
                <CheckboxFilterGroup
                  title="Sucursal:"
                  items={sucursales}
                  selectedItems={selectedSucursales}
                  onSelectedItemsChange={setSelectedSucursales}
                  disabled={isSucursalDisabled}
                />
              </div>

              {selectedSucursales.length > 0 ? (
                <div className="animate-in fade-in slide-in-from-left-4 duration-500">
                  <CheckboxFilterGroup
                    title="Personal de Oficina:"
                    items={officeStaffItems}
                    selectedItems={selectedOfficeUsers}
                    onSelectedItemsChange={setSelectedOfficeUsers}
                    emptyMessage="No hay personal en esta sucursal."
                  />
                </div>
              ) : (
                <div className="hidden lg:flex items-center justify-center border rounded-md bg-muted/20 border-dashed p-3 text-center text-muted-foreground text-xs">
                  Seleccione una sucursal para continuar
                </div>
              )}

              {selectedOfficeUsers.length > 0 ? (
                <div className="animate-in fade-in slide-in-from-left-4 duration-700">
                  <CheckboxFilterGroup
                    title="Gestores de Cobro:"
                    items={gestoresStaff.map(u => ({ id: u.id!, name: u.fullName }))}
                    selectedItems={selectedGestores}
                    onSelectedItemsChange={setSelectedGestores}
                    emptyMessage="No hay gestores vinculados."
                  />
                </div>
              ) : (
                <div className="hidden lg:flex flex-col items-center justify-center border rounded-md bg-muted/10 border-dashed p-3 text-center text-muted-foreground text-xs space-y-1.5 opacity-60">
                  <div className="w-7 h-7 rounded-full border-2 border-dashed flex items-center justify-center font-bold text-xs">3</div>
                  <p>Seleccione Personal de Oficina</p>
                </div>
              )}
            </div>


            {hasViewTypeFilter && (
              <div className="space-y-1 pt-1">
                <Label className="font-semibold text-[11px]">Configuración de Visualización</Label>
                <RadioGroup
                  value={viewType}
                  onValueChange={(value) => setViewType(value as any)}
                  className="flex items-center space-x-3"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="detailed" id="detailed" />
                    <Label htmlFor="detailed" className="font-normal cursor-pointer text-xs">Detallado</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="summary" id="summary" />
                    <Label htmlFor="summary" className="font-normal cursor-pointer text-xs">Resumido</Label>
                  </div>
                </RadioGroup>
              </div>
            )}

            <Separator className="my-2" />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-0.5 pb-1">
              <div className="space-y-1.5">
                <Label htmlFor="fecha-inicial" className="text-xs">Fecha Inicial:</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      id="fecha-inicial"
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal h-9 text-sm",
                        !fechaInicial && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                      {fechaInicial ? format(fechaInicial, 'PPP', { locale: es }) : <span>DD/MM/YYYY</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={fechaInicial}
                      onSelect={setFechaInicial}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="fecha-final" className="text-xs">Fecha Final:</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      id="fecha-final"
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal h-9 text-sm",
                        !fechaFinal && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                      {fechaFinal ? format(fechaFinal, 'PPP', { locale: es }) : <span>DD/MM/YYYY</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={fechaFinal}
                      onSelect={setFechaFinal}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
        </ScrollArea>


        <DialogFooter className="p-3 pt-1.5 border-t mt-0">
          <DialogClose asChild>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting} className="h-8 text-xs">
              Cancelar
            </Button>
          </DialogClose>
          <Button type="button" onClick={handleSubmit} disabled={isSubmitting} className="sm:w-32 h-8 text-xs bg-accent text-accent-foreground hover:bg-accent/90">
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                Generando...
              </>
            ) : (
              'Generar reporte'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
