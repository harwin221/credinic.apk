'use client';

import * as React from 'react';
import type { Client } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatPhone, formatCedula } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

const DetailItem = ({ label, value }: { label: string; value?: React.ReactNode }) => (
  <div className="space-y-1">
    <p className="text-sm font-medium text-muted-foreground">{label}</p>
    <p className="text-base font-semibold">{value || 'N/A'}</p>
  </div>
);

interface ClientDetailViewProps {
  client: Client;
}

export function ClientDetailView({ client }: ClientDetailViewProps) {
  const {
    name, cedula, phone, sex, civilStatus, employmentType, sucursalName,
    department, municipality, neighborhood, address,
    asalariadoInfo, comercianteInfo, references
  } = client;

  return (
    <Tabs defaultValue="personal" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="personal">Datos Personales</TabsTrigger>
        {employmentType === 'asalariado' && <TabsTrigger value="laboral">Datos Laborales</TabsTrigger>}
        {employmentType === 'comerciante' && <TabsTrigger value="negocio">Datos del Negocio</TabsTrigger>}
        <TabsTrigger value="references">Referencias</TabsTrigger>
      </TabsList>
      
      <TabsContent value="personal">
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Información Personal y de Contacto</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
              <DetailItem label="Nombre Completo" value={name} />
              <DetailItem label="Cédula" value={formatCedula(cedula)} />
              <DetailItem label="Teléfono" value={formatPhone(phone)} />
              <DetailItem label="Sexo" value={<span className="capitalize">{sex}</span>} />
              <DetailItem label="Estado Civil" value={<span className="capitalize">{civilStatus.replace('_', ' ')}</span>} />
              <DetailItem label="Sucursal" value={sucursalName} />
              <DetailItem label="Departamento" value={department} />
              <DetailItem label="Municipio" value={municipality} />
              <DetailItem label="Barrio/Comunidad" value={neighborhood} />
            </div>
            <Separator className="my-6" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Dirección Exacta</p>
              <p className="text-base font-semibold whitespace-pre-wrap">{address}</p>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
      
      {employmentType === 'asalariado' && (
        <TabsContent value="laboral">
            <Card className="mt-4">
            <CardHeader><CardTitle>Información Laboral</CardTitle></CardHeader>
            <CardContent>
                {asalariadoInfo ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                    <DetailItem label="Empresa" value={asalariadoInfo.companyName} />
                    <DetailItem label="Antigüedad Laboral" value={asalariadoInfo.jobAntiquity} />
                    <DetailItem label="Teléfono del Trabajo" value={formatPhone(asalariadoInfo.companyPhone)} />
                    <DetailItem label="Dirección del Trabajo" value={asalariadoInfo.companyAddress} />
                </div>
                ) : (
                <p className="text-sm text-muted-foreground">No hay información laboral detallada.</p>
                )}
            </CardContent>
            </Card>
        </TabsContent>
      )}

      {employmentType === 'comerciante' && (
         <TabsContent value="negocio">
            <Card className="mt-4">
            <CardHeader><CardTitle>Información del Negocio</CardTitle></CardHeader>
            <CardContent>
                {comercianteInfo ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                    <DetailItem label="Actividad Principal" value={comercianteInfo.economicActivity} />
                    <DetailItem label="Antigüedad del Negocio" value={comercianteInfo.businessAntiquity} />
                    <DetailItem label="Dirección del Negocio" value={comercianteInfo.businessAddress} />
                </div>
                ) : (
                <p className="text-sm text-muted-foreground">No hay información del negocio detallada.</p>
                )}
            </CardContent>
            </Card>
        </TabsContent>
      )}

      <TabsContent value="references">
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Referencias Personales</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {references && references.length > 0 ? references.map((ref, index) => (
              <div key={ref.id || index} className="p-3 bg-muted/50 rounded-lg">
                <p className="font-semibold">{ref.name} <span className="text-muted-foreground font-normal">({ref.relationship})</span></p>
                <p className="text-sm">Tel: {formatPhone(ref.phone)}</p>
                <p className="text-sm">Dir: {ref.address}</p>
              </div>
            )) : <p className="text-sm text-muted-foreground">No hay referencias registradas.</p>}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
