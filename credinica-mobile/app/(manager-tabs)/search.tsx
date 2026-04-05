import { View, Text, StyleSheet, SafeAreaView, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, StatusBar, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState, useEffect, useCallback, useRef } from 'react';
import { API_ENDPOINTS } from '../../config/api';
import PaymentModal from '../../components/PaymentModal';
import ReceiptModal, { ReceiptData } from '../../components/ReceiptModal';
import ClientDetailModal from '../../components/ClientDetailModal';
import { sessionService } from '../../services/session';
import { thermalPrinterService } from '../../services/thermal-printer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AlertHelper } from '../../utils/custom-alert-helper';

export default function SearchScreen() {
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [selectedCredit, setSelectedCredit] = useState<any>(null);
    const [searchTab, setSearchTab] = useState<'consult' | 'pay'>('pay');
    const [isDetailVisible, setIsDetailVisible] = useState(false);
    const [isPaymentVisible, setIsPaymentVisible] = useState(false);
    const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
    const [isReceiptVisible, setIsReceiptVisible] = useState(false);

    const handleSearch = useCallback(async () => {
        if (searchQuery.trim().length < 2) {
            setSearchResults([]);
            return;
        }

        setIsSearching(true);
        try {
            const resp = await fetch(`${API_ENDPOINTS.mobile_search}?q=${encodeURIComponent(searchQuery)}`);
            const result = await resp.json();
            
            if (result.success) {
                setSearchResults(result.data || []);
            } else {
                console.error('[SEARCH] Error:', result.message);
            }
        } catch (error) {
            console.error('Error searching:', error);
        } finally {
            setIsSearching(false);
        }
    }, [searchQuery]);

    // Búsqueda inteligente (Debounce de 500ms)
    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchQuery.trim().length >= 2) {
                handleSearch();
            } else if (searchQuery.length === 0) {
                setSearchResults([]);
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [searchQuery, handleSearch]);

    const handleSelectCredit = async (item: any) => {
        try {
            const resp = await fetch(`${API_ENDPOINTS.mobile_credit_detail}?creditId=${item.id}`);
            const result = await resp.json();
            
            if (result.success) {
                setSelectedCredit(result.data);
                if (searchTab === 'consult') {
                    setIsDetailVisible(true);
                } else {
                    setIsPaymentVisible(true);
                }
            } else {
                AlertHelper.alert('Error', 'No se pudo cargar el detalle del crédito');
            }
        } catch (error) {
            console.error('Error loading credit detail:', error);
            AlertHelper.alert('Error', 'No se pudo cargar el detalle del crédito');
        }
    };

    const handleProcessPayment = async (paymentData: any) => {
        const session = await sessionService.getSession();
        if (!session) return;

        try {
            const response = await fetch(API_ENDPOINTS.mobile_payments, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    creditId: selectedCredit.id,
                    userId: session.id,
                    ...paymentData
                })
            });

            const result = await response.json();
            
            if (result.success) {
                setIsPaymentVisible(false);
                setIsDetailVisible(false);
                
                const detail = selectedCredit.details || {};
                const now = new Date().toLocaleDateString('es-NI', { 
                    day: '2-digit', 
                    month: '2-digit', 
                    year: 'numeric', 
                    hour: '2-digit', 
                    minute: '2-digit', 
                    second: '2-digit', 
                    hour12: true 
                });
                
                setReceiptData({
                    transactionNumber: result.transactionNumber || result.paymentId || 'N/A',
                    creditNumber: selectedCredit.creditNumber || selectedCredit.id,
                    clientName: selectedCredit.clientName,
                    clientCode: selectedCredit.clientCode || 'N/A',
                    paymentDate: now,
                    cuotaDelDia: detail.dueTodayAmount || 0,
                    montoAtrasado: detail.overdueAmount || 0,
                    diasMora: detail.lateDays || 0,
                    totalAPagar: (detail.dueTodayAmount || 0) + (detail.overdueAmount || 0),
                    montoCancelacion: detail.remainingBalance || 0,
                    amountPaid: paymentData.amount,
                    saldoAnterior: detail.remainingBalance || 0,
                    nuevoSaldo: Math.max(0, (detail.remainingBalance || 0) - paymentData.amount),
                    managedBy: session.fullName,
                    sucursal: session.sucursalName || 'SUCURSAL',
                    role: session.role,
                });
                setIsReceiptVisible(true);
                
                // Limpiar búsqueda
                setSearchQuery('');
                setSearchResults([]);
            } else {
                AlertHelper.alert('Error', result.message || 'No se pudo registrar el pago');
            }
        } catch (error) {
            console.error('Payment error:', error);
            AlertHelper.alert('Error de conexión', 'No se pudo conectar con el servidor');
        }
    };

    const handleReprintReceipt = async (payment: any, credit: any) => {
        const session = await sessionService.getSession();
        if (!session) return;

        try {
            console.log('[REPRINT] Intentando reimprimir:', { 
                creditId: credit.id, 
                paymentId: payment.id,
                transactionNumber: payment.transactionNumber || payment.receiptNumber
            });

            // Usar el endpoint de recibo que calcula todo correctamente
            const response = await fetch(API_ENDPOINTS.mobile_receipt, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    creditId: credit.id,
                    paymentId: payment.id,
                    format: 'json',
                    userId: session.id // Enviar userId para autenticación móvil
                })
            });

            const result = await response.json();
            
            console.log('[REPRINT] Respuesta del servidor:', result);
            
            if (result.success && result.data) {
                setReceiptData(result.data);
                setIsReceiptVisible(true);
            } else {
                console.error('[REPRINT] Error en respuesta:', result);
                AlertHelper.alert('Error', result.error || 'No se pudo generar el recibo');
            }
        } catch (error) {
            console.error('[REPRINT] Error al reimprimir:', error);
            AlertHelper.alert('Error', 'No se pudo conectar con el servidor');
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#ffffff" translucent={false} />
            
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Gestión de Clientes</Text>
                <Text style={styles.headerSubtitle}>
                    {searchTab === 'pay' ? 'Módulo de Recuperación y Cobros' : 'Módulo de Consultas y Reportes'}
                </Text>

                <View style={styles.tabContainer}>
                    <TouchableOpacity 
                        style={[styles.tabButton, searchTab === 'pay' && styles.tabButtonActive]} 
                        onPress={() => setSearchTab('pay')}
                    >
                        <MaterialCommunityIcons name="cash-register" size={20} color={searchTab === 'pay' ? '#fff' : '#64748b'} />
                        <Text style={[styles.tabButtonText, searchTab === 'pay' && styles.tabButtonTextActive]}>RECUPERACION</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={[styles.tabButton, searchTab === 'consult' && styles.tabButtonActive]} 
                        onPress={() => setSearchTab('consult')}
                    >
                        <MaterialCommunityIcons name="file-chart" size={20} color={searchTab === 'consult' ? '#fff' : '#64748b'} />
                        <Text style={[styles.tabButtonText, searchTab === 'consult' && styles.tabButtonTextActive]}>CONSULTA</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.searchContainer}>
                <View style={styles.searchWrapper}>
                    <MaterialCommunityIcons name="magnify" size={24} color="#64748b" style={styles.searchIcon} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Nombre, cédula o código del cliente..."
                        placeholderTextColor="#94a3b8"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        onSubmitEditing={handleSearch}
                        returnKeyType="search"
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => { setSearchQuery(''); setSearchResults([]); }}>
                            <MaterialCommunityIcons name="close-circle" size={20} color="#94a3b8" />
                        </TouchableOpacity>
                    )}
                </View>
                <TouchableOpacity 
                    style={styles.searchButton}
                    onPress={handleSearch}
                    disabled={isSearching || searchQuery.length < 2}
                >
                    {isSearching ? (
                        <ActivityIndicator color="#ffffff" size="small" />
                    ) : (
                        <Text style={styles.searchButtonText}>Buscar</Text>
                    )}
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                {isSearching ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#0ea5e9" />
                        <Text style={styles.loadingText}>Buscando...</Text>
                    </View>
                ) : searchResults.length > 0 ? (
                    searchResults.map((item) => (
                        <TouchableOpacity 
                            key={item.id} 
                            style={styles.resultCard}
                            onPress={() => handleSelectCredit(item)}
                        >
                            <View style={styles.resultHeader}>
                                <MaterialCommunityIcons name="account-circle" size={48} color="#0ea5e9" />
                                <View style={styles.resultInfo}>
                                    <Text style={styles.clientName}>{item.clientName}</Text>
                                    <Text style={styles.creditNumber}>#{item.creditNumber}</Text>
                                    <Text style={styles.gestorName}>Gestor: {item.collectionsManager}</Text>
                                </View>
                            </View>
                            
                            <View style={styles.resultDetails}>
                                <View style={styles.detailRow}>
                                    <Text style={styles.detailLabel}>Saldo Pendiente:</Text>
                                    <Text style={styles.detailValueRed}>C$ {Number(item.remainingBalance || 0).toLocaleString('es-NI', { minimumFractionDigits: 2 })}</Text>
                                </View>
                                <View style={styles.detailRow}>
                                    <Text style={styles.detailLabel}>Cuota del Día:</Text>
                                    <Text style={styles.detailValue}>C$ {Number(item.dueTodayAmount || 0).toLocaleString('es-NI', { minimumFractionDigits: 2 })}</Text>
                                </View>
                                {item.overdueAmount > 0 && (
                                    <View style={styles.detailRow}>
                                        <Text style={styles.detailLabel}>En Mora:</Text>
                                        <Text style={styles.detailValueOrange}>C$ {Number(item.overdueAmount || 0).toLocaleString('es-NI', { minimumFractionDigits: 2 })}</Text>
                                    </View>
                                )}
                            </View>

                            <View style={styles.actionButton}>
                                <MaterialCommunityIcons 
                                    name={searchTab === 'pay' ? "cash-plus" : "file-chart-outline"} 
                                    size={20} 
                                    color={searchTab === 'pay' ? "#10b981" : "#0ea5e9"} 
                                />
                                <Text style={[styles.actionButtonText, searchTab === 'consult' && { color: '#0ea5e9' }]}>
                                    {searchTab === 'pay' ? 'Aplicar Pago' : 'Ver Reporte / Estado Cuenta'}
                                </Text>
                            </View>
                        </TouchableOpacity>
                    ))
                ) : searchQuery.length >= 2 && !isSearching ? (
                    <View style={styles.emptyContainer}>
                        <MaterialCommunityIcons name="account-search" size={64} color="#cbd5e1" />
                        <Text style={styles.emptyText}>No se encontraron resultados</Text>
                        <Text style={styles.emptySubtext}>Intenta con otro término de búsqueda</Text>
                    </View>
                ) : (
                    <View style={styles.emptyContainer}>
                        <MaterialCommunityIcons 
                            name={searchTab === 'pay' ? "magnify" : "file-search-outline"} 
                            size={64} 
                            color="#cbd5e1" 
                        />
                        <Text style={styles.emptyText}>
                            {searchTab === 'pay' ? 'Busca un cliente para cobrar' : 'Consulta estados de cuenta'}
                        </Text>
                        <Text style={styles.emptySubtext}>Ingresa nombre, cédula o código</Text>
                    </View>
                )}
            </ScrollView>

            <ClientDetailModal
                visible={isDetailVisible}
                onClose={() => setIsDetailVisible(false)}
                credit={selectedCredit}
                onApplyPayment={() => {
                    setIsDetailVisible(false);
                    setIsPaymentVisible(true);
                }}
                onReprintReceipt={handleReprintReceipt}
            />

            <PaymentModal
                visible={isPaymentVisible}
                onClose={() => setIsPaymentVisible(false)}
                credit={selectedCredit}
                onPay={handleProcessPayment}
            />

            <ReceiptModal
                visible={isReceiptVisible}
                onClose={() => setIsReceiptVisible(false)}
                receipt={receiptData}
            />
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
        padding: 20,
        paddingTop: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: '800',
        color: '#334155',
    },
    headerSubtitle: {
        fontSize: 14,
        color: '#64748b',
        marginTop: 4,
    },
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: '#f1f5f9',
        padding: 5,
        borderRadius: 12,
        marginTop: 15,
        gap: 5,
    },
    tabButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        borderRadius: 8,
        gap: 8,
    },
    tabButtonActive: {
        backgroundColor: '#0ea5e9',
        shadowColor: '#0ea5e9',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 3,
    },
    tabButtonText: {
        fontSize: 11,
        fontWeight: '800',
        color: '#64748b',
    },
    tabButtonTextActive: {
        color: '#fff',
    },
    searchContainer: {
        flexDirection: 'row',
        padding: 15,
        gap: 10,
    },
    searchWrapper: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f8fafc',
        borderRadius: 12,
        paddingHorizontal: 12,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        height: 48,
        fontSize: 15,
        color: '#334155',
    },
    searchButton: {
        backgroundColor: '#0ea5e9',
        paddingHorizontal: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        minWidth: 90,
    },
    searchButtonText: {
        color: '#ffffff',
        fontSize: 15,
        fontWeight: '700',
    },
    scrollContent: {
        padding: 15,
    },
    loadingContainer: {
        paddingVertical: 60,
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 10,
        fontSize: 14,
        color: '#64748b',
    },
    resultCard: {
        backgroundColor: '#ffffff',
        borderRadius: 16,
        padding: 16,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    resultHeader: {
        flexDirection: 'row',
        marginBottom: 15,
    },
    resultInfo: {
        marginLeft: 12,
        flex: 1,
    },
    clientName: {
        fontSize: 16,
        fontWeight: '700',
        color: '#334155',
    },
    creditNumber: {
        fontSize: 13,
        color: '#0ea5e9',
        marginTop: 2,
        fontWeight: '600',
    },
    gestorName: {
        fontSize: 12,
        color: '#64748b',
        marginTop: 4,
    },
    resultDetails: {
        backgroundColor: '#f8fafc',
        borderRadius: 12,
        padding: 12,
        marginBottom: 12,
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 6,
    },
    detailLabel: {
        fontSize: 13,
        color: '#64748b',
    },
    detailValue: {
        fontSize: 13,
        fontWeight: '600',
        color: '#334155',
    },
    detailValueRed: {
        fontSize: 13,
        fontWeight: '700',
        color: '#e11d48',
    },
    detailValueOrange: {
        fontSize: 13,
        fontWeight: '700',
        color: '#f97316',
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f0fdf4',
        paddingVertical: 12,
        borderRadius: 12,
        gap: 8,
        borderWidth: 1,
        borderColor: '#bbf7d0',
    },
    actionButtonText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#10b981',
    },
    actionButtonConsultText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#0ea5e9',
    },
    actionButtonsRow: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 5,
    },
    miniButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 12,
        gap: 6,
        borderWidth: 1,
    },
    miniButtonBlue: {
        backgroundColor: '#f0f9ff',
        borderColor: '#bae6fd',
    },
    miniButtonGreen: {
        backgroundColor: '#f0fdf4',
        borderColor: '#bbf7d0',
    },
    miniButtonTextBlue: {
        fontSize: 13,
        fontWeight: '700',
        color: '#0ea5e9',
    },
    miniButtonTextGreen: {
        fontSize: 13,
        fontWeight: '700',
        color: '#10b981',
    },
    emptyContainer: {
        paddingVertical: 60,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 16,
        color: '#64748b',
        marginTop: 15,
        fontWeight: '600',
    },
    emptySubtext: {
        fontSize: 14,
        color: '#94a3b8',
        marginTop: 8,
    },
});

