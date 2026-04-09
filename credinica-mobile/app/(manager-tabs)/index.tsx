import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity, RefreshControl, StatusBar, Platform, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState, useEffect, useCallback } from 'react';
import { useFocusEffect, router } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { API_ENDPOINTS } from '../../config/api';
import { AlertHelper } from '../../utils/custom-alert-helper';

export default function ManagerDashboardScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const { user, logout } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState({
    gestorName: user?.fullName || 'Cargando...',
    date: new Date().toLocaleDateString('es-NI', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
    totalRecuperacion: 0,
    diaRecaudado: 0,
    moraRecaudada: 0,
    proximoRecaudado: 0,
    vencidoRecaudado: 0,
    totalClientesCobrados: 0,
    solicitudesPendientes: 0,
    desembolsosPendientes: 0,
    recaudacionPorGestor: [] as any[],
  });

  useFocusEffect(
    useCallback(() => {
        if (user) {
            fetchDashboardMetrics(user.id);
        }
    }, [user])
  );

  const fetchDashboardMetrics = async (userId?: string) => {
    const id = userId || user?.id;
    if (!id || !user?.role) return;

    try {
      const url = `${API_ENDPOINTS.mobile_dashboard}?userId=${id}&role=${user.role}`;
      console.log('[DASHBOARD MANAGER] Fetching:', url);
      
      const resp = await fetch(url);
      console.log('[DASHBOARD MANAGER] Status:', resp.status, resp.ok);
      
      const responseText = await resp.text();
      console.log('[DASHBOARD MANAGER] Respuesta cruda:', responseText || '(VACÍO)');
      
      try {
        const result = JSON.parse(responseText);
        if (result.success) {
          setDashboardData(prev => ({
            ...prev,
            ...result.data
          }));
        } else {
          console.error('[DASHBOARD MANAGER] Error del servidor:', result.message);
        }
      } catch (parseError) {
        if (responseText) {
          console.error('[DASHBOARD MANAGER] Error al procesar JSON:', parseError);
        }
      }
    } catch (error) {
      console.error('Error fetching dashboard metrics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDashboardMetrics();
    setRefreshing(false);
  };

  const handleLogout = async () => {
    await logout();
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" translucent={false} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0ea5e9" />
          <Text style={styles.loadingText}>Cargando dashboard...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" translucent={false} />
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <MaterialCommunityIcons name="logout" size={22} color="#dc2626" />
      </TouchableOpacity>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0ea5e9']} />}
      >
        {/* Header Section */}
        <View style={styles.header}>
          <View style={styles.logoRow}>
            <Text style={styles.logoText}>CREDINIC</Text>
            <View style={styles.managerBadge}>
              <Text style={styles.managerBadgeText}>GERENTE</Text>
            </View>
          </View>
          <Text style={styles.gestorName}>{dashboardData.gestorName}</Text>
          <Text style={styles.dateText}>{dashboardData.date}</Text>
        </View>

        {/* Total Recovery Card */}
        <View style={styles.totalCard}>
          <Text style={styles.totalCardTitle}>RECAUDACION TOTAL</Text>
          <Text style={styles.totalCardAmount}>C$ {dashboardData.totalRecuperacion.toLocaleString('es-NI', { minimumFractionDigits: 2 })}</Text>
          
          <View style={styles.currencyRow}>
            <View style={styles.currencyBox}>
              <Text style={styles.currencyLabel}>Córdobas</Text>
              <Text style={styles.currencyValue}>C$ {dashboardData.totalRecuperacion.toLocaleString('es-NI', { minimumFractionDigits: 2 })}</Text>
            </View>
            <View style={styles.currencyBox}>
              <Text style={styles.currencyLabel}>Dólares</Text>
              <Text style={[styles.currencyValue, { color: '#10b981' }]}>$ 0.00</Text>
            </View>
          </View>
        </View>

        {/* Chart Section */}
        {dashboardData.recaudacionPorGestor.length > 0 && (
          <View style={styles.chartSection}>
            <Text style={styles.chartTitle}>RECUPERACION</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.chartContainer}>
                {dashboardData.recaudacionPorGestor.map((gestor, index) => {
                  const maxValue = Math.max(...dashboardData.recaudacionPorGestor.map(g => g.totalRecaudado));
                  const barHeight = maxValue > 0 ? (gestor.totalRecaudado / maxValue) * 150 : 0;
                  
                  return (
                    <View key={gestor.gestorId} style={styles.barWrapper}>
                      <View style={styles.barContainer}>
                        <View style={[styles.bar, { height: barHeight }]} />
                      </View>
                      <Text style={styles.barLabel} numberOfLines={2}>
                        {gestor.gestorName.split(' ').slice(0, 2).join(' ')}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        )}

        {/* Recaudación por Usuarios */}
        <View style={styles.usersSection}>
          <View style={styles.usersSectionHeader}>
            <MaterialCommunityIcons name="account-group" size={24} color="#f97316" />
            <Text style={styles.usersSectionTitle}>Recaudación por usuarios</Text>
          </View>

          {dashboardData.recaudacionPorGestor.map((gestor, index) => (
            <View key={gestor.gestorId} style={styles.userCard}>
              <View style={styles.userRank}>
                <Text style={styles.userRankNumber}>{index + 1}</Text>
              </View>
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{gestor.gestorName}</Text>
                <Text style={styles.userLastPayment}>
                  Última cuota: {gestor.ultimaCuotaFormateada ? gestor.ultimaCuotaFormateada : (gestor.ultimaCuota ? new Date(gestor.ultimaCuota).toLocaleString('es-NI', { 
                    day: '2-digit', 
                    month: '2-digit', 
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false
                  }) : 'Sin pagos')}
                </Text>
                <View style={styles.userAmounts}>
                  <Text style={styles.userAmountLabel}>Córdobas</Text>
                  <Text style={styles.userAmountValue}>C$ {gestor.cordobas.toLocaleString('es-NI', { minimumFractionDigits: 2 })}</Text>
                  <Text style={styles.userAmountSeparator}>|</Text>
                  <Text style={styles.userAmountLabel}>Dólares</Text>
                  <Text style={styles.userAmountValue}>$ {gestor.dolares.toFixed(2)}</Text>
                </View>
              </View>
              <View style={styles.userTotal}>
                <Text style={styles.userTotalAmount}>C$ {gestor.totalRecaudado.toLocaleString('es-NI', { minimumFractionDigits: 2 })}</Text>
              </View>
            </View>
          ))}

          {dashboardData.recaudacionPorGestor.length === 0 && (
            <View style={styles.emptyUsers}>
              <Text style={styles.emptyUsersText}>No hay recaudación registrada hoy</Text>
            </View>
          )}
        </View>

        {/* Quick Stats Grid */}
        <View style={styles.statsGrid}>
          <TouchableOpacity 
            style={[styles.statCard, styles.statCardPurple]}
            onPress={() => router.push('/(manager-tabs)/requests')}
          >
            <MaterialCommunityIcons name="file-document-outline" size={32} color="#8b5cf6" />
            <Text style={styles.statValue}>{dashboardData.solicitudesPendientes}</Text>
            <Text style={styles.statLabel}>Solicitudes Pendientes</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.statCard, styles.statCardGreen]}
            onPress={() => router.push('/(manager-tabs)/disbursements')}
          >
            <MaterialCommunityIcons name="cash-check" size={32} color="#10b981" />
            <Text style={styles.statValue}>{dashboardData.desembolsosPendientes}</Text>
            <Text style={styles.statLabel}>Desembolsos Pendientes</Text>
          </TouchableOpacity>
        </View>

        {/* Daily Info Section */}
        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>Detalle de Recaudación</Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Día Recaudado:</Text>
            <Text style={styles.infoValueGreen}>C$ {dashboardData.diaRecaudado.toLocaleString('es-NI', { minimumFractionDigits: 2 })}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Mora Recaudada:</Text>
            <Text style={styles.infoValueOrange}>C$ {dashboardData.moraRecaudada.toLocaleString('es-NI', { minimumFractionDigits: 2 })}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Próximo Recaudado:</Text>
            <Text style={styles.infoValueGreen}>C$ {dashboardData.proximoRecaudado.toLocaleString('es-NI', { minimumFractionDigits: 2 })}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Vencido Recaudado:</Text>
            <Text style={styles.infoValueRed}>C$ {dashboardData.vencidoRecaudado.toLocaleString('es-NI', { minimumFractionDigits: 2 })}</Text>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#64748b',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    padding: 20,
    paddingTop: 15,
    backgroundColor: '#ffffff',
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    gap: 8,
  },
  logoText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#334155',
    letterSpacing: 0.5,
  },
  managerBadge: {
    backgroundColor: '#8b5cf6',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  managerBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  gestorName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#334155',
  },
  dateText: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 4,
  },
  totalCard: {
    backgroundColor: '#ffffff',
    margin: 15,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  totalCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 8,
  },
  totalCardAmount: {
    fontSize: 32,
    fontWeight: '900',
    color: '#0ea5e9',
    textAlign: 'center',
    marginBottom: 20,
  },
  currencyRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  currencyBox: {
    alignItems: 'center',
  },
  currencyLabel: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 4,
  },
  currencyValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0ea5e9',
  },
  chartSection: {
    backgroundColor: '#ffffff',
    marginHorizontal: 15,
    marginBottom: 15,
    padding: 15,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  chartTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748b',
    marginBottom: 15,
  },
  chartContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingVertical: 10,
    gap: 20,
  },
  barWrapper: {
    alignItems: 'center',
    width: 80,
  },
  barContainer: {
    height: 150,
    justifyContent: 'flex-end',
    marginBottom: 8,
  },
  bar: {
    width: 60,
    backgroundColor: '#fef3c7',
    borderRadius: 4,
    minHeight: 10,
  },
  barLabel: {
    fontSize: 11,
    color: '#64748b',
    textAlign: 'center',
    width: 80,
  },
  usersSection: {
    backgroundColor: '#ffffff',
    marginHorizontal: 15,
    marginBottom: 15,
    padding: 15,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  usersSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    gap: 8,
  },
  usersSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#334155',
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  userRank: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#10b981',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  userRankNumber: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 2,
  },
  userLastPayment: {
    fontSize: 11,
    color: '#64748b',
    marginBottom: 4,
  },
  userAmounts: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  userAmountLabel: {
    fontSize: 11,
    color: '#64748b',
  },
  userAmountValue: {
    fontSize: 11,
    fontWeight: '600',
    color: '#10b981',
  },
  userAmountSeparator: {
    fontSize: 11,
    color: '#cbd5e1',
  },
  userTotal: {
    alignItems: 'flex-end',
  },
  userTotalAmount: {
    fontSize: 15,
    fontWeight: '800',
    color: '#10b981',
  },
  emptyUsers: {
    paddingVertical: 30,
    alignItems: 'center',
  },
  emptyUsersText: {
    fontSize: 14,
    color: '#94a3b8',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 15,
    gap: 12,
    marginBottom: 15,
    justifyContent: 'center',
  },
  statCard: {
    width: '48%',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statCardBlue: {
    borderLeftWidth: 4,
    borderLeftColor: '#0ea5e9',
  },
  statCardOrange: {
    borderLeftWidth: 4,
    borderLeftColor: '#f97316',
  },
  statCardPurple: {
    borderLeftWidth: 4,
    borderLeftColor: '#8b5cf6',
  },
  statCardGreen: {
    borderLeftWidth: 4,
    borderLeftColor: '#10b981',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#334155',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 4,
  },
  infoSection: {
    backgroundColor: '#ffffff',
    marginHorizontal: 15,
    marginBottom: 15,
    padding: 15,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 15,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
  },
  infoLabel: {
    fontSize: 14,
    color: '#64748b',
  },
  infoValueRed: {
    fontSize: 14,
    fontWeight: '700',
    color: '#e11d48',
  },
  infoValueGreen: {
    fontSize: 14,
    fontWeight: '700',
    color: '#10b981',
  },
  infoValueOrange: {
    fontSize: 14,
    fontWeight: '700',
    color: '#f97316',
  },
  quickActions: {
    paddingHorizontal: 15,
    marginBottom: 20,
  },
  consultationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderLeftWidth: 5,
    borderLeftColor: '#0ea5e9',
  },
  consultationIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: '#0ea5e9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  consultationTextContainer: {
    flex: 1,
  },
  consultationTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1e293b',
  },
  consultationSubtitle: {
    fontSize: 12,
    color: '#64748b',
  },
  logoutButton: {
    position: 'absolute',
    top: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 15 : 50,
    right: 20,
    zIndex: 10,
    padding: 10,
    backgroundColor: '#fee2e2',
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
});

