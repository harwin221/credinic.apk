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
        console.log('[AUTH] Logging out...');
        await sessionService.clearSession();
        setUser(null);
        // Limpiamos todo el historial de navegación y volvemos al inicio (Login)
        try {
            router.dismissAll();
            router.replace('/');
        } catch (e) {
            // Fallback si dismissAll da error en algunas versiones de Expo
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

