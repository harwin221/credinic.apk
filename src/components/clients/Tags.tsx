
'use client';

import * as React from 'react';
import type { Client } from '@/lib/types';
import { updateClient } from '@/services/client-service';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { X, Tag as TagIcon, PlusCircle } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';

interface TagsProps {
  client: Client;
  onUpdate: () => void;
}

export function Tags({ client, onUpdate }: TagsProps) {
  const { toast } = useToast();
  const [newTag, setNewTag] = React.useState('');
  const [isPopoverOpen, setIsPopoverOpen] = React.useState(false);

  const handleAddTag = async () => {
    if (!newTag.trim()) return;
    const currentTags = client.tags || [];
    if (currentTags.includes(newTag.trim().toUpperCase())) {
      toast({ title: 'Etiqueta duplicada', variant: 'destructive' });
      return;
    }
    const updatedTags = [...currentTags, newTag.trim().toUpperCase()];
    await updateClient(client.id, { tags: updatedTags });
    setNewTag('');
    setIsPopoverOpen(false);
    onUpdate();
  };

  const handleRemoveTag = async (tagToRemove: string) => {
    const updatedTags = (client.tags || []).filter(tag => tag !== tagToRemove);
    await updateClient(client.id, { tags: updatedTags });
    onUpdate();
  };

  return (
    <div className="flex flex-wrap items-center gap-2 mt-2">
      {(client.tags || []).map(tag => (
        <Badge key={tag} variant="secondary" className="capitalize pr-1">
          {tag.toLowerCase()}
          <button onClick={() => handleRemoveTag(tag)} className="ml-1 rounded-full hover:bg-destructive/20 p-0.5">
            <X className="h-3 w-3" />
            <span className="sr-only">Quitar etiqueta {tag}</span>
          </button>
        </Badge>
      ))}
       <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-6 px-2 text-xs">
            <PlusCircle className="h-3 w-3 mr-1" />
            Añadir Etiqueta
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-60 p-2">
          <div className="flex gap-2">
            <Input
              placeholder="Ej: BUEN PAGADOR"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAddTag(); }}
              className="h-8"
            />
            <Button size="sm" onClick={handleAddTag}>Añadir</Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
