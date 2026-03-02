
'use client';

import * as React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import type { CreditDetail } from '@/lib/types';
import { cn } from '@/lib/utils';

const formatCurrency = (amount: number = 0) => `C$${amount.toLocaleString('es-NI', { minimumFractionDigits: 2 })}`;

interface CreditMobileCardProps {
  credit: CreditDetail;
  colorClass: string;
  onClick: () => void;
  children?: React.ReactNode;
}

export function CreditMobileCard({ credit, colorClass, onClick, children }: CreditMobileCardProps) {
    const address = credit.clientDetails?.address || 'Dirección no disponible';
    return (
        <Card onClick={onClick} className={cn("cursor-pointer hover:shadow-lg transition-shadow border-l-4", colorClass)}>
            <CardContent className="p-3">
                <div className="flex flex-col">
                    <p className="font-bold">{credit.clientName}</p>
                    <p className="text-xs text-muted-foreground">{address}</p>
                    <p className={`font-semibold mt-1 text-base ${colorClass.replace('border-', 'text-')}`}>{formatCurrency(credit.netDisbursementAmount ?? credit.amount)}</p>
                </div>
                {children}
            </CardContent>
        </Card>
    );
};
