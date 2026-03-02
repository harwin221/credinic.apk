'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Download, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = React.useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallPrompt, setShowInstallPrompt] = React.useState(false);
  const [isInstalled, setIsInstalled] = React.useState(false);
  const { toast } = useToast();

  React.useEffect(() => {
    // Verificar si ya está instalado
    const checkIfInstalled = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const isInWebAppiOS = (window.navigator as any).standalone === true;
      const isInWebAppChrome = window.matchMedia('(display-mode: standalone)').matches;
      
      setIsInstalled(isStandalone || isInWebAppiOS || isInWebAppChrome);
    };

    checkIfInstalled();

    // Escuchar el evento beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const beforeInstallPromptEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(beforeInstallPromptEvent);
      
      // Mostrar el prompt después de un delay para mejor UX
      setTimeout(() => {
        if (!isInstalled) {
          setShowInstallPrompt(true);
        }
      }, 3000);
    };

    // Escuchar cuando la app se instala
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowInstallPrompt(false);
      setDeferredPrompt(null);
      toast({
        title: "¡Aplicación Instalada!",
        description: "CrediNica se ha instalado correctamente en tu dispositivo.",
      });
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [isInstalled, toast]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      // Fallback para dispositivos que no soportan el prompt automático
      toast({
        title: "Instalar Aplicación",
        description: "Para instalar CrediNica, usa el menú de tu navegador y selecciona 'Instalar aplicación' o 'Agregar a pantalla de inicio'.",
      });
      return;
    }

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        toast({
          title: "Instalando...",
          description: "CrediNica se está instalando en tu dispositivo.",
        });
      }
      
      setDeferredPrompt(null);
      setShowInstallPrompt(false);
    } catch (error) {
      console.error('Error durante la instalación:', error);
      toast({
        title: "Error de Instalación",
        description: "Hubo un problema al instalar la aplicación. Intenta desde el menú del navegador.",
        variant: "destructive"
      });
    }
  };

  const handleDismiss = () => {
    setShowInstallPrompt(false);
    // No mostrar de nuevo en esta sesión
    sessionStorage.setItem('pwa-prompt-dismissed', 'true');
  };

  // No mostrar si ya está instalado o si fue rechazado en esta sesión
  if (isInstalled || sessionStorage.getItem('pwa-prompt-dismissed')) {
    return null;
  }

  if (!showInstallPrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 bg-card border rounded-lg shadow-lg p-4 z-50">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center space-x-2">
          <Download className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-sm">Instalar CrediNica</h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDismiss}
          className="h-6 w-6 p-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      <p className="text-xs text-muted-foreground mb-3">
        Instala CrediNica en tu dispositivo para acceso rápido y funcionalidad offline.
      </p>
      
      <div className="flex space-x-2">
        <Button
          onClick={handleInstallClick}
          size="sm"
          className="flex-1"
        >
          <Download className="h-4 w-4 mr-1" />
          Instalar
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleDismiss}
        >
          Ahora no
        </Button>
      </div>
    </div>
  );
}