import AsyncStorage from '@react-native-async-storage/async-storage';

export interface UserSession {
    id: string;
    fullName: string;
    username: string;
    email: string | null;
    role: string;
    sucursal: string | null;
    sucursalName: string | null;
}

const SESSION_KEY = '@credinic_user_session';

/**
 * Servicio de gestión de sesiones para la app móvil.
 * 
 * IMPORTANTE: La sesión se guarda en AsyncStorage, que persiste incluso si:
 * - El usuario cierra la app
 * - El dispositivo se reinicia
 * - No hay conexión a internet
 * 
 * Esto permite que el usuario pueda trabajar en modo offline sin tener que
 * iniciar sesión nuevamente cada vez que abre la app.
 * 
 * La sesión solo se elimina cuando:
 * - El usuario hace logout manualmente
 * - Se desinstala la app
 */
export const sessionService = {
    async saveSession(user: UserSession): Promise<void> {
        try {
            console.log('[SESSION] Guardando sesión:', user.username, user.role);
            await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(user));
            console.log('[SESSION] Sesión guardada exitosamente');
        } catch (error) {
            console.error('[SESSION] Error saving session:', error);
        }
    },

    async getSession(): Promise<UserSession | null> {
        try {
            const session = await AsyncStorage.getItem(SESSION_KEY);
            if (session) {
                const parsed = JSON.parse(session);
                console.log('[SESSION] Sesión recuperada:', parsed.username, parsed.role);
                return parsed;
            }
            console.log('[SESSION] No hay sesión guardada');
            return null;
        } catch (error) {
            console.error('[SESSION] Error getting session:', error);
            return null;
        }
    },

    async clearSession(): Promise<void> {
        try {
            console.log('[SESSION] Limpiando sesión...');
            await AsyncStorage.removeItem(SESSION_KEY);
            console.log('[SESSION] Sesión limpiada exitosamente');
            
            // Verificar que realmente se eliminó
            const check = await AsyncStorage.getItem(SESSION_KEY);
            if (check) {
                console.error('[SESSION] ERROR: La sesión no se eliminó correctamente');
            } else {
                console.log('[SESSION] Verificado: Sesión eliminada');
            }
        } catch (error) {
            console.error('[SESSION] Error clearing session:', error);
        }
    }
};
