import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import { checkConnection, fullSync, getLastSyncDate } from '../services/sync-service';
import { getOfflineStats } from '../services/offline-db';

export default function SyncIndicator() {
    const [isOnline, setIsOnline] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
    const [lastSync, setLastSync] = useState<Date | null>(null);
    const [pendingItems, setPendingItems] = useState(0);

    useEffect(() => {
        checkConnectionStatus();
        loadSyncInfo();
        
        // Verificar conexión cada 30 segundos
        const interval = setInterval(checkConnectionStatus, 30000);
        return () => clearInterval(interval);
    }, []);

    const checkConnectionStatus = async () => {
        const online = await checkConnection();
        setIsOnline(online);
        
        // Si recupera conexión, sincronizar automáticamente
        if (online && !isOnline && pendingItems > 0) {
            handleSync();
        }
    };

    const loadSyncInfo = async () => {
        const lastSyncDate = await getLastSyncDate();
        setLastSync(lastSyncDate);
        
        const stats: any = await getOfflineStats();
        setPendingItems(stats.pendingPayments + stats.pendingCredits);
    };

    const handleSync = async () => {
        setIsSyncing(true);
        try {
            const result = await fullSync();
            await loadSyncInfo();
            
            if (result.success) {
                console.log('✅ Sincronización exitosa');
            } else {
                console.log('⚠️ Sincronización con errores:', result.message);
            }
        } catch (error) {
            console.error('❌ Error en sincronización:', error);
        } finally {
            setIsSyncing(false);
        }
    };

    const formatLastSync = () => {
        if (!lastSync) return 'Nunca';
        
        const now = new Date();
        const diff = now.getTime() - lastSync.getTime();
        const minutes = Math.floor(diff / 60000);
        
        if (minutes < 1) return 'Hace un momento';
        if (minutes < 60) return `Hace ${minutes} min`;
        
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `Hace ${hours}h`;
        
        return lastSync.toLocaleDateString('es-NI');
    };

    return (
        <View style={styles.container}>
            <View style={styles.statusRow}>
                <View style={styles.statusInfo}>
                    <MaterialCommunityIcons 
                        name={isOnline ? "wifi" : "wifi-off"} 
                        size={16} 
                        color={isOnline ? "#10b981" : "#ef4444"} 
                    />
                    <Text style={styles.statusText}>
                        {isOnline ? 'En línea' : 'Sin conexión'}
                    </Text>
                    {pendingItems > 0 && (
                        <View style={styles.badge}>
                            <Text style={styles.badgeText}>{pendingItems}</Text>
                        </View>
                    )}
                </View>

                {isOnline && (
                    <TouchableOpacity 
                        style={styles.syncButton}
                        onPress={handleSync}
                        disabled={isSyncing}
                    >
                        {isSyncing ? (
                            <ActivityIndicator size="small" color="#0ea5e9" />
                        ) : (
                            <MaterialCommunityIcons name="sync" size={18} color="#0ea5e9" />
                        )}
                    </TouchableOpacity>
                )}
            </View>
            
            <Text style={styles.lastSyncText}>
                Última sincronización: {formatLastSync()}
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#f8fafc',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0',
    },
    statusRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    statusInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    statusText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#334155',
    },
    badge: {
        backgroundColor: '#ef4444',
        borderRadius: 10,
        paddingHorizontal: 6,
        paddingVertical: 2,
        minWidth: 20,
        alignItems: 'center',
    },
    badgeText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#fff',
    },
    syncButton: {
        padding: 4,
    },
    lastSyncText: {
        fontSize: 11,
        color: '#64748b',
    },
});

