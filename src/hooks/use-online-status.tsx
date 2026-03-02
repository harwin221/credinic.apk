
'use client';

import { useState, useEffect } from 'react';

export interface OnlineStatus {
  isOnline: boolean;
}

export function useOnlineStatus(): OnlineStatus {
  const [status, setStatus] = useState<OnlineStatus>({
    isOnline: true,
  });

  useEffect(() => {
    const updateStatus = () => {
      const isOnline = typeof window !== 'undefined' ? navigator.onLine : true;
      setStatus({ isOnline });
    };

    updateStatus(); // Initial check

    const handleOnline = () => setStatus({ isOnline: true });
    const handleOffline = () => setStatus({ isOnline: false });

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return status;
}
