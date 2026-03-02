'use client';

import { useEffect, useState, useCallback } from 'react';
import { useUser } from './use-user';
import { useToast } from './use-toast';

interface NotificationEvent {
  type: string;
  message: string;
  data?: any;
  timestamp: string;
}

export function useRealTimeNotifications() {
  const { user } = useUser();
  const { toast } = useToast();
  const [isConnected, setIsConnected] = useState(false);
  const [eventSource, setEventSource] = useState<EventSource | null>(null);

  const handleNotification = useCallback((event: NotificationEvent) => {
    switch (event.type) {
      case 'connected':
        console.log('🔗 Conectado a notificaciones en tiempo real');
        setIsConnected(true);
        break;
        
      case 'heartbeat':
        // Silent heartbeat
        break;
        
      case 'payment_added':
        toast({
          title: "Nuevo Pago Registrado",
          description: event.message,
        });
        // Trigger data refresh
        window.dispatchEvent(new CustomEvent('refresh-dashboard'));
        break;
        
      case 'credit_approved':
        toast({
          title: "Crédito Aprobado",
          description: event.message,
        });
        window.dispatchEvent(new CustomEvent('refresh-requests'));
        break;
        
      case 'credit_disbursed':
        toast({
          title: "Crédito Desembolsado",
          description: event.message,
        });
        window.dispatchEvent(new CustomEvent('refresh-disbursements'));
        break;
        
      case 'system_announcement':
        toast({
          title: "Anuncio del Sistema",
          description: event.message,
          variant: "default",
        });
        break;
        
      default:
        console.log('📢 Notificación:', event);
    }
  }, [toast]);

  useEffect(() => {
    if (!user) {
      // Cleanup if user logs out
      if (eventSource) {
        eventSource.close();
        setEventSource(null);
        setIsConnected(false);
      }
      return;
    }

    // Create EventSource connection
    const es = new EventSource('/api/events');
    setEventSource(es);

    es.onopen = () => {
      console.log('🌐 Conexión SSE establecida');
    };

    es.onmessage = (event) => {
      try {
        const notification: NotificationEvent = JSON.parse(event.data);
        handleNotification(notification);
      } catch (error) {
        console.error('Error parsing notification:', error);
      }
    };

    es.onerror = (error) => {
      console.error('❌ Error en conexión SSE:', error);
      setIsConnected(false);
      
      // Reconnect after 5 seconds
      setTimeout(() => {
        if (es.readyState === EventSource.CLOSED) {
          console.log('🔄 Reintentando conexión SSE...');
          // The useEffect will handle reconnection when user is still available
        }
      }, 5000);
    };

    // Cleanup on unmount
    return () => {
      es.close();
      setIsConnected(false);
    };
  }, [user, handleNotification]);

  return {
    isConnected,
    eventSource
  };
}