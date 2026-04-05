import { View, Text, StyleSheet, SafeAreaView, TextInput, TouchableOpacity, ScrollView, RefreshControl, ActivityIndicator, Modal, StatusBar, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState, useEffect, useCallback, Fragment } from 'react';
import { sessionService } from '../../services/session';
import { API_ENDPOINTS } from '../../config/api';
import CreditFormModal from '../../components/CreditFormModal';
import CustomAlert from '../../components/CustomAlert';

const TABS = ['Mi Cartera', 'Représtamos', 'Renovaciones'];
const fmt = (n: number) => n.toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function ClientsScreen() {
    const [activeTab, setActiveTab] = useState('Mi Cartera');
    const [search, setSearch] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [data, setData] = useState<{ all: any[], reloan: any[], renewal: any[] }>({ all: [], reloan: [], renewal: [] });
    const [selectedClient, setSelectedClient] = useState<any>(null);
    const [clientDetail, setClientDetail] = useState<any>(null);
    const [loadingDetail, setLoadingDetail] = useState(false);
    const [activeDetailTab, setActiveDetailTab] = useState<'detalles' | 'plan' | 'historial'>('detalles');
    const [showCreditForm, setShowCreditForm] = useState(false);
    const [creditFormClient, setCreditFormClient] = useState<any>(null);
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

    const fetchClients = useCallback(async (searchTerm = '') => {
        const session = await sessionService.getSession();
        if (!session?.id) return;
        try {
            const resp = await fetch(`${API_ENDPOINTS.mobile_clients}?userId=${session.id}&search=${encodeURIComponent(searchTerm)}`);
            const result = await resp.json();
            if (result.success) setData(result.data);
        } catch (e) {
            console.error('Error fetching clients:', e);
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => { fetchClients(); }, [fetchClients]);

    const onRefresh = () => { setRefreshing(true); fetchClients(search); };

    const handleSearch = (text: string) => {
        setSearch(text);
        fetchClients(text);
    };

    const currentList = activeTab === 'Mi Cartera' ? data.all : activeTab === 'Représtamos' ? data.reloan : data.renewal;

    const handleSelectClient = async (client: any) => {
        setSelectedClient(client);
        setLoadingDetail(true);
        setActiveDetailTab('detalles'); // Reset al tab de detalles
        try {
            const resp = await fetch(`${API_ENDPOINTS.mobile_client_detail}?clientId=${client.id}`);
            
            // Verificar si la respuesta es JSON válido
            const contentType = resp.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                console.error('La respuesta no es JSON:', await resp.text());
                alert('Error: El servidor no respondió correctamente. Verifica tu conexión.');
                setLoadingDetail(false);
                return;
            }

            const result = await resp.json();
            if (result.success) {
                setClientDetail(result.data);
            } else {
                alert(`Error: ${result.message || 'No se pudo cargar el detalle del cliente'}`);
            }
        } catch (e) { 
            console.error('Error al cargar detalle del cliente:', e); 
            alert('Error de conexión. Verifica tu internet o la URL del servidor.');
        }
        finally { setLoadingDetail(false); }
    };

    const handleCreateCredit = async (client: any) => {
        // Verificar si el cliente ya tiene una solicitud pendiente o aprobada
        try {
            const resp = await fetch(`${API_ENDPOINTS.mobile_client_detail}?clientId=${client.id}`);
            const result = await resp.json();
            
            if (result.success && result.data.credits) {
                const hasPending = result.data.credits.some((c: any) => c.status === 'Pending');
                const hasApproved = result.data.credits.some((c: any) => c.status === 'Approved');
                
                if (hasPending) {
                    setAlert({
                        visible: true,
                        type: 'warning',
                        title: 'Solicitud en Proceso',
                        message: 'Este cliente ya tiene una solicitud pendiente de aprobación.',
                    });
                    return;
                }
                if (hasApproved) {
                    setAlert({
                        visible: true,
                        type: 'warning',
                        title: 'Solicitud Aprobada',
                        message: 'Este cliente ya tiene una solicitud pendiente de desembolso.',
                    });
                    return;
                }
            }
            
            // Si no hay solicitudes pendientes, abrir el formulario
            setCreditFormClient(client);
            setShowCreditForm(true);
        } catch (e) {
            console.error('Error verificando créditos del cliente:', e);
            setAlert({
                visible: true,
                type: 'error',
                title: 'Error',
                message: 'No se pudo verificar el estado del cliente.',
            });
        }
    };

    return (
        <>
            <SafeAreaView style={styles.container}>
                <StatusBar barStyle="dark-content" backgroundColor="#ffffff" translucent={false} />
                {/* Search */}
                <View style={styles.searchWrapper}>
                    <MaterialCommunityIcons name="magnify" size={20} color="#94a3b8" style={styles.searchIcon} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Buscar por nombre, cédula o código..."
                        placeholderTextColor="#94a3b8"
                        value={search}
                        onChangeText={handleSearch}
                    />
                    {search.length > 0 && (
                        <TouchableOpacity onPress={() => handleSearch('')}>
                            <MaterialCommunityIcons name="close" size={18} color="#94a3b8" />
                        </TouchableOpacity>
                    )}
                </View>

                {/* Tabs */}
                <View style={styles.tabsWrapper}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsContainer}>
                        {TABS.map(tab => (
                            <TouchableOpacity
                                key={tab}
                                style={[styles.tabButton, activeTab === tab && styles.activeTabButton]}
                                onPress={() => setActiveTab(tab)}
                            >
                                <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
                                    {tab} ({(activeTab === tab ? currentList : tab === 'Mi Cartera' ? data.all : tab === 'Représtamos' ? data.reloan : data.renewal).length})
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                {/* List */}
                {isLoading ? (
                    <View style={styles.centered}>
                        <ActivityIndicator size="large" color="#0ea5e9" />
                    </View>
                ) : (
                    <ScrollView
                        contentContainerStyle={styles.listContainer}
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0ea5e9']} />}
                    >
                        {currentList.length > 0 ? currentList.map((client: any) => (
                            <TouchableOpacity key={client.id} style={styles.card} onPress={() => handleSelectClient(client)} activeOpacity={0.7}>
                                <View style={styles.avatar}>
                                    <MaterialCommunityIcons name="account" size={22} color="#0ea5e9" />
                                </View>
                                <View style={styles.cardInfo}>
                                    <Text style={styles.clientName}>{client.name}</Text>
                                    <Text style={styles.clientSub}>{client.clientNumber} • {client.cedula}</Text>
                                    {client.phone ? (
                                        <Text style={styles.clientPhone}>
                                            <MaterialCommunityIcons name="phone" size={12} color="#94a3b8" /> {client.phone}
                                        </Text>
                                    ) : null}
                                    {(activeTab === 'Représtamos' || activeTab === 'Renovaciones') && (
                                        <TouchableOpacity 
                                            style={styles.createCreditButton}
                                            onPress={(e) => {
                                                e.stopPropagation();
                                                handleCreateCredit(client);
                                            }}
                                        >
                                            <MaterialCommunityIcons name="plus-circle" size={16} color="#fff" />
                                            <Text style={styles.createCreditButtonText}>Crear Nuevo Crédito</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                                {(activeTab === 'Représtamos' || activeTab === 'Renovaciones') && (
                                    <View style={[styles.badge, activeTab === 'Représtamos' ? styles.badgeBlue : styles.badgeGreen]}>
                                        <Text style={styles.badgeText}>{activeTab === 'Représtamos' ? 'Représtamo' : 'Renovación'}</Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        )) : (
                            <Text style={styles.emptyText}>No hay clientes para mostrar.</Text>
                        )}
                    </ScrollView>
                )}
            </SafeAreaView>

            {/* Modal detalle del cliente */}
            <Modal visible={!!selectedClient} animationType="slide" transparent onRequestClose={() => { setSelectedClient(null); setClientDetail(null); }}>
            <View style={styles.modalOverlay}>
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle} numberOfLines={1}>{selectedClient?.name}</Text>
                        <TouchableOpacity onPress={() => { setSelectedClient(null); setClientDetail(null); }}>
                            <MaterialCommunityIcons name="close" size={24} color="#64748b" />
                        </TouchableOpacity>
                    </View>

                    {loadingDetail ? (
                        <View style={styles.centered}><ActivityIndicator size="large" color="#0ea5e9" /></View>
                    ) : clientDetail ? (
                        <>
                            {/* Tabs para navegar entre secciones */}
                            <View style={styles.detailTabsWrapper}>
                                <TouchableOpacity 
                                    style={[styles.detailTab, activeDetailTab === 'detalles' && styles.activeDetailTab]}
                                    onPress={() => setActiveDetailTab('detalles')}
                                >
                                    <Text style={[styles.detailTabText, activeDetailTab === 'detalles' && styles.activeDetailTabText]}>Detalles</Text>
                                </TouchableOpacity>
                                <TouchableOpacity 
                                    style={[styles.detailTab, activeDetailTab === 'plan' && styles.activeDetailTab]}
                                    onPress={() => setActiveDetailTab('plan')}
                                >
                                    <Text style={[styles.detailTabText, activeDetailTab === 'plan' && styles.activeDetailTabText]}>Plan de Pago</Text>
                                </TouchableOpacity>
                                <TouchableOpacity 
                                    style={[styles.detailTab, activeDetailTab === 'historial' && styles.activeDetailTab]}
                                    onPress={() => setActiveDetailTab('historial')}
                                >
                                    <Text style={[styles.detailTabText, activeDetailTab === 'historial' && styles.activeDetailTabText]}>Historial</Text>
                                </TouchableOpacity>
                            </View>

                            <ScrollView showsVerticalScrollIndicator={false}>
                                {activeDetailTab === 'detalles' && (
                                    <>
                                        {/* Info básica del cliente */}
                                        <View style={styles.sectionHeader}>
                                            <Text style={styles.sectionTitle}>Datos del Cliente</Text>
                                        </View>
                                        <View style={styles.detailSection}>
                                            <Text style={styles.detailLabel}>Código</Text>
                                            <Text style={styles.detailValue}>{clientDetail.client.clientNumber}</Text>
                                        </View>
                                        <View style={styles.detailSection}>
                                            <Text style={styles.detailLabel}>Cédula</Text>
                                            <Text style={styles.detailValue}>{clientDetail.client.cedula}</Text>
                                        </View>
                                        <View style={styles.detailSection}>
                                            <Text style={styles.detailLabel}>Teléfono</Text>
                                            <Text style={styles.detailValue}>{clientDetail.client.phone || 'N/A'}</Text>
                                        </View>
                                        <View style={styles.detailSection}>
                                            <Text style={styles.detailLabel}>Dirección Domiciliar</Text>
                                            <Text style={styles.detailValue}>{clientDetail.client.address || clientDetail.client.neighborhood + ', ' + clientDetail.client.municipality}</Text>
                                        </View>

                                        {/* Créditos activos */}
                                        {clientDetail.credits.length > 0 ? clientDetail.credits.map((credit: any) => (
                                            <View key={credit.id} style={styles.creditCard}>
                                                <Text style={styles.creditTitle}>Crédito #{credit.creditNumber}</Text>
                                                
                                                {/* Configuración del Préstamo */}
                                                <View style={styles.sectionHeader}>
                                                    <Text style={styles.sectionSubtitle}>Configuración del Préstamo</Text>
                                                </View>
                                                <View style={styles.creditRow}>
                                                    <Text style={styles.creditLabel}>Tipo de producto:</Text>
                                                    <Text style={styles.creditValue}>{credit.productType || 'N/A'}</Text>
                                                </View>
                                                <View style={styles.creditRow}>
                                                    <Text style={styles.creditLabel}>Sub Producto:</Text>
                                                    <Text style={styles.creditValue}>{credit.subProduct || 'N/A'}</Text>
                                                </View>
                                                <View style={styles.creditRow}>
                                                    <Text style={styles.creditLabel}>Destino del producto:</Text>
                                                    <Text style={styles.creditValue}>{credit.productDestination || 'N/A'}</Text>
                                                </View>

                                                {/* Intereses y plazos */}
                                                <View style={styles.sectionHeader}>
                                                    <Text style={styles.sectionSubtitle}>Intereses y plazos</Text>
                                                </View>
                                                <View style={styles.creditRow}>
                                                    <Text style={styles.creditLabel}>Tasa Interés Corriente:</Text>
                                                    <Text style={styles.creditValue}>{credit.interestRate}%</Text>
                                                </View>
                                                <View style={styles.creditRow}>
                                                    <Text style={styles.creditLabel}>Tipo de Moneda:</Text>
                                                    <Text style={styles.creditValue}>{credit.currency}</Text>
                                                </View>
                                                <View style={styles.creditRow}>
                                                    <Text style={styles.creditLabel}>Periodicidad:</Text>
                                                    <Text style={styles.creditValue}>{credit.paymentFrequency}</Text>
                                                </View>
                                                <View style={styles.creditRow}>
                                                    <Text style={styles.creditLabel}>Plazo:</Text>
                                                    <Text style={styles.creditValue}>{credit.termMonths} meses</Text>
                                                </View>

                                                {/* Datos del Préstamo */}
                                                <View style={styles.sectionHeader}>
                                                    <Text style={styles.sectionSubtitle}>Datos del Préstamo</Text>
                                                </View>
                                                <View style={styles.creditRow}>
                                                    <Text style={styles.creditLabel}>Monto Principal:</Text>
                                                    <Text style={styles.creditValue}>C$ {fmt(credit.amount)}</Text>
                                                </View>
                                                <View style={styles.creditRow}>
                                                    <Text style={styles.creditLabel}>Monto Total del Crédito:</Text>
                                                    <Text style={[styles.creditValue, { fontWeight: '800' }]}>C$ {fmt(credit.totalAmount)}</Text>
                                                </View>
                                                <View style={styles.creditRow}>
                                                    <Text style={styles.creditLabel}>Cuota a Pagar:</Text>
                                                    <Text style={styles.creditValue}>C$ {fmt(credit.installmentAmount)}</Text>
                                                </View>
                                                <View style={styles.creditRow}>
                                                    <Text style={styles.creditLabel}>Fecha de Entrega:</Text>
                                                    <Text style={styles.creditValue}>{credit.disbursementDate ? new Date(credit.disbursementDate).toLocaleDateString('es-NI') : 'N/A'}</Text>
                                                </View>
                                                <View style={styles.creditRow}>
                                                    <Text style={styles.creditLabel}>Fecha de Primera Cuota:</Text>
                                                    <Text style={styles.creditValue}>{credit.firstPaymentDate ? new Date(credit.firstPaymentDate).toLocaleDateString('es-NI') : 'N/A'}</Text>
                                                </View>
                                                <View style={styles.creditRow}>
                                                    <Text style={styles.creditLabel}>Fecha de Vencimiento:</Text>
                                                    <Text style={styles.creditValue}>{credit.dueDate ? new Date(credit.dueDate).toLocaleDateString('es-NI') : 'N/A'}</Text>
                                                </View>

                                                {/* Información de Gestión */}
                                                <View style={styles.sectionHeader}>
                                                    <Text style={styles.sectionSubtitle}>Información de Gestión</Text>
                                                </View>
                                                <View style={styles.creditRow}>
                                                    <Text style={styles.creditLabel}>Gestor de Cobro:</Text>
                                                    <Text style={styles.creditValue}>{credit.collectionsManager}</Text>
                                                </View>
                                                <View style={styles.creditRow}>
                                                    <Text style={styles.creditLabel}>Sucursal:</Text>
                                                    <Text style={styles.creditValue}>{credit.branchName || 'N/A'}</Text>
                                                </View>

                                                {/* Estado del Crédito */}
                                                <View style={styles.divider} />
                                                <View style={styles.sectionHeader}>
                                                    <Text style={styles.sectionSubtitle}>Estado del Crédito</Text>
                                                </View>
                                                <View style={styles.creditRow}>
                                                    <Text style={styles.creditLabel}>Total Pagado:</Text>
                                                    <Text style={[styles.creditValue, { color: '#10b981', fontWeight: '800' }]}>C$ {fmt(credit.totalPaid)}</Text>
                                                </View>
                                                <View style={styles.creditRow}>
                                                    <Text style={styles.creditLabel}>Saldo pendiente:</Text>
                                                    <Text style={[styles.creditValue, { color: '#e11d48', fontWeight: '800' }]}>C$ {fmt(credit.remainingBalance)}</Text>
                                                </View>
                                                <View style={styles.creditRow}>
                                                    <Text style={styles.creditLabel}>Monto en mora:</Text>
                                                    <Text style={[styles.creditValue, { color: credit.overdueAmount > 0 ? '#f97316' : '#10b981' }]}>C$ {fmt(credit.overdueAmount)}</Text>
                                                </View>
                                                <View style={styles.divider} />
                                                <View style={styles.creditRow}>
                                                    <Text style={styles.creditLabel}>Días atraso actual:</Text>
                                                    <Text style={[styles.creditValue, { color: credit.lateDays > 0 ? '#e11d48' : '#10b981', fontWeight: '800' }]}>{credit.lateDays} días</Text>
                                                </View>
                                                <View style={styles.creditRow}>
                                                    <Text style={styles.creditLabel}>Promedio atraso (crédito):</Text>
                                                    <Text style={[styles.creditValue, { color: Number(credit.avgLateDaysCurrentCredit) > 0 ? '#f97316' : '#10b981' }]}>{credit.avgLateDaysCurrentCredit} días</Text>
                                                </View>
                                                <View style={styles.creditRow}>
                                                    <Text style={styles.creditLabel}>Promedio atraso (global):</Text>
                                                    <Text style={[styles.creditValue, { color: Number(credit.avgLateDaysGlobal) > 0 ? '#f97316' : '#10b981' }]}>{credit.avgLateDaysGlobal} días</Text>
                                                </View>
                                            </View>
                                        )) : (
                                            <Text style={styles.emptyText}>Sin créditos activos.</Text>
                                        )}
                                    </>
                                )}

                                {activeDetailTab === 'plan' && clientDetail.credits.length > 0 && (
                                    <>
                                        <View style={styles.sectionHeader}>
                                            <Text style={styles.sectionTitle}>Plan de Pago</Text>
                                        </View>
                                        
                                        {/* Tabla de Plan de Pago con scroll horizontal */}
                                        <ScrollView horizontal showsHorizontalScrollIndicator={true} style={styles.tableScrollContainer}>
                                            <View style={styles.tableContainer}>
                                                {/* Header de la tabla */}
                                                <View style={styles.tableHeader}>
                                                    <Text style={[styles.tableHeaderText, styles.colNumberFixed]}>#</Text>
                                                    <Text style={[styles.tableHeaderText, styles.colDateFixed]}>Fecha</Text>
                                                    <Text style={[styles.tableHeaderText, styles.colAmountFixed]}>Capital</Text>
                                                    <Text style={[styles.tableHeaderText, styles.colAmountFixed]}>Interés</Text>
                                                    <Text style={[styles.tableHeaderText, styles.colAmountFixed]}>Cuota</Text>
                                                    <Text style={[styles.tableHeaderText, styles.colAmountFixed]}>Saldo</Text>
                                                </View>
                                                
                                                {/* Filas de la tabla */}
                                                {clientDetail.credits[0].paymentPlan?.map((plan: any, index: number) => (
                                                    <View key={index} style={[styles.tableRow, index % 2 === 0 && styles.tableRowEven]}>
                                                        <Text style={[styles.tableCellText, styles.colNumberFixed]}>{plan.paymentNumber}</Text>
                                                        <Text style={[styles.tableCellText, styles.colDateFixed]}>{plan.paymentDate ? new Date(plan.paymentDate).toLocaleDateString('es-NI', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'N/A'}</Text>
                                                        <Text style={[styles.tableCellText, styles.colAmountFixed]}>C${fmt(plan.principal)}</Text>
                                                        <Text style={[styles.tableCellText, styles.colAmountFixed]}>C${fmt(plan.interest)}</Text>
                                                        <Text style={[styles.tableCellText, styles.colAmountFixed, { fontWeight: '700' }]}>C${fmt(plan.amount)}</Text>
                                                        <Text style={[styles.tableCellText, styles.colAmountFixed]}>C${fmt(plan.balance)}</Text>
                                                    </View>
                                                ))}
                                            </View>
                                        </ScrollView>
                                        <Text style={styles.scrollHint}>← Desliza para ver más →</Text>
                                    </>
                                )}

                                {activeDetailTab === 'historial' && clientDetail.credits.length > 0 && (
                                    <>
                                        <View style={styles.sectionHeader}>
                                            <Text style={styles.sectionTitle}>Historial de Pagos</Text>
                                        </View>
                                        {clientDetail.credits[0].paymentHistory?.length > 0 ? clientDetail.credits[0].paymentHistory.map((payment: any) => (
                                            <View key={payment.id} style={styles.paymentCard}>
                                                <View style={styles.paymentHeader}>
                                                    <Text style={styles.paymentAmount}>C$ {fmt(payment.amount)}</Text>
                                                    <Text style={[styles.paymentStatus, payment.status === 'ANULADO' ? styles.statusAnulado : styles.statusValido]}>
                                                        {payment.status}
                                                    </Text>
                                                </View>
                                                <View style={styles.creditRow}>
                                                    <Text style={styles.creditLabel}>Fecha:</Text>
                                                    <Text style={styles.creditValue}>{payment.paymentDate ? new Date(payment.paymentDate).toLocaleDateString('es-NI') : 'N/A'}</Text>
                                                </View>
                                                <View style={styles.creditRow}>
                                                    <Text style={styles.creditLabel}>Recibo:</Text>
                                                    <Text style={styles.creditValue}>{payment.transactionNumber}</Text>
                                                </View>
                                                <View style={styles.creditRow}>
                                                    <Text style={styles.creditLabel}>Gestionado por:</Text>
                                                    <Text style={styles.creditValue}>{payment.managedBy}</Text>
                                                </View>
                                                {payment.notes && (
                                                    <View style={styles.creditRow}>
                                                        <Text style={styles.creditLabel}>Notas:</Text>
                                                        <Text style={styles.creditValue}>{payment.notes}</Text>
                                                    </View>
                                                )}
                                            </View>
                                        )) : (
                                            <Text style={styles.emptyText}>Sin pagos registrados.</Text>
                                        )}
                                    </>
                                )}
                            </ScrollView>
                        </>
                    ) : null}
                </View>
            </View>
        </Modal>

        {/* Modal de formulario de crédito */}
        <CreditFormModal
            visible={showCreditForm}
            onClose={() => {
                setShowCreditForm(false);
                setCreditFormClient(null);
            }}
            client={creditFormClient}
            onSuccess={() => {
                fetchClients(search);
            }}
        />

        <CustomAlert
            visible={alert.visible}
            type={alert.type}
            title={alert.title}
            message={alert.message}
            onClose={() => setAlert({ ...alert, visible: false })}
        />
        </>
    );
}

const styles = StyleSheet.create({
    container: { 
        flex: 1, 
        backgroundColor: '#fff',
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    },
    searchWrapper: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        backgroundColor: '#f1f5f9', 
        borderRadius: 12, 
        marginHorizontal: 20, 
        marginTop: 15,
        marginBottom: 12, 
        paddingHorizontal: 12, 
        height: 44 
    },
    searchIcon: { marginRight: 8 },
    searchInput: { flex: 1, fontSize: 14, color: '#334155' },
    tabsWrapper: { borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    tabsContainer: { paddingHorizontal: 8 },
    tabButton: { paddingHorizontal: 12, paddingVertical: 10, marginHorizontal: 3 },
    activeTabButton: { borderBottomWidth: 3, borderBottomColor: '#0ea5e9' },
    tabText: { fontSize: 13, color: '#64748b', fontWeight: '600' },
    activeTabText: { color: '#0ea5e9', fontWeight: 'bold' },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    listContainer: { padding: 15, paddingBottom: 40 },
    card: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f8fafc' },
    avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#f0f9ff', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    cardInfo: { flex: 1 },
    clientName: { fontSize: 14, fontWeight: '700', color: '#334155' },
    clientSub: { fontSize: 12, color: '#64748b', marginTop: 2 },
    clientPhone: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
    badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
    badgeBlue: { backgroundColor: '#eff6ff' },
    badgeGreen: { backgroundColor: '#f0fdf4' },
    badgeText: { fontSize: 11, fontWeight: '700', color: '#0ea5e9' },
    createCreditButton: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        backgroundColor: '#10b981', 
        paddingHorizontal: 10, 
        paddingVertical: 6, 
        borderRadius: 16, 
        marginTop: 8,
        gap: 4,
    },
    createCreditButtonText: { 
        fontSize: 12, 
        fontWeight: '700', 
        color: '#fff' 
    },
    emptyText: { textAlign: 'center', color: '#94a3b8', marginTop: 40, fontSize: 14 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContainer: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '85%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    modalTitle: { fontSize: 16, fontWeight: '800', color: '#1e293b', flex: 1, marginRight: 10 },
    detailTabsWrapper: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#f1f5f9', marginBottom: 12 },
    detailTab: { flex: 1, paddingVertical: 10, alignItems: 'center' },
    activeDetailTab: { borderBottomWidth: 3, borderBottomColor: '#0ea5e9' },
    detailTabText: { fontSize: 13, color: '#64748b', fontWeight: '600' },
    activeDetailTabText: { color: '#0ea5e9', fontWeight: 'bold' },
    detailSection: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    detailLabel: { fontSize: 13, color: '#64748b' },
    detailValue: { fontSize: 13, fontWeight: '600', color: '#334155', maxWidth: '60%', textAlign: 'right' },
    sectionHeader: { marginTop: 12, marginBottom: 6 },
    sectionTitle: { fontSize: 15, fontWeight: '800', color: '#0ea5e9', textTransform: 'uppercase' },
    sectionSubtitle: { fontSize: 13, fontWeight: '700', color: '#0ea5e9', textTransform: 'uppercase' },
    creditCard: { backgroundColor: '#f8fafc', borderRadius: 12, padding: 14, marginTop: 16 },
    creditTitle: { fontSize: 14, fontWeight: '800', color: '#0ea5e9', marginBottom: 10 },
    creditRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
    creditLabel: { fontSize: 13, color: '#64748b' },
    creditValue: { fontSize: 13, fontWeight: '600', color: '#334155' },
    divider: { height: 1, backgroundColor: '#e2e8f0', marginVertical: 8 },
    
    // Estilos para tabla de plan de pago con scroll horizontal
    tableScrollContainer: { marginTop: 8 },
    tableContainer: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, overflow: 'hidden' },
    tableHeader: { flexDirection: 'row', backgroundColor: '#0ea5e9', paddingVertical: 10, paddingHorizontal: 4 },
    tableHeaderText: { fontSize: 11, fontWeight: '700', color: '#fff', textAlign: 'center' },
    tableRow: { flexDirection: 'row', paddingVertical: 8, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    tableRowEven: { backgroundColor: '#f8fafc' },
    tableCellText: { fontSize: 10, color: '#334155', textAlign: 'center' },
    colNumberFixed: { width: 40 },
    colDateFixed: { width: 90 },
    colAmountFixed: { width: 85 },
    scrollHint: { fontSize: 11, color: '#94a3b8', textAlign: 'center', marginTop: 8, fontStyle: 'italic' },
    
    planCard: { backgroundColor: '#f8fafc', borderRadius: 12, padding: 14, marginBottom: 12 },
    planHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
    planNumber: { fontSize: 14, fontWeight: '800', color: '#0ea5e9' },
    planDate: { fontSize: 13, color: '#64748b' },
    paymentCard: { backgroundColor: '#f8fafc', borderRadius: 12, padding: 14, marginBottom: 12 },
    paymentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    paymentAmount: { fontSize: 16, fontWeight: '800', color: '#10b981' },
    paymentStatus: { fontSize: 11, fontWeight: '700', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
    statusValido: { backgroundColor: '#d1fae5', color: '#065f46' },
    statusAnulado: { backgroundColor: '#fee2e2', color: '#991b1b' },
});
