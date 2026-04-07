import { Stack, router, useSegments } from "expo-router";
import { useEffect } from "react";
import { initDatabase } from "../services/offline-db";
import { AuthProvider, useAuth } from "../contexts/AuthContext";
import { AlertProvider } from "../components/AlertProvider";

function RootContent() {
  const { user, isLoading } = useAuth();
  const segments = useSegments();

  useEffect(() => {
    console.log('[AUTH_DEBUG] User:', !!user, 'Segments:', segments);
    if (isLoading) return;

    const inTabsGroup = segments[0] === '(tabs)' || segments[0] === '(manager-tabs)';

    if (!user && !isLoading) {
      router.replace('/');
    } else if (user && !isLoading) {
      if (!inTabsGroup) {
        console.log('[AUTH_GUARD] Sesión activa. Redirigiendo a tabs...');
        const roleUpper = user.role.toUpperCase();
        const isManager = ['GERENTE', 'ADMINISTRADOR', 'FINANZAS', 'OPERATIVO'].includes(roleUpper);
        router.replace(isManager ? "/(manager-tabs)" : "/(tabs)");
      }
    }
  }, [user, isLoading, segments]);

  if (isLoading) {
    return null; // Podrías poner una pantalla de carga aquí
  }

  return (
    <AlertProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(manager-tabs)" />
      </Stack>
      
      {/* Botón flotante de descarga post-login (solo para gestores) */}
      {user && !['GERENTE', 'ADMINISTRADOR'].includes(user.role.toUpperCase()) && (
          <SyncPrompt />
      )}
    </AlertProvider>
  );
}

// Pequeño componente interno para el mensaje de bienvenida
function SyncPrompt() {
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
      <RootContent />
    </AuthProvider>
  );
}

