import React, { createContext, useContext, useState, useEffect } from 'react';
import { sessionService, UserSession } from '../services/session';
import { router } from 'expo-router';

interface AuthContextType {
    user: UserSession | null;
    isLoading: boolean;
    login: (user: UserSession) => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<UserSession | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadSession();
    }, []);

    const loadSession = async () => {
        try {
            const session = await sessionService.getSession();
            setUser(session);
        } catch (error) {
            console.error('[AUTH] Error loading session:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const login = async (userData: UserSession) => {
        await sessionService.saveSession(userData);
        setUser(userData);
    };

    const logout = async () => {
        console.log('[AUTH] Cerrando sesión (Modo Atómico)...');
        // 1. Limpiar estado de usuario INMEDIATAMENTE (para que reaccione el layout)
        setUser(null);
        
        try {
            // 2. Ejecutar limpieza de almacenamiento (fire and forget o espera corta)
            // No dejamos que esto bloquee la navegación
            sessionService.clearSession().catch(e => console.error('[AUTH] Error async clear:', e));
            
            // 3. Forzar el reset de navegación con un pequeño retraso para asegurar el ciclo de React
            setTimeout(() => {
                router.replace('/');
            }, 10);
            
        } catch (error) {
            console.error('[AUTH] Fatal Logout Error:', error);
            router.replace('/');
        }
    };

    return (
        <AuthContext.Provider value={{ user, isLoading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

