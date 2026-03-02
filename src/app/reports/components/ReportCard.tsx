
'use client';

import type { LucideIcon } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { reportList } from '@/lib/constants';

interface ReportCardProps {
  title: string;
  category: string;
  icon: LucideIcon;
  onClick: () => void;
  disabled?: boolean;
}

export function ReportCard({ title, category, icon: Icon, onClick, disabled = false }: ReportCardProps) {
  const cardContent = (
    <Card
      onClick={!disabled ? onClick : undefined}
      className={cn(
        'group h-full flex flex-col transition-all duration-200 ease-in-out',
        disabled
          ? 'cursor-not-allowed bg-muted/50 text-muted-foreground'
          : 'cursor-pointer hover:shadow-lg hover:border-primary/50 hover:-translate-y-1'
      )}
    >
      <CardHeader className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div
            className={cn(
              'p-2 rounded-lg bg-primary/10',
              disabled ? 'bg-muted-foreground/10' : 'bg-primary/10'
            )}
          >
            <Icon className={cn('h-5 w-5', disabled ? 'text-muted-foreground' : 'text-primary')} />
          </div>
        </div>
        <div className="pt-1">
          <CardTitle className="text-sm font-semibold leading-snug">{title}</CardTitle>
          <CardDescription className="text-xs">{category}</CardDescription>
        </div>
      </CardHeader>
    </Card>
  );

  const reportItem = reportList.find(r => r.title === title);
  if (reportItem && reportItem.disabled) {
      disabled = true;
  }

  if (disabled) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="h-full">{cardContent}</div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Este reporte estará disponible próximamente.</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div className="h-full">
      {cardContent}
    </div>
  );
}
