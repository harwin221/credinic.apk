import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, Image, KeyboardAvoidingView, Platform, ScrollView, StatusBar, ActivityIndicator } from 'react-native';
import { useState, useCallback, useEffect } from 'react';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { sessionService } from '../services/session';
import { useAuth } from '../contexts/AuthContext';
import { Alert } from '../utils/alert';

export default function LoginScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const params = useLocalSearchParams();
    const { user, login } = useAuth();

    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert('Error', 'Por favor ingresa tu usuario y contraseña');
            return;
        }

        setIsLoading(true);

        try {
            // Conexión oficial al servidor web (Vercel) para validar las credenciales
            const response = await fetch('https://credinic-apk.vercel.app/api/mobile/mobile_login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username: email, password: password }),
            });

            const data = await response.json();

            if (data.success) {
                // Persistimos los datos reales del usuario que devolvió Vercel
                await login(data.user);

                // Redirigir según el rol (comparar en mayúsculas como la app web)
                const roleUpper = data.user.role.toUpperCase();
                const isManager = roleUpper === 'GERENTE' || roleUpper === 'ADMINISTRADOR' || roleUpper === 'FINANZAS';
                
                // Mostrar alert y redirigir cuando se cierre
                Alert.alert(
                    '¡Bienvenido!', 
                    `Has ingresado como ${data.user.role}`,
                    [
                        {
                            text: 'OK',
                            onPress: () => {
                                if (isManager) {
                                    router.replace('/(manager-tabs)');
                                } else {
                                    router.replace('/(tabs)');
                                }
                            }
                        }
                    ]
                );
            } else {
                // Credenciales incorrectas, usuario inactivo, o rol no permitido
                Alert.alert('Acceso Denegado', data.message || 'Credenciales inválidas');
            }
        } catch (error) {
            console.error(error);
            Alert.alert('Error de Conexión', 'No se pudo conectar con el servidor. Revisa tu internet.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#ffffff" translucent={false} />
            <Text style={styles.topVersionText}>v1.0.0</Text>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}
            >
                <ScrollView contentContainerStyle={styles.scrollContent}>

                    <View style={styles.logoContainer}>
                        {/* Imagen CrediNica pura para el Login */}
                        <Image
                            source={require('../assets/images/credinica.png')}
                            style={styles.logoImage}
                            resizeMode="contain"
                        />
                    </View>

                    <View style={styles.formContainer}>

                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Usuario</Text>
                            <View style={styles.inputWrapper}>
                                <MaterialCommunityIcons name="account-outline" size={20} color="#94a3b8" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Tu nombre de usuario"
                                    placeholderTextColor="#94a3b8"
                                    autoCapitalize="none"
                                    value={email}
                                    onChangeText={setEmail}
                                />
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Contraseña</Text>
                            <View style={styles.inputWrapper}>
                                <MaterialCommunityIcons name="lock-outline" size={20} color="#94a3b8" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Tu contraseña"
                                    placeholderTextColor="#94a3b8"
                                    secureTextEntry={!showPassword}
                                    value={password}
                                    onChangeText={setPassword}
                                />
                                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                                    <MaterialCommunityIcons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color="#94a3b8" />
                                </TouchableOpacity>
                            </View>
                        </View>

                        <TouchableOpacity
                            style={styles.loginButton}
                            onPress={handleLogin}
                            disabled={isLoading}
                        >
                            <Text style={styles.loginButtonText}>
                                {isLoading ? 'VERIFICANDO...' : 'INGRESAR'}
                            </Text>
                        </TouchableOpacity>

                    </View>

                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}



const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#ffffff',
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    },
    keyboardView: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        padding: 24,
    },
    logoContainer: {
        alignItems: 'center',
        marginBottom: 40,
    },
    logoImage: {
        width: 180,
        height: 80,
    },
    topVersionText: {
        position: 'absolute',
        top: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 10 : 50,
        left: 20,
        fontSize: 14,
        color: '#0ea5e9',
        fontWeight: 'bold',
        zIndex: 10,
    },
    formContainer: {
        width: '100%',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#334155',
        marginBottom: 8,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 15,
        color: '#64748b',
        marginBottom: 32,
        textAlign: 'center',
    },
    inputGroup: {
        marginBottom: 20,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#475569',
        marginBottom: 8,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f8fafc',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 12,
        height: 52,
    },
    inputIcon: {
        marginLeft: 15,
        marginRight: 10,
    },
    input: {
        flex: 1,
        height: '100%',
        color: '#334155',
        fontSize: 16,
    },
    eyeIcon: {
        padding: 15,
    },
    loginButton: {
        backgroundColor: '#0ea5e9',
        height: 56,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 10,
        shadowColor: '#0ea5e9',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    loginButtonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 12,
        fontSize: 14,
        color: '#64748b',
    },
});

