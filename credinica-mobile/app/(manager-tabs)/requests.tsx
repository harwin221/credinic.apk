import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, StatusBar, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { sessionService } from '../../services/session';
import { API_ENDPOINTS } from '../../config/api';
import ReasonModal from '../../components/ReasonModal';
import { Alert } from '../../utils/alert';

export default function RequestsScreen() {
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [requests, setRequests] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<'pending' | 'rejected'>('pending');
    const [selectedRequest, setSelectedRequest] = useState<any>(null);
    const [showReasonModal, setShowReasonModal] = useState(false);
    const [requestToReject, setRequestToReject] = useState<{ id: string; name: string } | null>(null);

    useFocusEffect(
        useCallback(() => {
            fetchRequests();
        }, [])
    );

    const fetchRequests = async () => {
        try {
            const session = await sessionService.getSession();
            if (!session?.id) return;

            const resp = await fetch(`${API_ENDPOINTS.mobile_requests}?userId=${session.id}`);
            const result = await resp.json();
            
            if (result.success) {
                setRequests(result.requests || []);
            }
        } catch (error) {
            console.error('Error fetching requests:', error);
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchRequests();
    };

    const pendingRequests = requests.filter(r => r.status === 'Pending');
    const rejectedRequests = requests.filter(r => r.status === 'Rejected');
    const currentList = activeTab === 'pending' ? pendingRequests : rejectedRequests;

    const handleApprove = async (requestId: string) => {
        Alert.alert(
            'Aprobar Solicitud',
            '¿Estás seguro de aprobar esta solicitud de crédito?',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Aprobar',
                    onPress: async () => {
                        try {
                            const session = await sessionService.getSession();
                            const resp = await fetch(API_ENDPOINTS.approve_credit, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    creditId: requestId,
                                    userId: session?.id
                                })
                            });
                            const result = await resp.json();
                            
                            if (result.success) {
                                Alert.alert('Éxito', 'Solicitud aprobada correctamente');
                                fetchRequests();
                            } else {
                                Alert.alert('Error', result.message || 'No se pudo aprobar la solicitud');
                            }
                        } catch (error) {
                            console.error('Error al aprobar:', error);
                            Alert.alert('Error', 'No se pudo conectar con el servidor');
                        }
                    }
                }
            ]
        );
    };

    const handleReject = (requestId: string, clientName: string) => {
        setRequestToReject({ id: requestId, name: clientName });
        setShowReasonModal(true);
    };

    const handleRejectConfirm = async (reason: string) => {
        setShowReasonModal(false);
        
        if (!requestToReject) return;

        try {
            const session = await sessionService.getSession();
            const resp = await fetch(API_ENDPOINTS.reject_credit, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    creditId: requestToReject.id,
                    userId: session?.id,
                    reason: reason
                })
            });
            const result = await resp.json();
            
            if (result.success) {
                Alert.alert('Éxito', 'Solicitud rechazada correctamente');
                fetchRequests();
            } else {
                Alert.alert('Error', result.message || 'No se pudo rechazar la solicitud');
            }
        } catch (error) {
            console.error('Error al rechazar:', error);
            Alert.alert('Error', 'No se pudo conectar con el servidor');
        } finally {
            setRequestToReject(null);
        }
    };

    const handleRejectCancel = () => {
        setShowReasonModal(false);
        setRequestToReject(null);
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
            
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Solicitudes</Text>
                <Text style={styles.headerSubtitle}>
                    {activeTab === 'pending' ? `${pendingRequests.length} pendientes` : `${rejectedRequests.length} rechazadas hoy`}
                </Text>
            </View>

            {/* Tabs */}
            <View style={styles.tabsContainer}>
                <TouchableOpacity 
                    style={[styles.tab, activeTab === 'pending' && styles.tabActive]}
                    onPress={() => setActiveTab('pending')}
                >
                    <Text style={[styles.tabText, activeTab === 'pending' && styles.tabTextActive]}>
                        Pendientes ({pendingRequests.length})
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity 
                    style={[styles.tab, activeTab === 'rejected' && styles.tabActive]}
                    onPress={() => setActiveTab('rejected')}
                >
                    <Text style={[styles.tabText, activeTab === 'rejected' && styles.tabTextActive]}>
                        Rechazadas ({rejectedRequests.length})
                    </Text>
                </TouchableOpacity>
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0ea5e9']} />}
            >
                {currentList.length > 0 ? (
                    currentList.map((request) => (
                        <View key={request.id} style={styles.requestCard}>
                            <View style={styles.requestHeader}>
                                <View style={styles.clientInfo}>
                                    <MaterialCommunityIcons 
                                        name="account-circle" 
                                        size={40} 
                                        color={request.status === 'Rejected' ? '#ef4444' : '#8b5cf6'} 
                                    />
                                    <View style={styles.clientDetails}>
                                        <Text style={styles.clientName}>{request.clientName}</Text>
                                        <Text style={styles.clientCode}>{request.creditNumber}</Text>
                                    </View>
                                </View>
                                <View style={[styles.statusBadge, request.status === 'Rejected' && styles.statusBadgeRed]}>
                                    <Text style={[styles.statusText, request.status === 'Rejected' && styles.statusTextRed]}>
                                        {request.status.toUpperCase()}
                                    </Text>
                                </View>
                            </View>

                            <View style={styles.requestDetails}>
                                <View style={styles.detailRow}>
                                    <Text style={styles.detailLabel}>Monto Solicitado:</Text>
                                    <Text style={styles.detailValue}>C$ {Number(request.amount || 0).toLocaleString('es-NI', { minimumFractionDigits: 2 })}</Text>
                                </View>
                                
                                {request.status === 'Pending' && request.outstandingBalance !== undefined && request.outstandingBalance > 0 && (
                                    <View style={[styles.detailRow, styles.warningRow]}>
                                        <Text style={styles.detailLabelWarning}>Saldo Pendiente:</Text>
                                        <Text style={styles.detailValueWarning}>C$ {Number(request.outstandingBalance || 0).toLocaleString('es-NI', { minimumFractionDigits: 2 })}</Text>
                                    </View>
                                )}
                                
                                <View style={styles.detailRow}>
                                    <Text style={styles.detailLabel}>Plazo:</Text>
                                    <Text style={styles.detailValue}>{request.termMonths || 0} meses</Text>
                                </View>
                                
                                <View style={styles.detailRow}>
                                    <Text style={styles.detailLabel}>Gestor:</Text>
                                    <Text style={styles.detailValue}>{request.collectionsManager || 'N/A'}</Text>
                                </View>
                                
                                <View style={styles.detailRow}>
                                    <Text style={styles.detailLabel}>Fecha Solicitud:</Text>
                                    <Text style={styles.detailValue}>{request.applicationDate ? new Date(request.applicationDate).toLocaleDateString('es-NI') : 'N/A'}</Text>
                                </View>

                                {request.status === 'Rejected' && (
                                    <View style={styles.rejectionInfo}>
                                        <Text style={styles.rejectionLabel}>Motivo del Rechazo:</Text>
                                        <Text style={styles.rejectionText}>{request.rejectionReason || 'Sin motivo especificado'}</Text>
                                        <Text style={styles.rejectionFooter}>Rechazado por: {request.rejectedBy || 'N/A'}</Text>
                                    </View>
                                )}
                            </View>

                            {request.status === 'Pending' && (
                                <View style={styles.actionButtons}>
                                    <TouchableOpacity 
                                        style={styles.rejectButton}
                                        onPress={() => handleReject(request.id, request.clientName)}
                                    >
                                        <MaterialCommunityIcons name="close-circle" size={20} color="#fff" />
                                        <Text style={styles.buttonText}>Rechazar</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity 
                                        style={styles.approveButton}
                                        onPress={() => handleApprove(request.id)}
                                    >
                                        <MaterialCommunityIcons name="check-circle" size={20} color="#fff" />
                                        <Text style={styles.buttonText}>Aprobar</Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>
                    ))
                ) : (
                    <View style={styles.emptyContainer}>
                        <MaterialCommunityIcons 
                            name={activeTab === 'pending' ? "file-document-outline" : "file-cancel-outline"} 
                            size={64} 
                            color="#cbd5e1" 
                        />
                        <Text style={styles.emptyText}>
                            {activeTab === 'pending' ? 'No hay solicitudes pendientes' : 'No hay solicitudes rechazadas hoy'}
                        </Text>
                    </View>
                )}
            </ScrollView>

            {/* Modal para pedir motivo del rechazo */}
            <ReasonModal
                visible={showReasonModal}
                title="Rechazar Solicitud"
                message={`¿Por qué deseas rechazar la solicitud de ${requestToReject?.name}?`}
                onCancel={handleRejectCancel}
                onConfirm={handleRejectConfirm}
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
        borderBottomColor: '#8b5cf6',
    },
    tabText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#64748b',
    },
    tabTextActive: {
        color: '#8b5cf6',
        fontWeight: '700',
    },
    scrollContent: {
        padding: 15,
    },
    requestCard: {
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
    requestHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
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
    clientCode: {
        fontSize: 13,
        color: '#64748b',
        marginTop: 2,
    },
    statusBadge: {
        backgroundColor: '#ede9fe',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 12,
    },
    statusBadgeRed: {
        backgroundColor: '#fee2e2',
    },
    statusText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#7c3aed',
    },
    statusTextRed: {
        color: '#ef4444',
    },
    rejectionInfo: {
        marginTop: 12,
        padding: 10,
        backgroundColor: '#fee2e2',
        borderRadius: 8,
        borderLeftWidth: 3,
        borderLeftColor: '#ef4444',
    },
    rejectionLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: '#991b1b',
        marginBottom: 4,
    },
    rejectionText: {
        fontSize: 13,
        color: '#7f1d1d',
        lineHeight: 18,
    },
    rejectionFooter: {
        fontSize: 11,
        color: '#b91c1c',
        marginTop: 6,
        fontStyle: 'italic',
    },
    requestDetails: {
        backgroundColor: '#f8fafc',
        borderRadius: 12,
        padding: 12,
        marginBottom: 15,
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
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
    warningRow: {
        backgroundColor: '#fef3c7',
        marginHorizontal: -12,
        paddingHorizontal: 12,
        paddingVertical: 8,
        marginBottom: 8,
    },
    detailLabelWarning: {
        fontSize: 13,
        color: '#92400e',
        fontWeight: '600',
    },
    detailValueWarning: {
        fontSize: 14,
        fontWeight: '800',
        color: '#92400e',
    },
    detailLabelBold: {
        fontSize: 13,
        color: '#334155',
        fontWeight: '700',
    },
    detailValueHighlight: {
        fontSize: 14,
        fontWeight: '800',
        color: '#10b981',
    },
    actionButtons: {
        flexDirection: 'row',
        gap: 10,
    },
    rejectButton: {
        flex: 1,
        flexDirection: 'row',
        backgroundColor: '#ef4444',
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
    },
    approveButton: {
        flex: 1,
        flexDirection: 'row',
        backgroundColor: '#10b981',
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
    },
    buttonText: {
        color: '#ffffff',
        fontSize: 14,
        fontWeight: '700',
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
});

