import { Stack, router, useSegments } from 'expo-router';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { AlertProvider } from '../components/AlertProvider';
import { useEffect } from 'react';
import { ActivityIndicator, View, Text, StyleSheet } from 'react-native';

function RootLayoutContent() {
  const { user, isLoading, isLoggingOut } = useAuth();
  const segments = useSegments();
  const inAuthGroup = segments.length === 0 || segments[0] === 'index'; // La pantalla de login es la raíz (index)

  useEffect(() => {
    if (!isLoading && !isLoggingOut) {
      if (!user && !inAuthGroup) {
        // El usuario no está logueado y no está en el login, redirigir al login
        router.replace('/');
      } else if (user && inAuthGroup) {
        // El usuario está logueado pero está en el Login, redirigir según su rol
        const roleUpper = user.role.toUpperCase();
        const isManager = ['GERENTE', 'ADMINISTRADOR', 'FINANZAS'].includes(roleUpper);
        
        console.log('[LAYOUT] Usuario logueado, redirigiendo...', { role: user.role, isManager });
        
        if (isManager) {
          router.replace('/(manager-tabs)');
        } else {
          router.replace('/(tabs)');
        }
      }
    }
  }, [user, isLoading, isLoggingOut, inAuthGroup]);

  if (isLoading || isLoggingOut) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={isLoggingOut ? "#e11d48" : "#0ea5e9"} />
        <Text style={[styles.loadingText, isLoggingOut && { color: '#e11d48', fontWeight: 'bold' }]}>
          {isLoggingOut ? "Cerrando sesión de forma segura..." : "Cargando sesión..."}
        </Text>
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="(manager-tabs)" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <AlertProvider>
        <RootLayoutContent />
      </AlertProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#64748b',
  },
});