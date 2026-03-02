'use client';

import * as React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface BilletajeFormProps {
  denominations: Record<string, { value: number; count: number }>;
  onDenominationChange: (currency: 'NIO' | 'USD', key: string, count: number) => void;
  currency: 'NIO' | 'USD';
}

const NIO_DENOMINATIONS: Record<string, number> = {
  '1000': 1000, '500': 500, '200': 200, '100': 100, '50': 50,
  '20': 20, '10': 10, '5': 5, '1': 1, '0.50': 0.50, '0.25': 0.25,
};

const USD_DENOMINATIONS: Record<string, number> = {
  '100': 100, '50': 50, '20': 20, '10': 10, '5': 5, '1': 1,
};

const DenominationRow = ({ label, value, count, onChange }: { label: string, value: number, count: number, onChange: (count: number) => void }) => {
  const total = value * count;
  return (
    <div className="grid grid-cols-3 items-center gap-4">
      <Label htmlFor={`denom-${label}`} className="text-right">
        {label}
      </Label>
      <Input
        id={`denom-${label}`}
        type="number"
        min="0"
        value={count || ''}
        onChange={(e) => onChange(parseInt(e.target.value, 10) || 0)}
        className="h-8"
        placeholder="Cantidad"
      />
      <Input
        type="text"
        value={total.toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        readOnly
        className="h-8 bg-muted text-right"
      />
    </div>
  );
};


export function BilletajeForm({ denominations, onDenominationChange, currency }: BilletajeFormProps) {
  const DENOMINATIONS = currency === 'NIO' ? NIO_DENOMINATIONS : USD_DENOMINATIONS;
  return (
     <Card>
      <CardHeader>
        <CardTitle>Billetaje en {currency === 'NIO' ? 'Córdobas (C$)' : 'Dólares (U$)'}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-3 items-center gap-4 text-xs font-semibold text-muted-foreground">
            <span className="text-right">Denominación</span>
            <span>Cantidad</span>
            <span className="text-right">Total</span>
        </div>
        {Object.entries(DENOMINATIONS).map(([key, value]) => (
          <DenominationRow
            key={key}
            label={`${value.toLocaleString()} ${currency === 'NIO' ? 'C$' : 'U$'}`}
            value={value}
            count={denominations[key]?.count || 0}
            onChange={(count) => onDenominationChange(currency, key, count)}
          />
        ))}
      </CardContent>
    </Card>
  );
}