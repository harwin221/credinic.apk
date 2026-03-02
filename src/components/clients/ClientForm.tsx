'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, PlusCircle, Trash2, Loader2, Briefcase, Store, Edit, Save, Hotel, StickyNote, Tag } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { PersonalReference, Client, AsalariadoInfo, ComercianteInfo, Sucursal, ClientInteraction } from '@/lib/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogDescription } from '@/components/ui/dialog';
import { checkCedulaExists, createClient, updateClient, addInteraction } from '@/app/clients/actions';
import { getSucursales } from '@/services/sucursal-service';
import { getDepartments, getAllMunicipalities, type Department, type Municipality } from '@/services/geography-service';
import { formatCedula, formatPhone } from '@/lib/utils';
import { PageHeader } from '../PageHeader';
import { Interactions } from './Interactions';
import { Tags } from './Tags';
import { useUser } from '@/hooks/use-user';

// Schemas for Modals
const asalariadoSchema = z.object({
  companyName: z.string().min(2, "El nombre de la empresa es obligatorio.").transform(val => val.toUpperCase()),
  jobAntiquity: z.string().min(1, "La antigüedad es obligatoria.").transform(val => val.toUpperCase()),
  companyAddress: z.string().min(5, "La dirección es obligatoria.").transform(val => val.toUpperCase()),
  companyPhone: z.string().optional().default(''),
});

const comercianteSchema = z.object({
  businessAntiquity: z.string().min(1, "La antigüedad es obligatoria.").transform(val => val.toUpperCase()),
  businessAddress: z.string().min(5, "La dirección es obligatoria.").transform(val => val.toUpperCase()),
  economicActivity: z.string().min(3, "La actividad económica es obligatoria.").transform(val => val.toUpperCase()),
});

// Schema for a single reference
const referenceSchema = z.object({
  name: z.string().min(2, "El nombre es obligatorio.").transform(val => val.toUpperCase()),
  phone: z.string().min(9, "El teléfono debe tener el formato XXXX-XXXX."),
  address: z.string().min(5, "La dirección es obligatoria.").transform(val => val.toUpperCase()),
  relationship: z.string().min(2, "El parentesco es obligatorio.").transform(val => val.toUpperCase()),
});
type ReferenceFormValues = z.infer<typeof referenceSchema>;

// Main form schema
const newClientSchema = z.object({
  firstName: z.string().min(2, { message: "El nombre es obligatorio." }).transform(val => val.toUpperCase()),
  lastName: z.string().min(2, { message: "El apellido es obligatorio." }).transform(val => val.toUpperCase()),
  cedula: z.string().min(16, { message: "La cédula debe tener el formato 000-000000-0000X." }),
  phone: z.string().min(9, { message: "El teléfono debe tener el formato XXXX-XXXX." }),
  sex: z.enum(['masculino', 'femenino'], { required_error: "Debe seleccionar un sexo." }),
  civilStatus: z.enum(['soltero', 'casado', 'divorciado', 'viudo', 'union_libre'], { required_error: "Debe seleccionar un estado civil." }),
  employmentType: z.enum(['asalariado', 'comerciante'], { required_error: "Debe seleccionar una actividad económica." }),
  sucursal: z.string().min(1, "La sucursal es obligatoria."),
  department: z.string().min(2, "El departamento es obligatorio.").transform(val => val.toUpperCase()),
  municipality: z.string().min(2, "El municipio es obligatorio.").transform(val => val.toUpperCase()),
  neighborhood: z.string().min(2, "La comunidad o barrio es obligatorio.").transform(val => val.toUpperCase()),
  address: z.string().min(5, { message: "La dirección es obligatoria." }).transform(val => val.toUpperCase()),
});

type NewClientFormValues = z.infer<typeof newClientSchema>;
type AsalariadoFormValues = z.infer<typeof asalariadoSchema>;
type ComercianteFormValues = z.infer<typeof comercianteSchema>;

interface ClientFormProps {
  initialData?: Client | null;
}

