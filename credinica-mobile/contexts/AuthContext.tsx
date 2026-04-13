import React, { createContext, useContext, useState, useEffect } from 'react';
import { sessionService, UserSession } from '../services/session';
import { router } from 'expo-router';
import { fullSync } from '../services/sync-service'; // Asumiendo que esta ruta es correcta
import { clearOfflineDatabase } from '../services/offline-db'; // Importar la nueva función

interface AuthContextType {
    user: UserSession | null;
    isLoading: boolean;
    isLoggingOut: boolean;
    login: (user: UserSession) => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<UserSession | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    useEffect(() => {
        loadSession();
        setupAutoLogout();
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

    // Configurar cierre de sesión automático a las 00:00:00
    const setupAutoLogout = () => {
        const checkAndLogout = async () => {
            const now = new Date();
            const midnight = new Date();
            midnight.setHours(24, 0, 0, 0); // Próxima medianoche
            
            const timeUntilMidnight = midnight.getTime() - now.getTime();
            
            console.log('[AUTH] Auto-logout configurado para:', midnight.toLocaleString('es-NI'));
            
            setTimeout(async () => {
                console.log('[AUTH] Ejecutando cierre de sesión automático a las 00:00:00');
                const session = await sessionService.getSession();
                if (session) {
                    await logout();
                }
                // Reconfigurar para el siguiente día
                setupAutoLogout();
            }, timeUntilMidnight);
        };
        
        checkAndLogout();
    };

    const login = async (userData: UserSession) => {
        await sessionService.saveSession(userData);
        setUser(userData);
        // Disparar una sincronización completa después de un inicio de sesión exitoso
        // para asegurar que los datos offline estén frescos para el nuevo usuario.
        try {
            console.log('[AUTH] Disparando sincronización completa después del login...');
            await fullSync();
        } catch (error) {
            console.error('[AUTH] Error durante la sincronización inicial después del login:', error);
        }
    };

    const logout = async () => {
        console.log('[AUTH] Cerrando sesión (Modo Atómico)...');
        
        setIsLoggingOut(true);
        try {
            // 1. Limpiar almacenamiento persistente de la sesión y DB local primero
            await sessionService.clearSession();
            await clearOfflineDatabase();
            
            // 2. Limpiar el estado de usuario
            setUser(null);

            // 3. Forzar navegación inmediata al login
            // Usamos un delay de 1.5s para que el usuario vea el mensaje de confirmación de seguridad
            setTimeout(() => {
                setIsLoggingOut(false);
                router.replace('/');
            }, 1500);
            
        } catch (error) {
            console.error('[AUTH] Fatal Logout Error:', error);
            setIsLoggingOut(false);
            setUser(null);
            router.replace('/');
        }
    };

    return (
        <AuthContext.Provider value={{ user, isLoading, isLoggingOut, login, logout }}>
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
