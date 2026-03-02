'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, AlertCircle, Smartphone, Monitor } from 'lucide-react';

export function PWAStatus() {
  const [pwaStatus, setPwaStatus] = React.useState({
    isInstalled: false,
    isStandalone: false,
    hasServiceWorker: false,
    hasManifest: false,
    isOnline: navigator.onLine,
    installPromptAvailable: false
  });

  React.useEffect(() => {
    const checkPWAStatus = () => {
      // Verificar si está instalado
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const isInWebAppiOS = (window.navigator as any).standalone === true;
      const isInstalled = isStandalone || isInWebAppiOS;

      // Verificar Service Worker
      const hasServiceWorker = 'serviceWorker' in navigator;

      // Verificar Manifest
      const manifestLink = document.querySelector('link[rel="manifest"]');
      const hasManifest = !!manifestLink;

      setPwaStatus(prev => ({
        ...prev,
        isInstalled,
        isStandalone,
        hasServiceWorker,
        hasManifest,
        isOnline: navigator.onLine
      }));
    };

    checkPWAStatus();

    // Escuchar cambios de conexión
    const handleOnline = () => setPwaStatus(prev => ({ ...prev, isOnline: true }));
    const handleOffline = () => setPwaStatus(prev => ({ ...prev, isOnline: false }));
    
    // Escuchar prompt de instalación
    const handleBeforeInstallPrompt = () => {
      setPwaStatus(prev => ({ ...prev, installPromptAvailable: true }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const StatusItem = ({ 
    label, 
    status, 
    icon: Icon 
  }: { 
    label: string; 
    status: boolean; 
    icon: React.ElementType;
  }) => (
    <div className="flex items-center justify-between p-2 rounded border">
      <div className="flex items-center space-x-2">
        <Icon className="h-4 w-4" />
        <span className="text-sm">{label}</span>
      </div>
      {status ? (
        <CheckCircle className="h-4 w-4 text-green-500" />
      ) : (
        <XCircle className="h-4 w-4 text-red-500" />
      )}
    </div>
  );

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Smartphone className="h-5 w-5" />
          <span>Estado PWA</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Estado de Instalación:</span>
          <Badge variant={pwaStatus.isInstalled ? "default" : "secondary"}>
            {pwaStatus.isInstalled ? "Instalada" : "No Instalada"}
          </Badge>
        </div>

        <StatusItem 
          label="Modo Standalone" 
          status={pwaStatus.isStandalone} 
          icon={Monitor}
        />
        
        <StatusItem 
          label="Service Worker" 
          status={pwaStatus.hasServiceWorker} 
          icon={CheckCircle}
        />
        
        <StatusItem 
          label="Manifest" 
          status={pwaStatus.hasManifest} 
          icon={CheckCircle}
        />
        
        <StatusItem 
          label="Conexión Online" 
          status={pwaStatus.isOnline} 
          icon={pwaStatus.isOnline ? CheckCircle : AlertCircle}
        />

        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground">
            {pwaStatus.isInstalled 
              ? "✅ La aplicación está instalada correctamente"
              : pwaStatus.installPromptAvailable
              ? "📱 Prompt de instalación disponible"
              : "ℹ️ Para instalar, usa el menú del navegador"
            }
          </p>
        </div>

        {!pwaStatus.isInstalled && (
          <div className="pt-2">
            <p className="text-xs text-muted-foreground mb-2">
              <strong>Para instalar en:</strong>
            </p>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• <strong>Chrome/Edge:</strong> Menú → "Instalar CrediNica"</li>
              <li>• <strong>Safari iOS:</strong> Compartir → "Agregar a pantalla de inicio"</li>
              <li>• <strong>Firefox:</strong> Menú → "Instalar"</li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}