export function ClientForm({ initialData }: ClientFormProps) {
  const router = useRouter();
  const { user } = useUser();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [clientState, setClientState] = React.useState<Client | null>(initialData || null);

  const [sucursales, setSucursales] = React.useState<Sucursal[]>([]);
  const [departments, setDepartments] = React.useState<Department[]>([]);
  const [allMunicipalities, setAllMunicipalities] = React.useState<Municipality[]>([]);
  const [filteredMunicipalities, setFilteredMunicipalities] = React.useState<Municipality[]>([]);

  const [references, setReferences] = React.useState<PersonalReference[]>(initialData?.references || []);
  const [isRefModalOpen, setIsRefModalOpen] = React.useState(false);

  const [isAsalariadoModalOpen, setIsAsalariadoModalOpen] = React.useState(false);
  const [isComercianteModalOpen, setIsComercianteModalOpen] = React.useState(false);

  const [asalariadoInfo, setAsalariadoInfo] = React.useState<AsalariadoInfo | null>(initialData?.asalariadoInfo || null);
  const [comercianteInfo, setComercianteInfo] = React.useState<ComercianteInfo | null>(initialData?.comercianteInfo || null);

  const isEditMode = !!initialData;
  const isGestor = user?.role === 'GESTOR';


  const form = useForm<NewClientFormValues>({
    resolver: zodResolver(newClientSchema),
    defaultValues: {
      firstName: initialData?.firstName || '',
      lastName: initialData?.lastName || '',
      cedula: initialData?.cedula || '',
      phone: initialData?.phone || '',
      sex: (initialData?.sex as any) || '',
      civilStatus: (initialData?.civilStatus as any) || '',
      employmentType: (initialData?.employmentType as any) || '',
      sucursal: initialData?.sucursal || user?.sucursal || '',
      department: initialData?.department || '',
      municipality: initialData?.municipality || '',
      neighborhood: initialData?.neighborhood || '',
      address: initialData?.address || '',
    },
  });

  const [cedulaValue, setCedulaValue] = React.useState(form.getValues('cedula'));
  const [phoneValue, setPhoneValue] = React.useState(formatPhone(form.getValues('phone')));
  const [refPhoneValue, setRefPhoneValue] = React.useState('');
  const [companyPhoneValue, setCompanyPhoneValue] = React.useState(formatPhone(initialData?.asalariadoInfo?.companyPhone || ''));

  const cedulaToValidate = useWatch({ control: form.control, name: 'cedula' });

  React.useEffect(() => {
    const check = async () => {
      if (cedulaToValidate && cedulaToValidate.length === 16) {
        const exists = await checkCedulaExists(cedulaToValidate, initialData?.id);
        if (exists) {
          form.setError('cedula', { message: 'Esta cédula ya está registrada.' });
        } else {
          form.clearErrors('cedula');
        }
      }
    };
    const timeoutId = setTimeout(check, 500); // Debounce
    return () => clearTimeout(timeoutId);
  }, [cedulaToValidate, form, initialData?.id]);

  React.useEffect(() => {
    if (initialData?.cedula) {
      const formatted = formatCedula(initialData.cedula);
      setCedulaValue(formatted);
      form.setValue('cedula', formatted, { shouldValidate: true });
    }
    if (initialData?.phone) {
      setPhoneValue(formatPhone(initialData.phone));
    }
    if (initialData?.asalariadoInfo?.companyPhone) {
      setCompanyPhoneValue(formatPhone(initialData.asalariadoInfo.companyPhone));
    }
  }, [initialData, form]);

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const [suc, deps, munis] = await Promise.all([
          getSucursales(),
          getDepartments(),
          getAllMunicipalities()
        ]);
        setSucursales(Array.isArray(suc) ? suc : []);
        setDepartments(Array.isArray(deps) ? deps : []);
        setAllMunicipalities(Array.isArray(munis) ? munis : []);
      } catch (error) {
        console.error("Error fetching geography data:", error);
        toast({ title: "Error", description: "No se pudieron cargar los departamentos y municipios.", variant: "destructive" });
      }
    };
    fetchData();
  }, [toast]);

  const refForm = useForm<ReferenceFormValues>({
    resolver: zodResolver(referenceSchema),
    defaultValues: { name: '', phone: '', address: '', relationship: '' },
  });

  const asalariadoForm = useForm<AsalariadoFormValues>({
    resolver: zodResolver(asalariadoSchema),
    defaultValues: asalariadoInfo ? {
      companyName: asalariadoInfo.companyName,
      jobAntiquity: asalariadoInfo.jobAntiquity,
      companyAddress: asalariadoInfo.companyAddress,
      companyPhone: asalariadoInfo.companyPhone || ''
    } : { companyName: '', jobAntiquity: '', companyAddress: '', companyPhone: '' },
  });

  const comercianteForm = useForm<ComercianteFormValues>({
    resolver: zodResolver(comercianteSchema),
    defaultValues: comercianteInfo ?? { businessAntiquity: '', businessAddress: '', economicActivity: '' },
  });

  React.useEffect(() => {
    if (asalariadoInfo) asalariadoForm.reset(asalariadoInfo);
  }, [asalariadoInfo, asalariadoForm]);

  React.useEffect(() => {
    if (comercianteInfo) comercianteForm.reset(comercianteInfo);
  }, [comercianteInfo, comercianteForm]);

  const employmentType = form.watch('employmentType');
  const selectedDepartmentName = form.watch('department');
  React.useEffect(() => {
    if (selectedDepartmentName) {
      // Normalizar para comparación (ambos a mayúsculas o buscar coincidencia exacta)
      // Los nombres en el select vienen de departments.name, que ya están en el SelectItem
      const department = departments.find(d => d.name.toUpperCase() === selectedDepartmentName.toUpperCase());
      if (department) {
        const filtered = allMunicipalities.filter(m => m.departmentId === department.id);
        setFilteredMunicipalities(filtered);

        // Limpiar municipio si ya no pertenece al departamento seleccionado
        const currentMuni = form.getValues('municipality');
        if (currentMuni && !filtered.some(m => m.name.toUpperCase() === currentMuni.toUpperCase())) {
          form.setValue('municipality', '');
        }
      } else {
        setFilteredMunicipalities([]);
        form.setValue('municipality', '');
      }
    } else {
      setFilteredMunicipalities([]);
      form.setValue('municipality', '');
    }
  }, [selectedDepartmentName, departments, allMunicipalities, form]);

  React.useEffect(() => {
    if (employmentType === 'asalariado') {
      setComercianteInfo(null);
    } else if (employmentType === 'comerciante') {
      setAsalariadoInfo(null);
    }
  }, [employmentType]);

  async function onSubmit(data: NewClientFormValues) {
    if (!user) {
      toast({ title: 'Error', description: 'No se pudo identificar al usuario. Inicie sesión de nuevo.', variant: 'destructive' });
      return;
    }
    if (data.employmentType === 'asalariado' && !asalariadoInfo) {
      toast({
        title: 'Información Laboral Requerida',
        description: 'Debes agregar los detalles del empleo para un cliente asalariado.',
        variant: 'destructive',
      });
      return;
    }

    if (data.employmentType === 'comerciante' && !comercianteInfo) {
      toast({
        title: 'Información del Negocio Requerida',
        description: 'Debes agregar los detalles del negocio para un cliente comerciante.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    const { firstName, lastName, ...restOfData } = data;
    const selectedSucursal = sucursales.find(s => s.id === data.sucursal);

    const clientPayload: Omit<Client, 'id' | 'clientNumber' | 'createdAt'> = {
      name: `${firstName} ${lastName}`.trim(),
      firstName,
      lastName,
      references,
      ...restOfData,
      sucursal: data.sucursal,
      sucursalName: selectedSucursal?.name || '',
      asalariadoInfo: data.employmentType === 'asalariado' ? asalariadoInfo : undefined,
      comercianteInfo: data.employmentType === 'comerciante' ? comercianteInfo : undefined,
    };

    try {
      if (isEditMode && initialData) {
        const result = await updateClient(initialData.id, clientPayload, user);
        if (result.success) {
          toast({
            title: "Cliente Actualizado",
            description: `El cliente ${clientPayload.name} ha sido actualizado exitosamente.`,
          });
          router.push('/clients');
        } else {
          throw new Error(result.error || "No se pudo guardar el cliente.");
        }
      } else {
        const result = await createClient(clientPayload, user);
        if (result.success) {
          toast({
            title: "Cliente Creado",
            description: `El cliente ${clientPayload.name} ha sido creado exitosamente.`,
          });
          router.push(isGestor ? '/dashboard' : '/clients');
          router.refresh();
        } else {
          throw new Error(result.error || "No se pudo guardar el cliente.");
        }
      }
    } catch (error) {
      toast({
        title: "Error al Guardar Cliente",
        description: error instanceof Error ? error.message : "Ocurrió un error inesperado.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleAddReference(data: ReferenceFormValues) {
    setReferences(prev => [...prev, { ...data, id: `ref_${Date.now()}` }]);
    setIsRefModalOpen(false);
    refForm.reset();
  }

  function handleRemoveReference(id: string) {
    setReferences(prev => prev.filter(ref => ref.id !== id));
  }

  function handleSaveAsalariado(data: AsalariadoFormValues) {
    setAsalariadoInfo(data);
    setIsAsalariadoModalOpen(false);
  }

  function handleSaveComerciante(data: ComercianteFormValues) {
    setComercianteInfo(data);
    setIsComercianteModalOpen(false);
  }

  const handleCedulaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCedula(e.target.value);
    setCedulaValue(formatted);
    form.setValue('cedula', formatted, { shouldValidate: true });
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>, setValueFunc: (value: string) => void) => {
    const formatted = formatPhone(e.target.value);
    setValueFunc(formatted);
    return formatted;
  };

  const handleInteractionUpdate = async (newInteraction: Omit<ClientInteraction, 'id'>) => {
    if (clientState && user) {
      const result = await addInteraction(clientState.id, newInteraction, user);
      if (result.success) {
        toast({ title: 'Interacción registrada' });
        // Actualiza el estado local para reflejar el cambio inmediatamente.
        setClientState(prev => {
          if (!prev) return null;
          const updatedInteractions = [...(prev.interactions || []), { ...newInteraction, id: `int_${Date.now()}` }];
          return { ...prev, interactions: updatedInteractions };
        });
      } else {
        toast({ title: 'Error', description: result.error, variant: 'destructive' });
      }
    }
  };

  const title = isEditMode ? 'Editar Cliente' : 'Agregar Nuevo Cliente';

  return (
    <>
      <PageHeader title={title}>
        <Button variant="outline" onClick={() => router.back()} disabled={isSubmitting}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver
        </Button>
        <Button type="submit" onClick={form.handleSubmit(onSubmit)} disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          {isSubmitting ? 'Guardando...' : (isEditMode ? 'Guardar Cambios' : 'Guardar Cliente')}
        </Button>
      </PageHeader>


      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Tabs defaultValue="personal" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="personal">Datos Personales</TabsTrigger>
              <TabsTrigger value="references">Referencias</TabsTrigger>
              <TabsTrigger value="interactions">Interacciones y Etiquetas</TabsTrigger>
            </TabsList>

            <TabsContent value="personal">
              <Card className="shadow-md mt-4">
                <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField control={form.control} name="firstName" render={({ field }) => (
                    <FormItem><FormLabel>Nombres</FormLabel><FormControl><Input placeholder="Nombres del cliente" {...field} className="uppercase" /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="lastName" render={({ field }) => (
                    <FormItem><FormLabel>Apellidos</FormLabel><FormControl><Input placeholder="Apellidos del cliente" {...field} className="uppercase" /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="cedula" render={({ field }) => (
                    <FormItem><FormLabel>Cédula</FormLabel><FormControl><Input placeholder="000-000000-0000X" {...field} value={cedulaValue} onChange={handleCedulaChange} maxLength={16} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="phone" render={({ field }) => (
                    <FormItem><FormLabel>Teléfono primario</FormLabel><FormControl><Input type="tel" placeholder="8888-8888" {...field} value={phoneValue} onChange={(e) => field.onChange(handlePhoneChange(e, setPhoneValue))} maxLength={9} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="sucursal" render={({ field }) => (
                    <FormItem><FormLabel>Sucursal</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><div className="flex items-center gap-2"><Hotel className="h-4 w-4 text-muted-foreground" /><SelectValue placeholder="Seleccionar Sucursal" /></div></SelectTrigger></FormControl><SelectContent>{sucursales.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="sex" render={({ field }) => (
                    <FormItem><FormLabel>Sexo</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Seleccionar sexo" /></SelectTrigger></FormControl><SelectContent><SelectItem value="masculino">Masculino</SelectItem><SelectItem value="femenino">Femenino</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="civilStatus" render={({ field }) => (
                    <FormItem><FormLabel>Estado civil</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Seleccionar estado civil" /></SelectTrigger></FormControl><SelectContent><SelectItem value="soltero">Soltero(a)</SelectItem><SelectItem value="casado">Casado(a)</SelectItem><SelectItem value="divorciado">Divorciado(a)</SelectItem><SelectItem value="viudo">Viudo(a)</SelectItem><SelectItem value="union_libre">Unión Libre</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                  )} />

                  <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
                    <FormField control={form.control} name="employmentType" render={({ field }) => (
                      <FormItem><FormLabel>Actividad económica</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Seleccionar actividad económica" /></SelectTrigger></FormControl><SelectContent><SelectItem value="asalariado">Asalariado</SelectItem><SelectItem value="comerciante">Comerciante</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                    )} />

                    {employmentType === 'asalariado' && (
                      <div className="space-y-2">
                        <Button type="button" variant="outline" onClick={() => setIsAsalariadoModalOpen(true)} className="w-full">
                          <Briefcase className="mr-2 h-4 w-4" /> {asalariadoInfo ? 'Editar' : 'Agregar'} Info. Laboral
                        </Button>
                      </div>
                    )}
                    {employmentType === 'comerciante' && (
                      <div className="space-y-2">
                        <Button type="button" variant="outline" onClick={() => setIsComercianteModalOpen(true)} className="w-full">
                          <Store className="mr-2 h-4 w-4" /> {comercianteInfo ? 'Editar' : 'Agregar'} Info. del Negocio
                        </Button>
                      </div>
                    )}
                  </div>

                  {employmentType === 'asalariado' && asalariadoInfo && (
                    <div className="md:col-span-2 p-3 bg-muted/50 rounded-lg border text-sm">
                      <h4 className="font-semibold mb-2 flex items-center">Información Laboral <Button variant="ghost" size="icon" className="h-6 w-6 ml-2" onClick={() => setIsAsalariadoModalOpen(true)}><Edit className="h-3 w-3" /></Button></h4>
                      <p><strong>Empresa:</strong> {asalariadoInfo.companyName}</p>
                      <p><strong>Antigüedad:</strong> {asalariadoInfo.jobAntiquity}</p>
                    </div>
                  )}
                  {employmentType === 'comerciante' && comercianteInfo && (
                    <div className="md:col-span-2 p-3 bg-muted/50 rounded-lg border text-sm">
                      <h4 className="font-semibold mb-2 flex items-center">Información del Negocio <Button variant="ghost" size="icon" className="h-6 w-6 ml-2" onClick={() => setIsComercianteModalOpen(true)}><Edit className="h-3 w-3" /></Button></h4>
                      <p><strong>Actividad:</strong> {comercianteInfo.economicActivity}</p>
                      <p><strong>Antigüedad:</strong> {comercianteInfo.businessAntiquity}</p>
                    </div>
                  )}

                  <FormField control={form.control} name="department" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Departamento</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="DEPARTAMENTO" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {departments.map(d => (
                            <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="municipality" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Municipio</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} disabled={!selectedDepartmentName}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="MUNICIPIO" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {filteredMunicipalities.map(m => (
                            <SelectItem key={m.id} value={m.name}>{m.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="neighborhood" render={({ field }) => (
                    <FormItem><FormLabel>Comunidad o Barrio</FormLabel><FormControl><Input placeholder="Comunidad o Barrio" {...field} className="uppercase" /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="address" render={({ field }) => (
                    <FormItem className="md:col-span-2"><FormLabel>Dirección de domicilio</FormLabel><FormControl><Textarea placeholder="Dirección completa del domicilio" {...field} className="uppercase" /></FormControl><FormMessage /></FormItem>
                  )} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="references">
              <Card className="shadow-md mt-4">
                <CardContent className="p-6 space-y-4">
                  <Button type="button" onClick={() => { setRefPhoneValue(''); refForm.reset(); setIsRefModalOpen(true); }}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Agregar Referencia
                  </Button>
                  {references.length > 0 ? (
                    <div className="space-y-3">
                      {references.map((ref) => (
                        <Card key={ref.id} className="p-4">
                          <div className="grid grid-cols-4 gap-4 items-center">
                            <div><FormLabel>Parentesco</FormLabel><p className="font-semibold text-sm uppercase">{ref.relationship}</p></div>
                            <div><FormLabel>Nombre y Apellidos</FormLabel><p className="font-semibold text-sm uppercase">{ref.name}</p></div>
                            <div><FormLabel>Teléfono</FormLabel><p className="font-semibold text-sm">{ref.phone}</p></div>
                            <div className="flex items-center justify-between">
                              <div><FormLabel>Dirección</FormLabel><p className="font-semibold text-sm uppercase">{ref.address}</p></div>
                              <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveReference(ref.id)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                                <span className="sr-only">Eliminar referencia</span>
                              </Button>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center text-sm text-muted-foreground pt-4 border border-dashed rounded-md min-h-[100px] flex items-center justify-center">
                      <p>No se han agregado referencias personales.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="interactions">
              <Card className="shadow-md mt-4">
                <CardContent className="p-6 space-y-4">
                  {isEditMode && clientState && user ? (
                    <>
                      <div>
                        <h3 className="text-lg font-medium flex items-center gap-2"><Tag className="h-5 w-5 text-primary" /> Etiquetas</h3>
                        <p className="text-sm text-muted-foreground mb-2">Clasifica al cliente con etiquetas personalizadas.</p>
                        <Tags client={clientState} onUpdate={() => setClientState(prev => prev ? ({ ...prev, tags: prev.tags }) : null)} />
                      </div>
                      <div className="pt-4">
                        <h3 className="text-lg font-medium flex items-center gap-2"><StickyNote className="h-5 w-5 text-primary" /> Historial de Interacciones</h3>
                        <p className="text-sm text-muted-foreground mb-2">Registra llamadas, visitas y otras notas importantes.</p>
                        <Interactions client={clientState} onInteractionAdd={handleInteractionUpdate} />
                      </div>
                    </>
                  ) : (
                    <div className="text-center text-sm text-muted-foreground py-10">
                      Guarda el cliente para poder añadir etiquetas e interacciones.
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

          </Tabs>

        </form>
      </Form>

      {/* Reference Modal */}
      <Dialog open={isRefModalOpen} onOpenChange={setIsRefModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Agregar Referencia Personal</DialogTitle><DialogDescription>Completa los datos de la persona de referencia.</DialogDescription></DialogHeader>
          <Form {...refForm}><form onSubmit={refForm.handleSubmit(handleAddReference)} className="space-y-4">
            <FormField control={refForm.control} name="name" render={({ field }) => (<FormItem><FormLabel>Nombre y Apellidos</FormLabel><FormControl><Input placeholder="Nombre completo" {...field} className="uppercase" /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={refForm.control} name="phone" render={({ field }) => (<FormItem><FormLabel>Número de teléfono</FormLabel><FormControl><Input type="tel" placeholder="8888-8888" {...field} value={refPhoneValue} onChange={(e) => field.onChange(handlePhoneChange(e, setRefPhoneValue))} maxLength={9} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={refForm.control} name="address" render={({ field }) => (<FormItem><FormLabel>Dirección</FormLabel><FormControl><Textarea placeholder="Dirección de la referencia" {...field} className="uppercase" /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={refForm.control} name="relationship" render={({ field }) => (<FormItem><FormLabel>Parentesco</FormLabel><FormControl><Input placeholder="Ej: Madre, Amigo, Vecino" {...field} className="uppercase" /></FormControl><FormMessage /></FormItem>)} />
            <DialogFooter><DialogClose asChild><Button type="button" variant="outline">Cancelar</Button></DialogClose><Button type="submit">Agregar Referencia</Button></DialogFooter>
          </form></Form>
        </DialogContent>
      </Dialog>

      {/* Asalariado Modal */}
      <Dialog open={isAsalariadoModalOpen} onOpenChange={setIsAsalariadoModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Información Laboral (Asalariado)</DialogTitle><DialogDescription>Complete los datos del empleo del cliente.</DialogDescription></DialogHeader>
          <Form {...asalariadoForm}><form onSubmit={asalariadoForm.handleSubmit((data) => handleSaveAsalariado(data as AsalariadoFormValues))} className="space-y-4">
            <FormField control={asalariadoForm.control} name="companyName" render={({ field }) => (<FormItem><FormLabel>Nombre de la Empresa</FormLabel><FormControl><Input placeholder="Nombre de la empresa" {...field} className="uppercase" /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={asalariadoForm.control} name="companyPhone" render={({ field }) => (
              <FormItem>
                <FormLabel>Teléfono de la Empresa</FormLabel>
                <FormControl>
                  <Input type="tel" placeholder="8888-8888" {...field} value={formatPhone(field.value || '')} onChange={(e) => field.onChange(formatPhone(e.target.value))} maxLength={9} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={asalariadoForm.control} name="jobAntiquity" render={({ field }) => (<FormItem><FormLabel>Antigüedad</FormLabel><FormControl><Input placeholder="Ej: 2 años y 6 meses" {...field} className="uppercase" /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={asalariadoForm.control} name="companyAddress" render={({ field }) => (<FormItem><FormLabel>Dirección de la Empresa</FormLabel><FormControl><Textarea placeholder="Dirección del lugar de trabajo" {...field} className="uppercase" /></FormControl><FormMessage /></FormItem>)} />
            <DialogFooter><DialogClose asChild><Button type="button" variant="outline">Cancelar</Button></DialogClose><Button type="submit">Guardar Información</Button></DialogFooter>
          </form></Form>
        </DialogContent>
      </Dialog>

      {/* Comerciante Modal */}
      <Dialog open={isComercianteModalOpen} onOpenChange={setIsComercianteModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Información del Negocio (Comerciante)</DialogTitle><DialogDescription>Complete los datos del negocio del cliente.</DialogDescription></DialogHeader>
          <Form {...comercianteForm}><form onSubmit={comercianteForm.handleSubmit((data) => handleSaveComerciante(data as ComercianteFormValues))} className="space-y-4">
            <FormField control={comercianteForm.control} name="economicActivity" render={({ field }) => (<FormItem><FormLabel>Actividad económica</FormLabel><FormControl><Input placeholder="Ej: Pulpería, Sastrería, Panadería" {...field} className="uppercase" /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={comercianteForm.control} name="businessAntiquity" render={({ field }) => (<FormItem><FormLabel>Antigüedad del negocio</FormLabel><FormControl><Input placeholder="Ej: 5 años" {...field} className="uppercase" /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={comercianteForm.control} name="businessAddress" render={({ field }) => (<FormItem><FormLabel>Dirección del negocio</FormLabel><FormControl><Textarea placeholder="Dirección del negocio" {...field} className="uppercase" /></FormControl><FormMessage /></FormItem>)} />
            <DialogFooter><DialogClose asChild><Button type="button" variant="outline">Cancelar</Button></DialogClose><Button type="submit">Guardar Información</Button></DialogFooter>
          </form></Form>
        </DialogContent>
      </Dialog>
    </>
  );
}
