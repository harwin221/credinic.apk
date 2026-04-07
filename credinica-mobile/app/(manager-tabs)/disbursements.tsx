import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, StatusBar, Platform, Modal } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { sessionService } from '../../services/session';
import { API_ENDPOINTS } from '../../config/api';
import ReasonModal from '../../components/ReasonModal';
import { AlertHelper } from '../../utils/custom-alert-helper';
import { useAuth } from '../../contexts/AuthContext';

type TabType = 'pending' | 'disbursed' | 'denied';

export default function DisbursementsScreen() {
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [allDisbursements, setAllDisbursements] = useState<any[]>([]);
    const [selectedCredit, setSelectedCredit] = useState<any | null>(null);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [activeTab, setActiveTab] = useState<TabType>('pending');
    const [showReasonModal, setShowReasonModal] = useState(false);
    const [creditToDeny, setCreditToDeny] = useState<{ id: string; name: string } | null>(null);
    const { logout } = useAuth();

    useFocusEffect(
        useCallback(() => {
            fetchDisbursements();
        }, [])
    );

    const fetchDisbursements = async () => {
        try {
            const session = await sessionService.getSession();
            if (!session?.id) return;

            const resp = await fetch(`${API_ENDPOINTS.mobile_disbursements}?userId=${session.id}`);
            const result = await resp.json();
            
            if (result.success) {
                setAllDisbursements(result.disbursements || []);
            }
        } catch (error) {
            console.error('Error fetching disbursements:', error);
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    };

    // Filtrar créditos por estado (el backend ya filtra por fecha)
    const pendingDisbursements = allDisbursements.filter(c => c.status === 'Approved');
    const disbursedToday = allDisbursements.filter(c => c.status === 'Active');
    const deniedToday = allDisbursements.filter(c => c.status === 'Rejected');

    // Obtener la lista actual según la pestaña activa
    const getCurrentList = () => {
        switch (activeTab) {
            case 'pending': return pendingDisbursements;
            case 'disbursed': return disbursedToday;
            case 'denied': return deniedToday;
            default: return [];
        }
    };

    const disbursements = getCurrentList();

    const onRefresh = () => {
        setRefreshing(true);
        fetchDisbursements();
    };

    const openModal = (credit: any) => {
        console.log('[DISBURSEMENTS] Opening modal for credit:', credit);
        console.log('[DISBURSEMENTS] outstandingBalance:', credit.outstandingBalance);
        console.log('[DISBURSEMENTS] amount:', credit.amount);
        console.log('[DISBURSEMENTS] netDisbursementAmount:', credit.netDisbursementAmount);
        setSelectedCredit(credit);
        setIsModalVisible(true);
    };

    const closeModal = () => {
        setIsModalVisible(false);
        setSelectedCredit(null);
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

    const handleDisburse = async (creditId: string) => {
        closeModal();
        AlertHelper.alert(
            'Confirmar Desembolso',
            '¿Estás seguro de marcar este crédito como desembolsado?',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Desembolsar',
                    onPress: async () => {
                        try {
                            const session = await sessionService.getSession();
                            const resp = await fetch(API_ENDPOINTS.disburse_credit, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    creditId,
                                    userId: session?.id
                                })
                            });
                            const result = await resp.json();
                            
                            if (result.success) {
                                AlertHelper.alert('Éxito', 'Crédito desembolsado correctamente');
                                fetchDisbursements();
                            } else {
                                AlertHelper.alert('Error', result.message || 'No se pudo desembolsar el crédito');
                            }
                        } catch (error) {
                            console.error('Error al desembolsar:', error);
                            AlertHelper.alert('Error', 'No se pudo conectar con el servidor');
                        }
                    }
                }
            ]
        );
    };

    const handleDeny = (creditId: string, clientName: string) => {
        closeModal();
        setCreditToDeny({ id: creditId, name: clientName });
        setShowReasonModal(true);
    };

    const handleDenyConfirm = async (reason: string) => {
        setShowReasonModal(false);
        
        if (!creditToDeny) return;

        try {
            const session = await sessionService.getSession();
            const resp = await fetch(API_ENDPOINTS.deny_disbursement, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    creditId: creditToDeny.id,
                    userId: session?.id,
                    reason: reason
                })
            });
            const result = await resp.json();
            
            if (result.success) {
                AlertHelper.alert('Éxito', 'Desembolso denegado correctamente');
                fetchDisbursements();
            } else {
                AlertHelper.alert('Error', result.message || 'No se pudo denegar el desembolso');
            }
        } catch (error) {
            console.error('Error al denegar:', error);
            AlertHelper.alert('Error', 'No se pudo conectar con el servidor');
        } finally {
            setCreditToDeny(null);
        }
    };

    const handleDenyCancel = () => {
        setShowReasonModal(false);
        setCreditToDeny(null);
    };

    const formatAddress = (credit: any) => {
        const parts = [
            credit.department,
            credit.municipality,
            credit.neighborhood,
            credit.address
        ].filter(Boolean);
        return parts.join(', ') || 'Sin dirección';
    };

    if (isLoading) {
        return (
            <SafeAreaView style={styles.container}>
                <StatusBar barStyle="dark-content" backgroundColor="#ffffff" translucent={false} />
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#0ea5e9" />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#ffffff" translucent={false} />
            
            {/* Botón de cerrar sesión en la esquina superior derecha */}
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                <MaterialCommunityIcons name="power-off" size={24} color="#e11d48" />
            </TouchableOpacity>
            
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Desembolsos</Text>
                <Text style={styles.headerSubtitle}>
                    {activeTab === 'pending' && `${pendingDisbursements.length} pendientes`}
                    {activeTab === 'disbursed' && `${disbursedToday.length} desembolsados hoy`}
                    {activeTab === 'denied' && `${deniedToday.length} denegados hoy`}
                </Text>
            </View>

            {/* Tabs */}
            <View style={styles.tabsContainer}>
                <TouchableOpacity 
                    style={[styles.tab, activeTab === 'pending' && styles.tabActive]}
                    onPress={() => setActiveTab('pending')}
                >
                    <Text style={[styles.tabText, activeTab === 'pending' && styles.tabTextActive]}>
                        Pendientes ({pendingDisbursements.length})
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity 
                    style={[styles.tab, activeTab === 'disbursed' && styles.tabActive]}
                    onPress={() => setActiveTab('disbursed')}
                >
                    <Text style={[styles.tabText, activeTab === 'disbursed' && styles.tabTextActive]}>
                        Desembolsados ({disbursedToday.length})
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity 
                    style={[styles.tab, activeTab === 'denied' && styles.tabActive]}
                    onPress={() => setActiveTab('denied')}
                >
                    <Text style={[styles.tabText, activeTab === 'denied' && styles.tabTextActive]}>
                        Denegados ({deniedToday.length})
                    </Text>
                </TouchableOpacity>
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0ea5e9']} />}
            >
                {disbursements.length > 0 ? (
                    disbursements.map((credit) => (
                        <TouchableOpacity 
                            key={credit.id} 
                            style={styles.creditItem}
                            onPress={() => openModal(credit)}
                        >
                            <View style={styles.creditItemHeader}>
                                <View style={styles.clientInfo}>
                                    <MaterialCommunityIcons name="account-circle" size={40} color="#10b981" />
                                    <View style={styles.clientDetails}>
                                        <Text style={styles.clientName}>{credit.clientName}</Text>
                                        <Text style={styles.creditNumber}>#{credit.creditNumber}</Text>
                                    </View>
                                </View>
                                <View style={styles.statusBadge}>
                                    <Text style={styles.statusText}>APROBADO</Text>
                                </View>
                            </View>

                            <View style={styles.creditItemBody}>
                                <View style={styles.addressRow}>
                                    <MaterialCommunityIcons name="map-marker" size={14} color="#64748b" />
                                    <Text style={styles.addressText} numberOfLines={1}>
                                        {credit.department && credit.municipality 
                                            ? `${credit.department}, ${credit.municipality}`
                                            : 'Sin ubicación'}
                                    </Text>
                                </View>

                                <View style={styles.infoRow}>
                                    <Text style={styles.infoLabel}>Monto Aprobado:</Text>
                                    <Text style={styles.infoValue}>C$ {Number(credit.amount || 0).toLocaleString('es-NI', { minimumFractionDigits: 2 })}</Text>
                                </View>

                                {credit.netDisbursementAmount !== undefined && credit.netDisbursementAmount !== credit.amount && (
                                    <View style={styles.infoRow}>
                                        <Text style={styles.infoLabel}>Monto Neto:</Text>
                                        <Text style={styles.infoValueHighlight}>C$ {Number(credit.netDisbursementAmount || 0).toLocaleString('es-NI', { minimumFractionDigits: 2 })}</Text>
                                    </View>
                                )}
                            </View>

                            <View style={styles.chevronContainer}>
                                <MaterialCommunityIcons name="chevron-right" size={24} color="#cbd5e1" />
                            </View>
                        </TouchableOpacity>
                    ))
                ) : (
                    <View style={styles.emptyContainer}>
                        <MaterialCommunityIcons name="cash-check" size={64} color="#cbd5e1" />
                        <Text style={styles.emptyText}>No hay desembolsos pendientes</Text>
                    </View>
                )}
            </ScrollView>

            {/* Modal de Detalles */}
            <Modal
                visible={isModalVisible}
                animationType="fade"
                transparent={true}
                onRequestClose={closeModal}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <ScrollView showsVerticalScrollIndicator={false}>
                            {/* Header del Modal */}
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>{selectedCredit?.clientName}</Text>
                                <TouchableOpacity onPress={closeModal} style={styles.closeButton}>
                                    <MaterialCommunityIcons name="close" size={24} color="#64748b" />
                                </TouchableOpacity>
                            </View>

                            {/* Si es un crédito rechazado, mostrar solo información básica y motivo */}
                            {selectedCredit?.status === 'Rejected' ? (
                                <>
                                    {/* Información Básica */}
                                    <View style={styles.detailsSection}>
                                        <View style={styles.detailRow}>
                                            <Text style={styles.detailLabel}>Monto Solicitado</Text>
                                            <Text style={styles.detailValue}>C$ {Number(selectedCredit?.amount || 0).toLocaleString('es-NI', { minimumFractionDigits: 2 })}</Text>
                                        </View>

                                        <View style={styles.detailRow}>
                                            <Text style={styles.detailLabel}>Gestor</Text>
                                            <Text style={styles.detailValue}>{selectedCredit?.collectionsManager || 'N/A'}</Text>
                                        </View>

                                        <View style={styles.detailRow}>
                                            <Text style={styles.detailLabel}>Fecha de Rechazo</Text>
                                            <Text style={styles.detailValue}>
                                                {selectedCredit?.approvalDate 
                                                    ? new Date(selectedCredit.approvalDate).toLocaleDateString('es-NI')
                                                    : 'N/A'}
                                            </Text>
                                        </View>

                                        {selectedCredit?.rejectedBy && (
                                            <View style={styles.detailRow}>
                                                <Text style={styles.detailLabel}>Rechazado Por</Text>
                                                <Text style={styles.detailValue}>{selectedCredit.rejectedBy}</Text>
                                            </View>
                                        )}
                                    </View>

                                    {/* Motivo del Rechazo */}
                                    <View style={styles.rejectionSection}>
                                        <Text style={styles.rejectionTitle}>Motivo del Rechazo</Text>
                                        <Text style={styles.rejectionReason}>
                                            {selectedCredit?.rejectionReason || 'No se especificó un motivo'}
                                        </Text>
                                    </View>
                                </>
                            ) : (
                                <>
                                    {/* Dirección Completa */}
                                    <View style={styles.addressSection}>
                                        <MaterialCommunityIcons name="map-marker" size={16} color="#0369a1" />
                                        <Text style={styles.addressFullText}>
                                            {selectedCredit ? formatAddress(selectedCredit) : ''}
                                        </Text>
                                    </View>

                                    {/* Detalles del Crédito */}
                                    <View style={styles.detailsSection}>
                                        <View style={styles.detailRow}>
                                            <Text style={styles.detailLabel}>Monto Aprobado</Text>
                                            <Text style={styles.detailValue}>C$ {Number(selectedCredit?.amount || 0).toLocaleString('es-NI', { minimumFractionDigits: 2 })}</Text>
                                        </View>

                                        <View style={styles.detailRow}>
                                            <Text style={styles.detailLabel}>Saldo Pendiente</Text>
                                            <Text style={styles.detailValueWarning}>C$ {Number(selectedCredit?.outstandingBalance || 0).toLocaleString('es-NI', { minimumFractionDigits: 2 })}</Text>
                                        </View>

                                        <View style={styles.detailRow}>
                                            <Text style={styles.detailLabelBold}>Monto Neto a Entregar</Text>
                                            <Text style={styles.detailValueHighlight}>C$ {Number(selectedCredit?.netDisbursementAmount || 0).toLocaleString('es-NI', { minimumFractionDigits: 2 })}</Text>
                                        </View>

                                        <View style={styles.detailRow}>
                                            <Text style={styles.detailLabel}>Cuota</Text>
                                            <Text style={styles.detailValue}>C$ {Number(selectedCredit?.totalInstallmentAmount || 0).toLocaleString('es-NI', { minimumFractionDigits: 2 })}</Text>
                                        </View>

                                        <View style={styles.detailRow}>
                                            <Text style={styles.detailLabel}>Plazo</Text>
                                            <Text style={styles.detailValue}>{selectedCredit?.termMonths || 0} meses</Text>
                                        </View>

                                        <View style={styles.detailRow}>
                                            <Text style={styles.detailLabel}>Frecuencia</Text>
                                            <Text style={styles.detailValue}>{selectedCredit?.paymentFrequency || 'N/A'}</Text>
                                        </View>

                                        <View style={styles.detailRow}>
                                            <Text style={styles.detailLabel}>Tasa de Interés</Text>
                                            <Text style={styles.detailValue}>{selectedCredit?.interestRate || 0}%</Text>
                                        </View>

                                        <View style={styles.detailRow}>
                                            <Text style={styles.detailLabel}>Gestor</Text>
                                            <Text style={styles.detailValue}>{selectedCredit?.collectionsManager || 'N/A'}</Text>
                                        </View>

                                        <View style={styles.detailRow}>
                                            <Text style={styles.detailLabel}>Fecha Primera Cuota</Text>
                                            <Text style={styles.detailValue}>
                                                {selectedCredit?.firstPaymentDate 
                                                    ? new Date(selectedCredit.firstPaymentDate).toLocaleDateString('es-NI')
                                                    : 'N/A'}
                                            </Text>
                                        </View>
                                    </View>

                                    {/* Botones de Acción - Solo para créditos pendientes */}
                                    {selectedCredit?.status === 'Approved' && (
                                        <View style={styles.buttonContainer}>
                                            <TouchableOpacity 
                                                style={styles.denyButton}
                                                onPress={() => selectedCredit && handleDeny(selectedCredit.id, selectedCredit.clientName)}
                                            >
                                                <MaterialCommunityIcons name="close-circle" size={20} color="#fff" />
                                                <Text style={styles.buttonText}>Denegar</Text>
                                            </TouchableOpacity>

                                            <TouchableOpacity 
                                                style={styles.disburseButton}
                                                onPress={() => selectedCredit && handleDisburse(selectedCredit.id)}
                                            >
                                                <MaterialCommunityIcons name="cash-check" size={20} color="#fff" />
                                                <Text style={styles.buttonText}>Desembolsar</Text>
                                            </TouchableOpacity>
                                        </View>
                                    )}
                                </>
                            )}
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* Modal para pedir motivo de denegación */}
            <ReasonModal
                visible={showReasonModal}
                title="Denegar Desembolso"
                message={`¿Por qué deseas denegar el desembolso para ${creditToDeny?.name}?`}
                onCancel={handleDenyCancel}
                onConfirm={handleDenyConfirm}
            />
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
    header: {
        padding: 20,
        paddingTop: 15,
        backgroundColor: '#ffffff',
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
    tabsContainer: {
        flexDirection: 'row',
        backgroundColor: '#ffffff',
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0',
    },
    tab: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    tabActive: {
        borderBottomColor: '#10b981',
    },
    tabText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#64748b',
    },
    tabTextActive: {
        color: '#10b981',
        fontWeight: '700',
    },
    scrollContent: {
        padding: 15,
    },
    creditItem: {
        backgroundColor: '#ffffff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    creditItemHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    clientInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    clientDetails: {
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
        color: '#64748b',
        marginTop: 2,
    },
    statusBadge: {
        backgroundColor: '#d1fae5',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 12,
    },
    statusText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#059669',
    },
    creditItemBody: {
        gap: 8,
    },
    addressRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 4,
    },
    addressText: {
        fontSize: 13,
        color: '#64748b',
        flex: 1,
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    infoLabel: {
        fontSize: 13,
        color: '#64748b',
    },
    infoValue: {
        fontSize: 13,
        fontWeight: '600',
        color: '#334155',
    },
    infoValueHighlight: {
        fontSize: 14,
        fontWeight: '800',
        color: '#10b981',
    },
    chevronContainer: {
        position: 'absolute',
        right: 16,
        top: '50%',
        marginTop: -12,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 60,
    },
    emptyText: {
        fontSize: 16,
        color: '#94a3b8',
        marginTop: 15,
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: '#ffffff',
        borderRadius: 20,
        width: '100%',
        maxHeight: '85%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
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
        fontSize: 20,
        fontWeight: '800',
        color: '#334155',
        flex: 1,
    },
    closeButton: {
        padding: 4,
    },
    addressSection: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: '#e0f2fe',
        padding: 12,
        marginHorizontal: 20,
        marginTop: 12,
        borderRadius: 8,
        gap: 8,
    },
    addressFullText: {
        fontSize: 13,
        color: '#0369a1',
        flex: 1,
        lineHeight: 18,
    },
    warningSection: {
        backgroundColor: '#fef3c7',
        padding: 16,
        marginHorizontal: 20,
        marginTop: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    warningTitle: {
        fontSize: 13,
        color: '#92400e',
        fontWeight: '600',
        marginBottom: 4,
    },
    warningAmount: {
        fontSize: 20,
        color: '#92400e',
        fontWeight: '800',
    },
    detailsSection: {
        padding: 20,
        gap: 12,
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#f8fafc',
    },
    detailLabel: {
        fontSize: 14,
        color: '#64748b',
    },
    detailLabelBold: {
        fontSize: 14,
        color: '#334155',
        fontWeight: '700',
    },
    detailValue: {
        fontSize: 14,
        fontWeight: '600',
        color: '#334155',
    },
    detailValueHighlight: {
        fontSize: 16,
        fontWeight: '800',
        color: '#10b981',
    },
    detailValueWarning: {
        fontSize: 14,
        fontWeight: '700',
        color: '#f59e0b',
    },
    buttonContainer: {
        flexDirection: 'row',
        gap: 12,
        paddingHorizontal: 20,
        marginTop: 8,
    },
    denyButton: {
        flex: 1,
        flexDirection: 'row',
        backgroundColor: '#ef4444',
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    disburseButton: {
        flex: 1,
        flexDirection: 'row',
        backgroundColor: '#10b981',
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    buttonText: {
        color: '#ffffff',
        fontSize: 14,
        fontWeight: '700',
    },
    rejectionSection: {
        backgroundColor: '#fef2f2',
        padding: 16,
        marginHorizontal: 20,
        marginTop: 12,
        marginBottom: 20,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#fecaca',
    },
    rejectionTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#991b1b',
        marginBottom: 8,
    },
    rejectionReason: {
        fontSize: 14,
        color: '#7f1d1d',
        lineHeight: 20,
    },
    logoutButton: {
        position: 'absolute',
        top: 10,
        right: 20,
        zIndex: 10,
        padding: 8,
        backgroundColor: '#ffffff',
        borderRadius: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
});

