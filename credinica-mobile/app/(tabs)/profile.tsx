import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, StatusBar, Platform, Modal, FlatList, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { UserSession } from '../../services/session';
import { useState, useEffect } from 'react';
import SyncIndicator from '../../components/SyncIndicator';
import { useAuth } from '../../contexts/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { thermalPrinterService } from '../../services/thermal-printer';
import { AlertHelper } from '../../utils/custom-alert-helper';

export default function ProfileScreen() {
    const { user, logout } = useAuth();
    const [showPrinterModal, setShowPrinterModal] = useState(false);
    const [printers, setPrinters] = useState<any[]>([]);
    const [selectedPrinter, setSelectedPrinter] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadSelectedPrinter();
    }, []);

    const loadSelectedPrinter = async () => {
        const saved = await AsyncStorage.getItem('selectedPrinter');
        setSelectedPrinter(saved);
    };

    const handleSearchPrinters = async () => {
        setLoading(true);
        try {
            const found = await thermalPrinterService.findPrinters();
            setPrinters(found);
            
            // Si solo hay la opción del sistema, puede ser que no se otorgaron permisos
            if (found.length === 1 && found[0].name === 'Impresora Térmica (Sistema)') {
                console.log('[PROFILE] Solo opción del sistema disponible');
            }
        } catch (error: any) {
            AlertHelper.alert('Error', error.message || 'No se pudieron buscar impresoras');
        } finally {
            setLoading(false);
        }
    };

    const handleSelectPrinter = async (printer: any) => {
        await AsyncStorage.setItem('selectedPrinter', printer.name);
        if (printer.address) {
            await AsyncStorage.setItem('selectedPrinterTarget', printer.address);
        }
        setSelectedPrinter(printer.name);
        setShowPrinterModal(false);
        AlertHelper.alert('Impresora configurada', `${printer.name} configurada correctamente`);
    };

    const handleManualSync = async () => {
        setLoading(true);
        try {
            const { fullSync } = await import('../../services/sync-service');
            const result = await fullSync();
            if (result.success) {
                AlertHelper.alert('Éxito', 'Sincronización completada: ' + result.message);
            } else {
                AlertHelper.alert('Aviso', 'Sincronización parcial: ' + result.message);
            }
        } catch (error: any) {
            AlertHelper.alert('Error', 'No se pudo sincronizar: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        AlertHelper.alert(
            'Cerrar Sesión',
            '¿Estás seguro de que quieres salir?',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Salir',
                    style: 'destructive',
                    onPress: async () => {
                        await logout();
                    }
                }
            ]
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#ffffff" translucent={false} />
            {/* Indicador de sincronización */}
            <SyncIndicator />
            
            <View style={styles.header}>
                <View style={styles.avatarContainer}>
                    <MaterialCommunityIcons name="account-circle" size={100} color="#0ea5e9" />
                </View>
                <Text style={styles.userName}>{user?.fullName || 'Cargando...'}</Text>
                <Text style={styles.userRole}>{user?.role || 'User'}</Text>
            </View>

            <View style={styles.infoContainer}>
                <View style={styles.infoRow}>
                    <MaterialCommunityIcons name="office-building" size={24} color="#64748b" />
                    <View style={styles.infoText}>
                        <Text style={styles.label}>Sucursal</Text>
                        <Text style={styles.value}>{user?.sucursalName || 'N/A'}</Text>
                    </View>
                </View>

                <View style={styles.infoRow}>
                    <MaterialCommunityIcons name="account-badge-outline" size={24} color="#64748b" />
                    <View style={styles.infoText}>
                        <Text style={styles.label}>Usuario</Text>
                        <Text style={styles.value}>{user?.username || 'N/A'}</Text>
                    </View>
                </View>

                {/* Sincronización Manual */}
                <TouchableOpacity 
                    style={[styles.syncCard, { backgroundColor: '#f0fdf4' }]} 
                    onPress={handleManualSync}
                    disabled={loading}
                >
                    <MaterialCommunityIcons name="cloud-download" size={28} color="#16a34a" />
                    <View style={styles.infoText}>
                        <Text style={[styles.label, { color: '#16a34a', fontWeight: '800' }]}>ACTUALIZAR CARTERA</Text>
                        <Text style={styles.value}>Descargar mi ruta del día</Text>
                    </View>
                    {loading && <ActivityIndicator size="small" color="#16a34a" />}
                </TouchableOpacity>

                {/* Configuración de impresora */}
                <TouchableOpacity 
                    style={[styles.printerButton, { borderLeftColor: '#0ea5e9', borderLeftWidth: 4 }]} 
                    onPress={async () => {
                        setShowPrinterModal(true);
                        await handleSearchPrinters();
                    }}
                >
                    <MaterialCommunityIcons name="bluetooth-connect" size={28} color="#0ea5e9" />
                    <View style={styles.infoText}>
                        <Text style={[styles.label, { color: '#0ea5e9', fontWeight: '800' }]}>CONECTAR IMPRESORA</Text>
                        <Text style={styles.value}>{selectedPrinter || 'Sin vincular'}</Text>
                    </View>
                </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                <MaterialCommunityIcons name="logout" size={24} color="#ffffff" />
                <Text style={styles.logoutText}>CERRAR SESIÓN</Text>
            </TouchableOpacity>

            {/* Modal de selección de impresora */}
            <Modal visible={showPrinterModal} animationType="fade" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Seleccionar Impresora</Text>
                            <TouchableOpacity onPress={() => setShowPrinterModal(false)}>
                                <MaterialCommunityIcons name="close" size={24} color="#64748b" />
                            </TouchableOpacity>
                        </View>

                        {loading ? (
                            <View style={styles.loadingContainer}>
                                <ActivityIndicator size="large" color="#0ea5e9" />
                                <Text style={styles.loadingText}>Buscando impresoras...</Text>
                            </View>
                        ) : printers.length === 0 ? (
                            <View style={styles.emptyContainer}>
                                <MaterialCommunityIcons name="printer-off" size={64} color="#cbd5e1" />
                                <Text style={styles.emptyText}>No se encontraron impresoras</Text>
                                <Text style={styles.emptyHint}>Empareja tu impresora en Bluetooth</Text>
                                <Text style={styles.emptyHint}>y otorga los permisos necesarios</Text>
                                <TouchableOpacity style={styles.retryButton} onPress={handleSearchPrinters}>
                                    <Text style={styles.retryText}>Buscar de nuevo</Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <FlatList
                                data={printers}
                                keyExtractor={(item, index) => index.toString()}
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        style={[
                                            styles.printerItem,
                                            selectedPrinter === item.name && styles.printerItemSelected
                                        ]}
                                        onPress={() => handleSelectPrinter(item)}
                                    >
                                        <MaterialCommunityIcons 
                                            name="printer" 
                                            size={32} 
                                            color={selectedPrinter === item.name ? '#0ea5e9' : '#64748b'} 
                                        />
                                        <View style={styles.printerInfo}>
                                            <Text style={styles.printerName}>{item.name}</Text>
                                            <Text style={styles.printerAddress}>{item.address || 'Bluetooth'}</Text>
                                        </View>
                                        {selectedPrinter === item.name && (
                                            <MaterialCommunityIcons name="check-circle" size={24} color="#0ea5e9" />
                                        )}
                                    </TouchableOpacity>
                                )}
                            />
                        )}
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#ffffff',
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    },
    header: {
        alignItems: 'center',
        paddingVertical: 30,
        backgroundColor: '#f8fafc',
    },
    avatarContainer: {
        marginBottom: 15,
    },
    userName: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#334155',
    },
    userRole: {
        fontSize: 16,
        color: '#0ea5e9',
        fontWeight: '600',
        marginTop: 4,
    },
    infoContainer: {
        padding: 25,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 25,
    },
    infoText: {
        marginLeft: 20,
        flex: 1,
    },
    label: {
        fontSize: 14,
        color: '#94a3b8',
    },
    value: {
        fontSize: 16,
        color: '#334155',
        fontWeight: '600',
    },
    printerButton: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 15,
        padding: 15,
        backgroundColor: '#f1f5f9',
        borderRadius: 12,
    },
    syncCard: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 10,
        padding: 15,
        backgroundColor: '#f0fdf4',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#bbf7d0',
    },
    logoutButton: {
        flexDirection: 'row',
        backgroundColor: '#e11d48',
        marginHorizontal: 25,
        padding: 18,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'absolute',
        bottom: 100,
        left: 0,
        right: 0,
    },
    logoutText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: 'bold',
        marginLeft: 10,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContainer: {
        backgroundColor: '#ffffff',
        borderRadius: 20,
        width: '100%',
        maxHeight: '70%',
        paddingBottom: 20,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#334155',
    },
    loadingContainer: {
        padding: 40,
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 15,
        fontSize: 16,
        color: '#64748b',
    },
    emptyContainer: {
        padding: 40,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#334155',
        marginTop: 15,
    },
    emptyHint: {
        fontSize: 14,
        color: '#94a3b8',
        marginTop: 5,
    },
    retryButton: {
        marginTop: 20,
        paddingHorizontal: 30,
        paddingVertical: 12,
        backgroundColor: '#0ea5e9',
        borderRadius: 8,
    },
    retryText: {
        color: '#ffffff',
        fontWeight: '600',
    },
    printerItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    printerItemSelected: {
        backgroundColor: '#eff6ff',
    },
    printerInfo: {
        flex: 1,
        marginLeft: 15,
    },
    printerName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#334155',
    },
    printerAddress: {
        fontSize: 14,
        color: '#94a3b8',
        marginTop: 2,
    },
});

