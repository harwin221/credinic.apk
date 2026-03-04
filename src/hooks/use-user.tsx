
'use client';

import * as React from 'react';
import type { AppUser } from '@/lib/types';
import { useRouter } from 'next/navigation';

interface UserContextType {
  user: AppUser | null;
  loading: boolean;
  setUser: (user: AppUser | null) => void;
}

const UserContext = React.createContext<UserContextType | null>(null);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<AppUser | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [lastFetch, setLastFetch] = React.useState<number>(0);
  const router = useRouter();

  React.useEffect(() => {
    let isMounted = true;

    // Cargar usuario persistido inicialmente si existe
    if (typeof window !== 'undefined') {
      const savedUser = localStorage.getItem('credi_user');
      if (savedUser) {
        try {
          const parsedUser: AppUser = JSON.parse(savedUser);

          // Verificar si la sesión expiró (para modo offline)
          if (parsedUser.sessionExpiresAt && new Date(parsedUser.sessionExpiresAt) < new Date()) {
            console.warn("Sesión local expirada por fecha final del día.");
            localStorage.removeItem('credi_user');
            setUser(null);
          } else {
            setUser(parsedUser);
          }
          setLoading(false);
        } catch (e) {
          console.error("Error parsing saved user", e);
        }
      }
    }

    async function getUserSession() {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const response = await fetch('/api/me', {
          signal: controller.signal,
          cache: 'no-store'
        });

        clearTimeout(timeoutId);

        if (!isMounted) return;

        if (response.ok) {
          const userData: AppUser = await response.json();
          if (userData && userData.id) {
            setUser(userData);
            localStorage.setItem('credi_user', JSON.stringify(userData));
            setLastFetch(Date.now());
          } else {
            setUser(null);
            localStorage.removeItem('credi_user');
          }
        } else if (response.status === 401) {
          // No autorizado (sesión expirada real)
          setUser(null);
          localStorage.removeItem('credi_user');
        }
      } catch (error) {
        if (!isMounted) return;

        // Si es un error de red (no un 401), mantener el usuario de localStorage
        console.warn("Error de red al obtener sesión, se mantiene usuario local si existe.");

      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    getUserSession();

    return () => {
      isMounted = false;
    };
  }, []); // Solo ejecutar una vez al montar

  const handleSetUser = (updatedUser: AppUser | null) => {
    setUser(updatedUser);
  };

  const contextValue = {
    user,
    loading,
    setUser: handleSetUser,
  };

  return (
    <UserContext.Provider value={contextValue}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = React.useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}
