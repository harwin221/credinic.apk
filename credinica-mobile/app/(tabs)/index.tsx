import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity, RefreshControl, StatusBar, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { API_ENDPOINTS } from '../../config/api';

export default function RecoveredScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useAuth();

  // Mock data as fallback while loading real session/metrics
  const [dashboardData, setDashboardData] = useState({
    gestorName: user?.fullName || 'Cargando...',
    date: new Date().toLocaleDateString('es-NI', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
    totalRecuperacion: 0,
    diaRecaudado: 0,
    moraRecaudada: 0,
    proximoRecaudado: 0,
    vencidoRecaudado: 0,
    totalClientesCobrados: 0
  });

  useFocusEffect(
    useCallback(() => {
      if (user?.id) {
        fetchDashboardMetrics(user.id);
      }
    }, [user])
  );

  const fetchDashboardMetrics = async (userId?: string) => {
    const id = userId || user?.id;
    if (!id || !user?.role) return;

    try {
      const url = `${API_ENDPOINTS.mobile_dashboard}?userId=${id}&role=${user.role}`;
      console.log('[DASHBOARD] Fetching:', url);
      
      const resp = await fetch(url);
      console.log('[DASHBOARD] Status:', resp.status, resp.ok);
      
      const responseText = await resp.text();
      console.log('[DASHBOARD] Respuesta cruda:', responseText || '(VACÍO)');
      
      try {
        const result = JSON.parse(responseText);
        if (result.success) {
          setDashboardData(prev => ({
            ...prev,
            ...result.data
          }));
        } else {
          console.error('[DASHBOARD] Error del servidor:', result.message);
        }
      } catch (parseError) {
        if (responseText) {
          console.error('[DASHBOARD] Error al procesar JSON:', parseError);
        }
      }
    } catch (error) {
      console.error('Error fetching dashboard metrics:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDashboardMetrics();
    setRefreshing(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" translucent={false} />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0ea5e9']} />}
      >
        {/* Header Section */}
        <View style={styles.header}>
          <View style={styles.logoRow}>
            <Text style={styles.logoText}>CREDINIC</Text>
            <Text style={styles.versionText}>v1.0.0</Text>
          </View>
          <Text style={styles.gestorName}>{dashboardData.gestorName}</Text>
          <Text style={styles.greeting}>¡Que tengas un buen día!</Text>
          <Text style={styles.dateText}>{dashboardData.date}</Text>
        </View>

        <View style={styles.divider} />

        {/* Total Recovery Section */}
        <View style={styles.recoverySection}>
          <Text style={styles.sectionTitle}>RECUPERACIÓN</Text>
          <Text style={styles.totalAmount}>C$ {dashboardData.totalRecuperacion.toLocaleString('es-NI', { minimumFractionDigits: 2 })}</Text>


        </View>

        <View style={styles.divider} />

        {/* Daily Info Section */}
        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>Información del día</Text>



          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Dia Recaudado:</Text>
            <Text style={styles.infoValueGreen}>C$ {dashboardData.diaRecaudado.toLocaleString('es-NI', { minimumFractionDigits: 2 })}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Mora Recaudada:</Text>
            <Text style={styles.infoValueOrange}>C$ {dashboardData.moraRecaudada.toLocaleString('es-NI', { minimumFractionDigits: 2 })}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Proximo Recaudado:</Text>
            <Text style={styles.infoValueGreen}>C$ {dashboardData.proximoRecaudado.toLocaleString('es-NI', { minimumFractionDigits: 2 })}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Vencido Recaudado:</Text>
            <Text style={styles.infoValueRed}>C$ {dashboardData.vencidoRecaudado.toLocaleString('es-NI', { minimumFractionDigits: 2 })}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Total Clientes Cobrados:</Text>
            <Text style={styles.infoValueGreen}>{dashboardData.totalClientesCobrados}</Text>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    padding: 20,
    paddingTop: 25,
    alignItems: 'center',
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    alignSelf: 'flex-start',
    marginBottom: 40,
  },
  logoText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#334155',
    letterSpacing: 0.5,
  },
  versionText: {
    fontSize: 12,
    color: '#0ea5e9',
    marginLeft: 6,
    fontWeight: 'bold',
  },
  gestorName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#334155',
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  greeting: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 5,
  },
  dateText: {
    fontSize: 14,
    color: '#0ea5e9',
    fontWeight: '600',
    marginTop: 5,
  },
  divider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginHorizontal: 20,
  },
  recoverySection: {
    padding: 20,
    paddingTop: 30,
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#334155',
    letterSpacing: 0.5,
  },
  totalAmount: {
    fontSize: 30,
    fontWeight: '900',
    color: '#0ea5e9',
    marginTop: 10,
    marginBottom: 20,
  },
  splitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 10,
  },
  splitBox: {
    alignItems: 'center',
    flex: 1,
  },
  splitLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  splitAmountRed: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#e11d48', // Red for transfers conceptually if 0, matching the image
    marginTop: 5,
  },
  splitAmountBlue: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#0ea5e9',
    marginTop: 5,
  },
  infoSection: {
    padding: 20,
    paddingTop: 30,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#334155',
    marginBottom: 15,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
  },
  infoLabel: {
    fontSize: 15,
    color: '#64748b',
  },
  infoValueRed: {
    fontSize: 15,
    fontWeight: '700',
    color: '#e11d48',
  },
  infoValueGreen: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0ea5e9',
  },
  infoValueOrange: {
    fontSize: 15,
    fontWeight: '700',
    color: '#f97316',
  },
});
