
'use client';

import * as React from 'react';
import type { Client } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { User, Repeat, RefreshCw } from 'lucide-react';
import Link from 'next/link';

interface ClientCardProps {
  client: Client;
  action?: 'represtamo' | 'renew';
  href?: string;
  onActionClick?: (clientId: string) => void;
  children?: React.ReactNode;
}

export function ClientCard({ client, action, href, onActionClick, children }: ClientCardProps) {
  const handleAction = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (onActionClick) {
      onActionClick(client.id);
    }
  };

  const cardContent = (
    <Card className="transition-colors group hover:bg-muted/50">
      <CardContent className="p-3 flex items-center justify-between">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className="bg-primary/10 rounded-full p-2">
            <User className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="font-semibold truncate block">{client.name}</span>
            <p className="text-xs text-muted-foreground">{client.clientNumber} &bull; {client.cedula}</p>
          </div>
        </div>
        {action && onActionClick && (
          <Button size="sm" onClick={handleAction} className="bg-accent text-accent-foreground hover:bg-accent/90 z-10 relative ml-2">
            {action === 'represtamo' ? <Repeat className="mr-2 h-4 w-4" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            {action === 'represtamo' ? 'Représtamo' : 'Renovación'}
          </Button>
        )}
        {children && <div className="ml-2">{children}</div>}
      </CardContent>
    </Card>
  );

  if (href) {
    return <Link href={href} onClick={(e) => { e.stopPropagation(); }}>{cardContent}</Link>;
  }

  return cardContent;
}
