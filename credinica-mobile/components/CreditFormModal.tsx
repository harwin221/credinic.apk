import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Platform, KeyboardAvoidingView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import { sessionService } from '../services/session';
import { API_ENDPOINTS } from '../config/api';
import DateTimePicker from '@react-native-community/datetimepicker';
import CustomAlert from './CustomAlert';
import GuaranteeFormModal, { GuaranteeData } from './GuaranteeFormModal';

interface CreditFormModalProps {
    visible: boolean;
    onClose: () => void;
    client: any;
    onSuccess: () => void;
}

const PAYMENT_FREQUENCIES = ['Diario', 'Semanal', 'Catorcenal', 'Quincenal'];

interface Guarantee extends GuaranteeData {
    id: string;
}

export default function CreditFormModal({ visible, onClose, client, onSuccess }: CreditFormModalProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [activeTab, setActiveTab] = useState<'credit' | 'guarantees'>('credit');
    const [isGuaranteeModalOpen, setIsGuaranteeModalOpen] = useState(false);
    const [alert, setAlert] = useState<{
        visible: boolean;
        type: 'success' | 'error' | 'warning' | 'info';
        title: string;
        message: string;
        onConfirm?: () => void;
    }>({
        visible: false,
        type: 'info',
        title: '',
        message: '',
    });
    const [formData, setFormData] = useState({
        productDestination: '',
        amount: '',
        interestRate: '3',
        termMonths: '',
        paymentFrequency: 'Semanal',
        firstPaymentDate: new Date(),
    });
    const [guarantees, setGuarantees] = useState<Guarantee[]>([]);

    // Resetear formulario cuando se abre el modal
    useEffect(() => {
        if (visible) {
            // Calcular fecha de primer pago (7 días desde hoy)
            const nextWeek = new Date();
            nextWeek.setDate(nextWeek.getDate() + 7);
            
            setFormData({
                productDestination: '',
                amount: '',
                interestRate: '3',
                termMonths: '',
                paymentFrequency: 'Semanal',
                firstPaymentDate: nextWeek,
            });
            setGuarantees([]);
            setActiveTab('credit');
        }
    }, [visible]);

    const handleDateChange = (event: any, selectedDate?: Date) => {
        setShowDatePicker(Platform.OS === 'ios'); // En iOS mantener abierto
        if (selectedDate) {
            setFormData({ ...formData, firstPaymentDate: selectedDate });
        }
    };

    const formatDate = (date: Date) => {
        return date.toLocaleDateString('es-NI', { 
            day: '2-digit', 
            month: '2-digit', 
            year: 'numeric' 
        });
    };

    const handleSubmit = async () => {
        // Validaciones básicas
        if (!formData.productDestination.trim()) {
            setAlert({
                visible: true,
                type: 'warning',
                title: 'Campo Requerido',
                message: 'Debes especificar el destino del producto',
            });
            return;
        }
        if (!formData.amount || parseFloat(formData.amount) < 1000) {
            setAlert({
                visible: true,
                type: 'warning',
                title: 'Monto Inválido',
                message: 'El monto mínimo es C$1,000',
            });
            return;
        }
        if (!formData.interestRate || parseFloat(formData.interestRate) < 1) {
            setAlert({
                visible: true,
                type: 'warning',
                title: 'Tasa Inválida',
                message: 'La tasa de interés debe ser al menos 1%',
            });
            return;
        }
        if (!formData.termMonths || parseFloat(formData.termMonths) < 0.5) {
            setAlert({
                visible: true,
                type: 'warning',
                title: 'Plazo Inválido',
                message: 'El plazo mínimo es 0.5 meses',
            });
            return;
        }

        setIsSubmitting(true);

        try {
            const session = await sessionService.getSession();
            if (!session) {
                setAlert({
                    visible: true,
                    type: 'error',
                    title: 'Error de Sesión',
                    message: 'No se pudo obtener la sesión del usuario',
                });
                setIsSubmitting(false);
                return;
            }

            // Preparar datos para enviar
            const creditData = {
                clientId: client.id,
                productType: 'PERSONAL', // Valor por defecto
                subProduct: 'CONSUMO', // Valor por defecto
                productDestination: formData.productDestination,
                amount: parseFloat(formData.amount),
                interestRate: parseFloat(formData.interestRate),
                termMonths: parseFloat(formData.termMonths),
                paymentFrequency: formData.paymentFrequency,
                firstPaymentDate: formData.firstPaymentDate.toISOString(),
                collectionsManager: session.id,
                guarantees: guarantees.map(g => ({
                    article: g.article,
                    brand: g.brand,
                    color: g.color,
                    model: g.model,
                    series: g.series,
                    estimatedValue: parseFloat(g.estimatedValue) || 0,
                })),
                guarantors: [],
            };

            const response = await fetch(`${API_ENDPOINTS.mobile_create_credit}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(creditData),
            });

            const result = await response.json();

            if (result.success) {
                setAlert({
                    visible: true,
                    type: 'success',
                    title: '¡Éxito!',
                    message: 'Solicitud de crédito creada exitosamente',
                    onConfirm: () => {
                        onClose();
                        onSuccess();
                    },
                });
            } else {
                setAlert({
                    visible: true,
                    type: 'error',
                    title: 'Error',
                    message: result.message || 'No se pudo crear la solicitud',
                });
            }
        } catch (error) {
            console.error('Error creando crédito:', error);
            setAlert({
                visible: true,
                type: 'error',
                title: 'Error de Conexión',
                message: 'No se pudo conectar con el servidor',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const addGuarantee = (data: GuaranteeData) => {
        const newGuarantee: Guarantee = {
            ...data,
            id: `gar_${Date.now()}`,
        };
        setGuarantees([...guarantees, newGuarantee]);
    };

    const removeGuarantee = (id: string) => {
        setGuarantees(guarantees.filter((g) => g.id !== id));
    };

    return (
        <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
            <View style={styles.modalOverlay}>
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Nueva Solicitud de Crédito</Text>
                        <TouchableOpacity onPress={onClose} disabled={isSubmitting}>
                            <MaterialCommunityIcons name="close" size={24} color="#64748b" />
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.clientInfo}>Cliente: {client?.name}</Text>

                    {/* Tabs */}
                    <View style={styles.tabContainer}>
                        <TouchableOpacity
                            style={[styles.tab, activeTab === 'credit' && styles.tabActive]}
                            onPress={() => setActiveTab('credit')}
                        >
                            <MaterialCommunityIcons 
                                name="cash" 
                                size={18} 
                                color={activeTab === 'credit' ? '#0ea5e9' : '#94a3b8'} 
                            />
                            <Text style={[styles.tabText, activeTab === 'credit' && styles.tabTextActive]}>
                                Crédito
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.tab, activeTab === 'guarantees' && styles.tabActive]}
                            onPress={() => setActiveTab('guarantees')}
                        >
                            <MaterialCommunityIcons 
                                name="shield-check" 
                                size={18} 
                                color={activeTab === 'guarantees' ? '#0ea5e9' : '#94a3b8'} 
                            />
                            <Text style={[styles.tabText, activeTab === 'guarantees' && styles.tabTextActive]}>
                                Garantías ({guarantees.length})
                            </Text>
                        </TouchableOpacity>
                    </View>

                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
                        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
                        style={{ flex: 1 }}
                    >
                        <ScrollView showsVerticalScrollIndicator={false} style={styles.formScroll}>
                        {activeTab === 'credit' ? (
                            <>
                        {/* Destino del Producto */}
                        <Text style={styles.label}>Destino del Producto</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Ej: Compra de mercadería"
                            value={formData.productDestination}
                            onChangeText={(text) => setFormData({ ...formData, productDestination: text })}
                        />

                        {/* Monto */}
                        <Text style={styles.label}>Monto del Crédito (C$)</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Ej: 10000"
                            keyboardType="numeric"
                            value={formData.amount}
                            onChangeText={(text) => setFormData({ ...formData, amount: text })}
                        />

                        {/* Tasa de Interés */}
                        <Text style={styles.label}>Tasa de Interés (%)</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Ej: 3"
                            keyboardType="numeric"
                            value={formData.interestRate}
                            onChangeText={(text) => setFormData({ ...formData, interestRate: text })}
                        />

                        {/* Plazo */}
                        <Text style={styles.label}>Plazo (meses)</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Ej: 12"
                            keyboardType="numeric"
                            value={formData.termMonths}
                            onChangeText={(text) => setFormData({ ...formData, termMonths: text })}
                        />

                        {/* Frecuencia de Pago */}
                        <Text style={styles.label}>Frecuencia de Pago</Text>
                        <View style={styles.pickerContainer}>
                            {PAYMENT_FREQUENCIES.map(freq => (
                                <TouchableOpacity
                                    key={freq}
                                    style={[styles.pickerOption, formData.paymentFrequency === freq && styles.pickerOptionActive]}
                                    onPress={() => setFormData({ ...formData, paymentFrequency: freq })}
                                >
                                    <Text style={[styles.pickerOptionText, formData.paymentFrequency === freq && styles.pickerOptionTextActive]}>
                                        {freq}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Fecha de Primer Pago */}
                        <Text style={styles.label}>Fecha de Primer Pago</Text>
                        <TouchableOpacity 
                            style={styles.dateButton}
                            onPress={() => setShowDatePicker(true)}
                        >
                            <MaterialCommunityIcons name="calendar" size={20} color="#0ea5e9" />
                            <Text style={styles.dateButtonText}>{formatDate(formData.firstPaymentDate)}</Text>
                        </TouchableOpacity>

                        {showDatePicker && (
                            <DateTimePicker
                                value={formData.firstPaymentDate}
                                mode="date"
                                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                onChange={handleDateChange}
                                minimumDate={new Date()}
                            />
                        )}
                        </>
                        ) : (
                            <>
                                {/* Pestaña de Garantías */}
                                <TouchableOpacity 
                                    style={styles.addGuaranteeButton} 
                                    onPress={() => setIsGuaranteeModalOpen(true)}
                                >
                                    <MaterialCommunityIcons name="plus-circle" size={20} color="#0ea5e9" />
                                    <Text style={styles.addGuaranteeText}>Agregar Garantía</Text>
                                </TouchableOpacity>

                                {guarantees.length === 0 ? (
                                    <View style={styles.emptyGuarantees}>
                                        <MaterialCommunityIcons name="shield-off" size={64} color="#cbd5e1" />
                                        <Text style={styles.emptyText}>No hay garantías agregadas</Text>
                                        <Text style={styles.emptyHint}>Agrega garantías para respaldar el crédito</Text>
                                    </View>
                                ) : (
                                    <>
                                        {guarantees.map((guarantee) => (
                                            <View key={guarantee.id} style={styles.guaranteeCard}>
                                                <View style={styles.guaranteeHeader}>
                                                    <View style={styles.guaranteeInfo}>
                                                        <Text style={styles.guaranteeArticle}>{guarantee.article}</Text>
                                                        {guarantee.brand ? (
                                                            <Text style={styles.guaranteeDetail}>
                                                                {guarantee.brand}
                                                                {guarantee.model ? ` - ${guarantee.model}` : ''}
                                                            </Text>
                                                        ) : null}
                                                    </View>
                                                    <TouchableOpacity onPress={() => removeGuarantee(guarantee.id)}>
                                                        <MaterialCommunityIcons name="delete" size={20} color="#ef4444" />
                                                    </TouchableOpacity>
                                                </View>
                                                <View style={styles.guaranteeValueContainer}>
                                                    <Text style={styles.guaranteeValueLabel}>Valor:</Text>
                                                    <Text style={styles.guaranteeValue}>
                                                        C$ {parseFloat(guarantee.estimatedValue || '0').toLocaleString('es-NI', { minimumFractionDigits: 2 })}
                                                    </Text>
                                                </View>
                                            </View>
                                        ))}
                                        
                                        <View style={styles.totalContainer}>
                                            <Text style={styles.totalLabel}>Valor Total en Garantías</Text>
                                            <Text style={styles.totalValue}>
                                                C$ {guarantees.reduce((sum, g) => sum + parseFloat(g.estimatedValue || '0'), 0).toLocaleString('es-NI', { minimumFractionDigits: 2 })}
                                            </Text>
                                        </View>
                                    </>
                                )}
                            </>
                        )}
                    </ScrollView>
                    </KeyboardAvoidingView>

                    {/* Botón de submit fuera del ScrollView para que esté visible en ambas pestañas */}
                    <View style={styles.buttonContainer}>
                        <TouchableOpacity
                            style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
                            onPress={handleSubmit}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <>
                                    <MaterialCommunityIcons name="check-circle" size={20} color="#fff" />
                                    <Text style={styles.submitButtonText}>Crear Solicitud</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>

            <CustomAlert
                visible={alert.visible}
                type={alert.type}
                title={alert.title}
                message={alert.message}
                onClose={() => {
                    setAlert({ ...alert, visible: false });
                    if (alert.onConfirm) alert.onConfirm();
                }}
            />

            <GuaranteeFormModal
                visible={isGuaranteeModalOpen}
                onClose={() => setIsGuaranteeModalOpen(false)}
                onSave={addGuarantee}
            />
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 16 },
    modalContainer: { backgroundColor: '#fff', borderRadius: 20, padding: 20, maxHeight: '90%', width: '95%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    modalTitle: { fontSize: 16, fontWeight: '800', color: '#1e293b' },
    clientInfo: { fontSize: 14, color: '#64748b', marginBottom: 16, fontWeight: '600' },
    formScroll: { marginBottom: 20 },
    label: { fontSize: 13, fontWeight: '700', color: '#334155', marginTop: 12, marginBottom: 6 },
    input: {
        backgroundColor: '#f8fafc',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 14,
        color: '#334155',
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    pickerContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    pickerOption: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 16,
        backgroundColor: '#f1f5f9',
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    pickerOptionActive: {
        backgroundColor: '#0ea5e9',
        borderColor: '#0ea5e9',
    },
    pickerOptionText: { fontSize: 12, color: '#64748b', fontWeight: '600' },
    pickerOptionTextActive: { color: '#fff' },
    dateButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f8fafc',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 12,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        gap: 8,
    },
    dateButtonText: {
        fontSize: 14,
        color: '#334155',
        fontWeight: '600',
    },
    buttonContainer: { marginTop: 20, marginBottom: 10 },
    submitButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#10b981',
        paddingVertical: 14,
        borderRadius: 12,
        gap: 8,
    },
    submitButtonDisabled: { backgroundColor: '#94a3b8' },
    submitButtonText: { fontSize: 15, fontWeight: '700', color: '#fff' },
    tabContainer: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0',
        marginBottom: 16,
    },
    tab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        gap: 6,
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    tabActive: {
        borderBottomColor: '#0ea5e9',
    },
    tabText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#94a3b8',
    },
    tabTextActive: {
        color: '#0ea5e9',
    },
    emptyGuarantees: {
        alignItems: 'center',
        paddingVertical: 40,
    },
    emptyText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#334155',
        marginTop: 12,
    },
    emptyHint: {
        fontSize: 13,
        color: '#94a3b8',
        marginTop: 4,
    },
    guaranteeCard: {
        backgroundColor: '#f8fafc',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    guaranteeHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    guaranteeInfo: {
        flex: 1,
        marginRight: 12,
    },
    guaranteeArticle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#1e293b',
        marginBottom: 4,
    },
    guaranteeDetail: {
        fontSize: 13,
        color: '#64748b',
        fontWeight: '500',
    },
    guaranteeValueContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 8,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#e2e8f0',
    },
    guaranteeValueLabel: {
        fontSize: 13,
        color: '#64748b',
        fontWeight: '600',
    },
    guaranteeValue: {
        fontSize: 15,
        fontWeight: '700',
        color: '#0ea5e9',
    },
    guaranteeTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#334155',
    },
    addGuaranteeButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#eff6ff',
        paddingVertical: 12,
        borderRadius: 12,
        gap: 8,
        marginTop: 8,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#bfdbfe',
    },
    addGuaranteeText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#0ea5e9',
    },
    totalContainer: {
        backgroundColor: '#0ea5e9',
        borderRadius: 12,
        padding: 16,
        marginTop: 8,
        marginBottom: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    totalLabel: {
        fontSize: 14,
        fontWeight: '700',
        color: '#fff',
    },
    totalValue: {
        fontSize: 18,
        fontWeight: '800',
        color: '#fff',
    },
});

