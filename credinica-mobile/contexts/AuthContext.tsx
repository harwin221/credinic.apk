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
        console.log('[AUTH] Cerrando sesión...');
        try {
            // 1. Borrar de almacenamiento
            await sessionService.clearSession();
            // 2. Limpiar estado de usuario (esto disparará el layout guard)
            setUser(null);
            // 3. Forzar el reset de navegación
            router.dismissAll();
            setTimeout(() => {
                router.replace('/');
            }, 50);
        } catch (error) {
            console.error('[AUTH] Error during logout:', error);
            // Asegurar que al menos el estado local se limpia
            setUser(null);
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

