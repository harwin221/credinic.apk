'use client';

import { useRealTimeNotifications } from '@/hooks/use-real-time-notifications';
import { Wifi, WifiOff } from 'lucide-react';
import { useOnlineStatus } from '@/hooks/use-online-status';

export function RealTimeIndicator() {
  const { isConnected } = useRealTimeNotifications();
  const { isOnline } = useOnlineStatus();

  if (!isOnline) {
    return (
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <WifiOff className="h-3 w-3" />
        <span>Offline</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 text-xs text-muted-foreground">
      <Wifi className={`h-3 w-3 ${isConnected ? 'text-green-500' : 'text-yellow-500'}`} />
      <span>{isConnected ? 'En tiempo real' : 'Conectando...'}</span>
    </div>
  );
}