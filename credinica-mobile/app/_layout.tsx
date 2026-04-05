import { Stack, router, useSegments } from "expo-router";
import { useEffect } from "react";
import { initDatabase } from "../services/offline-db";
import { AuthProvider, useAuth } from "../contexts/AuthContext";

function AuthGuard() {
  const { user, isLoading } = useAuth();
  const segments = useSegments();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(tabs)' || segments[0] === '(manager-tabs)';

    // Si no hay usuario y estamos en una ruta protegida, expulsar al login
    if (!user && inAuthGroup) {
      console.log('[AUTH_GUARD] Sin sesión. Expulsando al login...');
      router.replace('/');
    } 
    // Si hay usuario y estamos en el login (root), llevar al dashboard según el rol
    else if (user && !inAuthGroup) {
      console.log('[AUTH_GUARD] Sesión activa. Llevando al dashboard...');
      const roleUpper = user.role.toUpperCase();
      const isManager = ['GERENTE', 'ADMINISTRADOR', 'FINANZAS', 'OPERATIVO'].includes(roleUpper);
      
      router.replace(isManager ? "/(manager-tabs)" : "/(tabs)");
    }
  }, [user, isLoading, segments]);

  return null;
}

export default function RootLayout() {
  // Inicializar base de datos cuando la app inicia
  useEffect(() => {
    try {
      initDatabase();
      console.log('✅ Base de datos offline inicializada');
    } catch (error) {
      console.error('❌ Error inicializando base de datos:', error);
    }
  }, []);

  return (
    <AuthProvider>
      <AuthGuard />
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(manager-tabs)" options={{ headerShown: false }} />
      </Stack>
    </AuthProvider>
  );
}
