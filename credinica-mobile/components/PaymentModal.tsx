import React, { useState, useEffect } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { checkConnection, savePendingPayment } from '../services/offline-db';
import { sessionService } from '../services/session';

interface PaymentModalProps {
    visible: boolean;
    onClose: () => void;
    credit: any;
    onPay: (paymentData: any) => Promise<void>;
}

export default function PaymentModal({ visible, onClose, credit, onPay }: PaymentModalProps) {
    const [amount, setAmount] = useState('');
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);
    const [paymentType, setPaymentType] = useState('NORMAL');
    const [isOnline, setIsOnline] = useState(true);

    useEffect(() => {
        const checkConnectionStatus = async () => {
            const online = await checkConnection();
            setIsOnline(online);
        };
        
        if (visible) {
            checkConnectionStatus();
            const interval = setInterval(checkConnectionStatus, 5000);
            return () => clearInterval(interval);
        }
    }, [visible]);

    if (!credit) return null;

    const detail = credit.details || {};
    const totalAPagar = (detail.dueTodayAmount || 0) + (detail.overdueAmount || 0);

    const handlePay = async () => {
        if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
            return;
        }

        // --- VALIDACIÓN DE SALDO ---
        const remaining = detail.remainingBalance || 0;
        if (Number(amount) > remaining + 0.01) {
            alert(`ATENCION: El abono (C$ ${Number(amount).toFixed(2)}) no puede ser mayor al saldo actual (C$ ${remaining.toFixed(2)}).`);
            return;
        }

        setLoading(true);
        try {
            const session = await sessionService.getSession();
            if (!session) return;

            // Si no hay conexión, guardar offline y MOSTRAR RECIBO
            if (!isOnline) {
                const paymentId = `OFFLINE-${Date.now()}`;
                await savePendingPayment({
                    id: paymentId,
                    creditId: credit.id,
                    amount: Number(amount),
                    paymentDate: new Date().toISOString(),
                    notes,
                    managedBy: session.id,
                });
                
                // Disparar el flujo de recibo con datos locales
                await onPay({
                    amount: Number(amount),
                    notes,
                    paymentType,
                    isOffline: true,
                    offlineId: paymentId
                });

                setAmount('');
                setNotes('');
                onClose();
            } else {
                // Si hay conexión, procesar normalmente
                await onPay({
                    amount: Number(amount),
                    notes,
                    paymentType
                });
                setAmount('');
                setNotes('');
                onClose();
            }
        } catch (error) {
            console.error('Error in payment modal:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.modalContainer}
                >
                    <View style={styles.modalContent}>
                        {/* Header */}
                        <View style={styles.header}>
                            <Text style={styles.clientName}>{credit.clientName}</Text>
                            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                                <MaterialCommunityIcons name="close" size={24} color="#64748b" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.statusRow}>
                            <MaterialCommunityIcons 
                                name={isOnline ? "wifi" : "wifi-off"} 
                                size={14} 
                                color={isOnline ? "#10b981" : "#f97316"} 
                            />
                            <Text style={[styles.statusText, !isOnline && { color: '#f97316' }]}>
                                {isOnline ? 'Conectado' : 'Modo Offline'}
                            </Text>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollBody}>
                            {/* Metrics */}
                            <View style={styles.metricsContainer}>
                                <View style={styles.metricRow}>
                                    <Text style={styles.metricLabel}>Cuota del día:</Text>
                                    <Text style={styles.metricValue}>C$ {Number(detail.dueTodayAmount || 0).toLocaleString('es-NI', { minimumFractionDigits: 2 })}</Text>
                                </View>
                                <View style={styles.metricRow}>
                                    <Text style={styles.metricLabel}>Monto Atrasado:</Text>
                                    <Text style={[styles.metricValue, { color: '#e11d48' }]}>C$ {Number(detail.overdueAmount || 0).toLocaleString('es-NI', { minimumFractionDigits: 2 })}</Text>
                                </View>
                                <View style={styles.metricRow}>
                                    <Text style={styles.metricLabel}>Cantidad Días Mora:</Text>
                                    <Text style={[styles.metricValue, { color: '#e11d48' }]}>{detail.lateDays || 0}</Text>
                                </View>
                                <View style={styles.divider} />
                                <View style={styles.metricRow}>
                                    <Text style={[styles.metricLabel, { fontWeight: '800' }]}>Total a Pagar:</Text>
                                    <Text style={[styles.metricValue, { color: '#2563eb', fontWeight: '800' }]}>C$ {Number(totalAPagar).toLocaleString('es-NI', { minimumFractionDigits: 2 })}</Text>
                                </View>
                                <View style={styles.metricRow}>
                                    <Text style={styles.metricLabel}>Monto para Cancelar:</Text>
                                    <Text style={[styles.metricValue, { color: '#2563eb', fontWeight: '600' }]}>C$ {Number(detail.remainingBalance || 0).toLocaleString('es-NI', { minimumFractionDigits: 2 })}</Text>
                                </View>
                            </View>

                            {/* Inputs */}
                            <View style={styles.inputSection}>
                                <Text style={styles.inputLabel}>Ingrese el Monto Pagado:</Text>
                                <View style={styles.amountInputWrapper}>
                                    <TextInput
                                        style={styles.amountInput}
                                        placeholder="Ej: 300.50"
                                        keyboardType="numeric"
                                        value={amount}
                                        onChangeText={setAmount}
                                    />
                                </View>

                                <View style={styles.rowInputs}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.inputLabel}>Fecha del Pago</Text>
                                        <View style={styles.disabledInput}>
                                            <Text style={styles.disabledInputText}>{new Date().toLocaleDateString('es-NI')}</Text>
                                            <MaterialCommunityIcons name="calendar" size={18} color="#94a3b8" />
                                        </View>
                                    </View>
                                </View>
                            </View>
                        </ScrollView>

                        {/* Buttons */}
                        <View style={styles.footer}>
                            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
                                <Text style={styles.cancelButtonText}>CANCELAR</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.payButton, (!amount || loading) && { opacity: 0.6 }]}
                                onPress={handlePay}
                                disabled={!amount || loading}
                            >
                                {loading ? (
                                    <ActivityIndicator color="#fff" size="small" />
                                ) : (
                                    <Text style={styles.payButtonText}>PAGAR CUOTA</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContainer: {
        width: '100%',
        maxHeight: '90%',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderRadius: 24,
        padding: 20,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    clientName: {
        fontSize: 15,
        fontWeight: '900',
        color: '#1e293b',
        flex: 1,
        textTransform: 'uppercase',
    },
    closeButton: {
        padding: 4,
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 15,
        gap: 5,
    },
    statusText: {
        fontSize: 11,
        color: '#94a3b8',
    },
    scrollBody: {
        maxHeight: 500,
    },
    metricsContainer: {
        backgroundColor: '#f8fafc',
        borderRadius: 12,
        padding: 15,
        marginBottom: 20,
    },
    metricRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    metricLabel: {
        fontSize: 13,
        color: '#64748b',
    },
    metricValue: {
        fontSize: 13,
        fontWeight: '700',
        color: '#334155',
    },
    divider: {
        height: 1,
        backgroundColor: '#e2e8f0',
        marginVertical: 10,
    },
    inputSection: {
        marginBottom: 20,
    },
    inputLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: '#334155',
        marginBottom: 8,
    },
    amountInputWrapper: {
        backgroundColor: '#f1f5f9',
        borderRadius: 10,
        paddingHorizontal: 15,
        height: 48,
        justifyContent: 'center',
        marginBottom: 15,
    },
    amountInput: {
        fontSize: 16,
        color: '#334155',
        textAlign: 'center',
        fontWeight: '600',
    },
    rowInputs: {
        flexDirection: 'row',
        marginBottom: 15,
    },
    disabledInput: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#f8fafc',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 10,
        height: 44,
        paddingHorizontal: 12,
    },
    disabledInputText: {
        fontSize: 13,
        color: '#475569',
    },
    notesInput: {
        backgroundColor: '#f8fafc',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 10,
        height: 80,
        padding: 12,
        fontSize: 13,
        textAlignVertical: 'top',
        color: '#334155',
    },
    footer: {
        flexDirection: 'row',
        gap: 12,
    },
    cancelButton: {
        flex: 1,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#f1f5f9',
        alignItems: 'center',
        justifyContent: 'center',
    },
    cancelButtonText: {
        fontSize: 13,
        fontWeight: '800',
        color: '#64748b',
    },
    payButton: {
        flex: 1,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#10b981',
        alignItems: 'center',
        justifyContent: 'center',
    },
    payButtonText: {
        fontSize: 13,
        fontWeight: '800',
        color: '#fff',
    },
});

