
'use client';

import * as React from 'react';
import type { Client, ClientInteraction } from '@/lib/types';
import { useUser } from '@/hooks/use-user';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { PlusCircle, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { nowInNicaragua } from '@/lib/date-utils';

interface InteractionsProps {
  client: Client;
  onInteractionAdd: (interaction: Omit<ClientInteraction, 'id'>) => Promise<void>;
}

export function Interactions({ client, onInteractionAdd }: InteractionsProps) {
  const { user } = useUser();
  const [isAdding, setIsAdding] = React.useState(false);
  const [newInteractionNotes, setNewInteractionNotes] = React.useState('');
  const [newInteractionType, setNewInteractionType] = React.useState<'Llamada' | 'Mensaje' | 'Visita' | 'Nota'>('Nota');

  const handleAddInteraction = async () => {
    if (!newInteractionNotes.trim() || !user) return;
    setIsAdding(true);
    
    const interaction: Omit<ClientInteraction, 'id'> = {
      date: nowInNicaragua(),
      user: user.fullName,
      type: newInteractionType,
      notes: newInteractionNotes,
    };
    
    await onInteractionAdd(interaction);
    setNewInteractionNotes('');
    setIsAdding(false);
  };
  
  const interactions = [...(client.interactions || [])].sort((a,b) => {
      try {
        return parseISO(b.date).getTime() - parseISO(a.date).getTime();
      } catch(e) {
        return 0;
      }
  });

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Select value={newInteractionType} onValueChange={(v) => setNewInteractionType(v as any)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
                <SelectItem value="Nota">Nota General</SelectItem>
                <SelectItem value="Llamada">Llamada</SelectItem>
                <SelectItem value="Mensaje">Mensaje</SelectItem>
                <SelectItem value="Visita">Visita</SelectItem>
            </SelectContent>
        </Select>
        <Textarea
          placeholder={`Añadir una ${newInteractionType.toLowerCase()}...`}
          value={newInteractionNotes}
          onChange={(e) => setNewInteractionNotes(e.target.value)}
          className="h-20"
        />
        <Button onClick={handleAddInteraction} disabled={isAdding || !newInteractionNotes.trim()}>
          {isAdding ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlusCircle className="h-4 w-4" />}
          <span className="ml-2">{isAdding ? 'Guardando...' : 'Registrar'}</span>
        </Button>
      </div>
      
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {interactions.length > 0 ? (
          interactions.map(interaction => (
            <Card key={interaction.id} className="bg-muted/50">
              <CardContent className="p-3">
                 <div className="flex justify-between items-start text-xs">
                    <p className="font-semibold">{interaction.user} <span className="font-normal text-muted-foreground">({interaction.type})</span></p>
                    <p className="text-muted-foreground">{format(parseISO(interaction.date), 'dd MMM yy, HH:mm', { locale: es })}</p>
                 </div>
                 <p className="text-sm mt-1">{interaction.notes}</p>
              </CardContent>
            </Card>
          ))
        ) : (
          <p className="text-sm text-muted-foreground text-center pt-4">No hay interacciones registradas.</p>
        )}
      </div>
    </div>
  );
}
