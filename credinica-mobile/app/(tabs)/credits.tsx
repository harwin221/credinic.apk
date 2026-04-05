import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, TextInput, RefreshControl, ActivityIndicator, Modal, StatusBar, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState, useEffect, useCallback } from 'react';
import { sessionService } from '../../services/session';
import { API_ENDPOINTS } from '../../config/api';
import PaymentModal from '../../components/PaymentModal';
import ReceiptModal, { ReceiptData } from '../../components/ReceiptModal';
import CustomAlert from '../../components/CustomAlert';
import { AlertHelper } from '../../utils/alert';

export default function CreditsScreen() {
    const [activeTab, setActiveTab] = useState('Cobro Dia');
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearchActive, setIsSearchActive] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [portfolio, setPortfolio] = useState<any>({
        dueToday: [],
        overdue: [],
        expired: [],
        paidToday: [],
        upToDate: [] // Cambiado de 'all' a 'upToDate'
    });

    // Estados para el Modal de Pago
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [selectedCredit, setSelectedCredit] = useState<any>(null);
    const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
    const [isReceiptVisible, setIsReceiptVisible] = useState(false);
    const [globalSearchResults, setGlobalSearchResults] = useState<any[]>([]);
    const [voidPaymentCredit, setVoidPaymentCredit] = useState<any>(null);
    const [voidReason, setVoidReason] = useState('');
    const [showVoidModal, setShowVoidModal] = useState(false);
    const [alert, setAlert] = useState<{
        visible: boolean;
        type: 'success' | 'error' | 'warning' | 'info';
        title: string;
        message: string;
    }>({
        visible: false,
        type: 'info',
        title: '',
        message: '',
    });

    const categoriesMap: any = {
        'Cobro Dia': 'dueToday',
        'Mora': 'overdue',
        'Vencido': 'expired',
        'Cobrado Hoy': 'paidToday',
        'Al Día': 'upToDate' // Cambiado de 'Todos' a 'Al Día'
    };

    const fetchPortfolio = useCallback(async () => {
        const session = await sessionService.getSession();
        if (!session?.id) return;

        try {
            const resp = await fetch(`${API_ENDPOINTS.mobile_portfolio}?userId=${session.id}`);
            const result = await resp.json();
            if (result.success) {
                setPortfolio(result.data);
            }
        } catch (error) {
            console.error('Error fetching portfolio:', error);
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchPortfolio();
    }, [fetchPortfolio]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchPortfolio();
    };

    const handleSelectCredit = async (item: any) => {
        // Si el crédito viene de búsqueda global, cargar los detalles completos
        if (!item.details || !item.paymentPlan) {
            try {
                const resp = await fetch(`${API_ENDPOINTS.mobile_credit_detail}?creditId=${item.id}`);
                const result = await resp.json();
                if (result.success) {
                    setSelectedCredit(result.data);
                } else {
                    AlertHelper.alert('Error', 'No se pudo cargar el detalle del crédito');
                    return;
                }
            } catch (error) {
                console.error('Error loading credit detail:', error);
                AlertHelper.alert('Error', 'No se pudo cargar el detalle del crédito');
                return;
            }
        } else {
            setSelectedCredit(item);
        }
        setIsModalVisible(true);
    };

    const handleReprint = async (item: any) => {
        const lastPayment = (item.registeredPayments || [])
            .filter((p: any) => p.status !== 'ANULADO')
            .sort((a: any, b: any) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime())[0];

        if (!lastPayment) return;

        setIsLoading(true);
        try {
            const resp = await fetch(`${API_ENDPOINTS.mobile_receipt}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    creditId: item.id, 
                    paymentId: lastPayment.id,
                    format: 'json' // Necesitamos un formato JSON que me devuelva el objeto ReceiptData
                })
            });
            
            const result = await resp.json();
            if (result.success) {
                setReceiptData(result.data);
                setIsReceiptVisible(true);
            } else {
                AlertHelper.alert('Error', result.error || 'No se pudo recuperar el recibo histórico');
            }
        } catch (error) {
            console.error('Error fetching receipt:', error);
            AlertHelper.alert('Error', 'No se pudo conectar con el servidor para la reimpresión');
        } finally {
            setIsLoading(false);
        }
    };

    const handleVoidPayment = async (item: any) => {
        const lastPayment = (item.registeredPayments || [])
            .filter((p: any) => p.status !== 'ANULADO' && p.status !== 'ANULACION_PENDIENTE')
            .sort((a: any, b: any) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime())[0];

        if (!lastPayment) {
            setAlert({
                visible: true,
                type: 'warning',
                title: 'Sin Pagos',
                message: 'No hay pagos válidos para anular',
            });
            return;
        }

        setVoidPaymentCredit({ ...item, lastPayment });
        setShowVoidModal(true);
    };

    const confirmVoidPayment = async () => {
        if (!voidReason.trim()) {
            setAlert({
                visible: true,
                type: 'warning',
                title: 'Motivo Requerido',
                message: 'Debes especificar el motivo de la anulación',
            });
            return;
        }

        try {
            const session = await sessionService.getSession();
            if (!session) return;

            const response = await fetch(API_ENDPOINTS.mobile_void_payment, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    paymentId: voidPaymentCredit.lastPayment.id,
                    creditId: voidPaymentCredit.id,
                    reason: voidReason,
                    requestedBy: session.fullName,
                })
            });

            const result = await response.json();

            if (result.success) {
                setAlert({
                    visible: true,
                    type: 'success',
                    title: '¡Solicitud Enviada!',
                    message: result.message || 'La solicitud de anulación fue enviada correctamente',
                });
                setShowVoidModal(false);
                setVoidReason('');
                setVoidPaymentCredit(null);
                fetchPortfolio(); // Recargar
            } else {
                setAlert({
                    visible: true,
                    type: 'error',
                    title: 'Error',
                    message: result.message || 'No se pudo solicitar la anulación',
                });
            }
        } catch (error) {
            console.error('Error void payment:', error);
            setAlert({
                visible: true,
                type: 'error',
                title: 'Error de Conexión',
                message: 'No se pudo conectar con el servidor',
            });
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

            const contentType = response.headers.get('content-type') || '';
            if (!contentType.includes('application/json')) {
                AlertHelper.alert('Error del servidor', `El servidor respondió con un error (${response.status}). Intenta de nuevo.`);
                return;
            }

            const result = await response.json();
            if (result.success) {
                setIsModalVisible(false);
                // Armar datos del recibo con la respuesta del servidor
                const detail = selectedCredit.details || {};
                const now = new Date().toLocaleDateString('es-NI', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
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
                
                // Recargar el portfolio para que aparezca en "Cobrado Hoy"
                fetchPortfolio();
            } else {
                AlertHelper.alert('Error', result.message || 'No se pudo registrar el abono');
            }
        } catch (error) {
            console.error('Payment error:', error);
            AlertHelper.alert('Error de conexión', 'No se pudo conectar con el servidor. Revisa tu internet.');
        }
    };

    const tabs = ['Cobro Dia', 'Mora', 'Vencido', 'Cobrado Hoy', 'Al Día'];

    // Determinar qué lista mostrar según el tab activo
    const currentListKey = categoriesMap[activeTab];
    const currentList = portfolio[currentListKey] || [];

    const filteredCredits = currentList.filter((c: any) => {
        if (searchQuery.length > 0) {
            return c.clientName.toLowerCase().includes(searchQuery.toLowerCase());
        }
        return true;
    });

    // Búsqueda global cuando está activa
    useEffect(() => {
        if (!isSearchActive || searchQuery.length < 2) { setGlobalSearchResults([]); return; }
        const timer = setTimeout(async () => {
            try {
                const resp = await fetch(`${API_ENDPOINTS.mobile_search}?q=${encodeURIComponent(searchQuery)}`);
                const result = await resp.json();
                if (result.success) setGlobalSearchResults(result.data);
            } catch (e) { console.error(e); }
        }, 400);
        return () => clearTimeout(timer);
    }, [searchQuery, isSearchActive]);

    const getCategoryColor = (tab: string) => {
        switch (tab) {
            case 'Cobro Dia': return '#10b981';
            case 'Mora': return '#f97316';
            case 'Vencido': return '#e11d48';
            case 'Cobrado Hoy': return '#10b981';
            default: return '#0ea5e9';
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#ffffff" translucent={false} />
            {/* Search bar con margen superior */}
            <View style={styles.searchBarWrapper}>
                <TouchableOpacity
                    style={styles.searchToggle}
                    onPress={() => { setIsSearchActive(!isSearchActive); if (isSearchActive) { setSearchQuery(''); setGlobalSearchResults([]); } }}
                >
                    <MaterialCommunityIcons name={isSearchActive ? "close" : "magnify"} size={20} color="#334155" />
                </TouchableOpacity>
                {isSearchActive ? (
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Buscar cliente en toda la cartera..."
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        autoFocus
                    />
                ) : (
                    <TouchableOpacity 
                        style={{ flex: 1 }}
                        onPress={() => setIsSearchActive(true)}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.searchHint}>Buscar cliente de cualquier cartera</Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* category Tabs - ocultar en búsqueda global */}
            {!isSearchActive && (
                <View style={styles.tabsWrapper}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsContainer}>
                        {tabs.map((tab) => (
                            <TouchableOpacity
                                key={tab}
                                style={[styles.tabButton, activeTab === tab && styles.activeTabButton]}
                                onPress={() => setActiveTab(tab)}
                            >
                                <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
                                    {tab} ({portfolio[categoriesMap[tab]]?.length || 0})
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            )}

            {/* Credit List */}
            {isLoading ? (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" color="#0ea5e9" />
                </View>
            ) : isSearchActive ? (
                // Resultados de búsqueda global
                <ScrollView contentContainerStyle={styles.listContainer}>
                    {searchQuery.length < 2 ? (
                        <Text style={styles.emptyText}>Escribe al menos 2 caracteres para buscar...</Text>
                    ) : globalSearchResults.length === 0 ? (
                        <Text style={styles.emptyText}>No se encontraron resultados.</Text>
                    ) : globalSearchResults.map((item: any) => (
                        <TouchableOpacity key={item.id} style={styles.card} onPress={() => handleSelectCredit(item)} activeOpacity={0.7}>
                            <View style={[styles.avatar, { backgroundColor: '#64748b' }]}>
                                <MaterialCommunityIcons name="account" size={20} color="#fff" />
                            </View>
                            <View style={styles.cardInfo}>
                                <Text style={styles.clientName} numberOfLines={1}>{item.clientName}</Text>
                                <Text style={{ fontSize: 11, color: '#94a3b8' }}>{item.creditNumber} • Gestor: {item.collectionsManager}</Text>
                                <Text style={{ fontSize: 12, color: '#64748b' }}>Saldo: <Text style={styles.amountRed}>C$ {Number(item.remainingBalance || 0).toFixed(2)}</Text></Text>
                            </View>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            ) : (
                <ScrollView
                    contentContainerStyle={styles.listContainer}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#0ea5e9"]} />}
                >
                    {filteredCredits.length > 0 ? (
                        filteredCredits.map((item: any, index: number) => {
                            const detail = item.details || {};
                            const abonoCalculado = activeTab === 'Cobrado Hoy'
                                ? detail.paidToday
                                : (detail.dueTodayAmount + detail.overdueAmount);

                            return (
                                <TouchableOpacity
                                    key={item.id}
                                    style={styles.card}
                                    onPress={() => activeTab !== 'Cobrado Hoy' && handleSelectCredit(item)}
                                    activeOpacity={activeTab !== 'Cobrado Hoy' ? 0.7 : 1}
                                >
                                    <View style={[styles.avatar, { backgroundColor: getCategoryColor(activeTab) }]}>
                                        <Text style={styles.avatarText}>{index + 1}</Text>
                                    </View>

                                    <View style={styles.cardInfo}>
                                        <Text style={styles.clientName} numberOfLines={1}>{item.clientName}</Text>
                                        <View style={styles.amountsRow}>
                                            <Text style={styles.amountLabel}>
                                                {activeTab === 'Cobrado Hoy' ? 'Cobrado' : 'Abono'}: <Text style={styles.amountBlue}>C$ {Number(abonoCalculado || 0).toFixed(2)}</Text>
                                            </Text>
                                            <Text style={styles.amountSeparator}> - </Text>
                                            <Text style={styles.amountLabel}>
                                                Resta: <Text style={styles.amountRed}>C$ {Number(detail.remainingBalance || 0).toFixed(2)}</Text>
                                            </Text>
                                        </View>
                                        {activeTab === 'Cobrado Hoy' && (
                                            <View style={styles.actionButtons}>
                                                <TouchableOpacity style={styles.actionBtnPay} onPress={() => handleSelectCredit(item)}>
                                                    <MaterialCommunityIcons name="cash-plus" size={14} color="#fff" />
                                                    <Text style={styles.actionBtnText}>Aplicar Pago</Text>
                                                </TouchableOpacity>
                                                <TouchableOpacity style={styles.actionBtnReprint} onPress={() => handleReprint(item)}>
                                                    <MaterialCommunityIcons name="printer" size={14} color="#fff" />
                                                    <Text style={styles.actionBtnText}>Reimprimir</Text>
                                                </TouchableOpacity>
                                                <TouchableOpacity style={styles.actionBtnVoid} onPress={() => handleVoidPayment(item)}>
                                                    <MaterialCommunityIcons name="close-circle" size={14} color="#fff" />
                                                    <Text style={styles.actionBtnText}>Anular</Text>
                                                </TouchableOpacity>
                                            </View>
                                        )}
                                    </View>
                                </TouchableOpacity>
                            );
                        })
                    ) : (
                        <Text style={styles.emptyText}>No hay resultados para mostrar.</Text>
                    )}
                </ScrollView>
            )}

            {/* Modal de Pago */}
            <PaymentModal
                visible={isModalVisible}
                onClose={() => setIsModalVisible(false)}
                credit={selectedCredit}
                onPay={handleProcessPayment}
            />

            <ReceiptModal
                visible={isReceiptVisible}
                onClose={() => setIsReceiptVisible(false)}
                receipt={receiptData}
            />

            {/* Modal de confirmación de anulación */}
            <Modal visible={showVoidModal} animationType="slide" transparent onRequestClose={() => setShowVoidModal(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.voidModalContainer}>
                        <View style={styles.voidModalHeader}>
                            <Text style={styles.voidModalTitle}>Solicitar Anulación de Pago</Text>
                            <TouchableOpacity onPress={() => { setShowVoidModal(false); setVoidReason(''); }}>
                                <MaterialCommunityIcons name="close" size={24} color="#64748b" />
                            </TouchableOpacity>
                        </View>

                        {voidPaymentCredit && (
                            <>
                                <Text style={styles.voidModalInfo}>Cliente: {voidPaymentCredit.clientName}</Text>
                                <Text style={styles.voidModalInfo}>Monto: C$ {Number(voidPaymentCredit.lastPayment.amount).toFixed(2)}</Text>
                                <Text style={styles.voidModalInfo}>Fecha: {new Date(voidPaymentCredit.lastPayment.paymentDate).toLocaleDateString('es-NI')}</Text>
                                
                                <Text style={styles.voidModalLabel}>Motivo de la anulación:</Text>
                                <TextInput
                                    style={styles.voidModalInput}
                                    placeholder="Ej: Error en el monto ingresado"
                                    value={voidReason}
                                    onChangeText={setVoidReason}
                                    multiline
                                    numberOfLines={3}
                                />

                                <View style={styles.voidModalButtons}>
                                    <TouchableOpacity 
                                        style={styles.voidModalBtnCancel}
                                        onPress={() => { setShowVoidModal(false); setVoidReason(''); }}
                                    >
                                        <Text style={styles.voidModalBtnCancelText}>Cancelar</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity 
                                        style={styles.voidModalBtnConfirm}
                                        onPress={confirmVoidPayment}
                                    >
                                        <Text style={styles.voidModalBtnConfirmText}>Solicitar Anulación</Text>
                                    </TouchableOpacity>
                                </View>
                            </>
                        )}
                    </View>
                </View>
            </Modal>

            <CustomAlert
                visible={alert.visible}
                type={alert.type}
                title={alert.title}
                message={alert.message}
                onClose={() => setAlert({ ...alert, visible: false })}
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
    searchBarWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 20,
        marginTop: 15,
        marginBottom: 12,
        backgroundColor: '#f1f5f9',
        borderRadius: 12,
        paddingHorizontal: 12,
        height: 44,
    },
    searchToggle: {
        marginRight: 8,
    },
    searchHint: {
        fontSize: 13,
        color: '#94a3b8',
    },
    tabsWrapper: {
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    tabsContainer: {
        paddingHorizontal: 8,
    },
    tabButton: {
        paddingHorizontal: 12,
        paddingVertical: 10,
        marginHorizontal: 3,
    },
    activeTabButton: {
        borderBottomWidth: 3,
        borderBottomColor: '#0ea5e9',
    },
    tabText: {
        fontSize: 13,
        color: '#64748b',
        fontWeight: '600',
    },
    activeTabText: {
        color: '#0ea5e9',
        fontWeight: 'bold',
    },
    listContainer: {
        padding: 15,
        paddingBottom: 40,
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f8fafc',
    },
    avatar: {
        width: 38,
        height: 38,
        borderRadius: 19,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    avatarText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    cardInfo: {
        flex: 1,
    },
    clientName: {
        fontSize: 14,
        fontWeight: '700',
        color: '#334155',
        marginBottom: 4,
    },
    amountsRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    amountLabel: {
        fontSize: 12,
        color: '#64748b',
    },
    amountSeparator: {
        fontSize: 12,
        color: '#cbd5e1',
        marginHorizontal: 4,
    },
    amountBlue: {
        color: '#0ea5e9',
        fontWeight: 'bold',
    },
    amountRed: {
        color: '#e11d48',
        fontWeight: 'bold',
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        color: '#1e293b',
    },
    actionButtons: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 8,
    },
    actionBtnPay: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#10b981',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 20,
        gap: 4,
    },
    actionBtnReprint: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#0ea5e9',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 20,
        gap: 4,
    },
    actionBtnVoid: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ef4444',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 20,
        gap: 4,
    },
    actionBtnText: {
        color: '#fff',
        fontSize: 11,
        fontWeight: '700',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    voidModalContainer: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 24,
        width: '100%',
        maxWidth: 400,
    },
    voidModalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    voidModalTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#1e293b',
        flex: 1,
    },
    voidModalInfo: {
        fontSize: 14,
        color: '#64748b',
        marginBottom: 8,
    },
    voidModalLabel: {
        fontSize: 14,
        fontWeight: '700',
        color: '#334155',
        marginTop: 16,
        marginBottom: 8,
    },
    voidModalInput: {
        backgroundColor: '#f8fafc',
        borderRadius: 8,
        padding: 12,
        fontSize: 14,
        color: '#334155',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        minHeight: 80,
        textAlignVertical: 'top',
    },
    voidModalButtons: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 20,
    },
    voidModalBtnCancel: {
        flex: 1,
        backgroundColor: '#f1f5f9',
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
    },
    voidModalBtnCancelText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#64748b',
    },
    voidModalBtnConfirm: {
        flex: 1,
        backgroundColor: '#ef4444',
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
    },
    voidModalBtnConfirmText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#fff',
    },
    emptyText: {
        textAlign: 'center',
        color: '#94a3b8',
        marginTop: 40,
        fontSize: 14,
    },
});

