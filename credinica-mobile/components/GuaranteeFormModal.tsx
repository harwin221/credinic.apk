import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, TextInput, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';

interface GuaranteeFormModalProps {
    visible: boolean;
    onClose: () => void;
    onSave: (guarantee: GuaranteeData) => void;
}

export interface GuaranteeData {
    article: string;
    brand: string;
    color: string;
    model: string;
    series: string;
    estimatedValue: string;
}

export default function GuaranteeFormModal({ visible, onClose, onSave }: GuaranteeFormModalProps) {
    const [formData, setFormData] = useState<GuaranteeData>({
        article: '',
        brand: '',
        color: '',
        model: '',
        series: '',
        estimatedValue: '',
    });
    const [error, setError] = useState('');

    useEffect(() => {
        if (visible) {
            // Reset form when modal opens
            setFormData({
                article: '',
                brand: '',
                color: '',
                model: '',
                series: '',
                estimatedValue: '',
            });
            setError('');
        }
    }, [visible]);

    const handleSave = () => {
        // Validations
        if (!formData.article.trim()) {
            setError('El artículo es requerido');
            return;
        }
        if (!formData.estimatedValue || parseFloat(formData.estimatedValue) <= 0) {
            setError('El valor estimado debe ser mayor a 0');
            return;
        }

        onSave(formData);
        onClose();
    };

    return (
        <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
            <View style={styles.modalOverlay}>
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Agregar Garantía</Text>
                        <TouchableOpacity onPress={onClose}>
                            <MaterialCommunityIcons name="close" size={24} color="#64748b" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView 
                        showsVerticalScrollIndicator={false} 
                        style={styles.formScroll}
                        keyboardShouldPersistTaps="handled"
                    >
                        {error ? (
                            <View style={styles.errorContainer}>
                                <MaterialCommunityIcons name="alert-circle" size={16} color="#ef4444" />
                                <Text style={styles.errorText}>{error}</Text>
                            </View>
                        ) : null}

                        <Text style={styles.label}>Artículo <Text style={styles.required}>*</Text></Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Ej: Refrigerador, Televisor"
                            value={formData.article}
                            onChangeText={(text) => {
                                setFormData({ ...formData, article: text });
                                setError('');
                            }}
                        />

                        <View style={styles.row}>
                            <View style={styles.halfWidth}>
                                <Text style={styles.label}>Marca</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Ej: Sony, LG"
                                    value={formData.brand}
                                    onChangeText={(text) => setFormData({ ...formData, brand: text })}
                                />
                            </View>
                            <View style={styles.halfWidth}>
                                <Text style={styles.label}>Color</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Ej: Gris, Blanco"
                                    value={formData.color}
                                    onChangeText={(text) => setFormData({ ...formData, color: text })}
                                />
                            </View>
                        </View>

                        <View style={styles.row}>
                            <View style={styles.halfWidth}>
                                <Text style={styles.label}>Modelo</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Ej: RX-100"
                                    value={formData.model}
                                    onChangeText={(text) => setFormData({ ...formData, model: text })}
                                />
                            </View>
                            <View style={styles.halfWidth}>
                                <Text style={styles.label}>Serie</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Ej: SN123456789"
                                    value={formData.series}
                                    onChangeText={(text) => setFormData({ ...formData, series: text })}
                                />
                            </View>
                        </View>

                        <Text style={styles.label}>Valor Estimado (C$) <Text style={styles.required}>*</Text></Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Ej: 5000"
                            keyboardType="numeric"
                            value={formData.estimatedValue}
                            onChangeText={(text) => {
                                setFormData({ ...formData, estimatedValue: text });
                                setError('');
                            }}
                        />
                    </ScrollView>

                    <View style={styles.buttonContainer}>
                        <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
                            <Text style={styles.cancelButtonText}>Cancelar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                            <MaterialCommunityIcons name="check" size={18} color="#fff" />
                            <Text style={styles.saveButtonText}>Guardar</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
        alignItems: 'center',
    },
    modalContainer: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        height: '85%',
        width: '100%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#1e293b',
    },
    formScroll: {
        flex: 1,
        marginBottom: 16,
    },
    label: {
        fontSize: 14,
        fontWeight: '700',
        color: '#334155',
        marginTop: 16,
        marginBottom: 8,
    },
    required: {
        color: '#ef4444',
    },
    input: {
        backgroundColor: '#f8fafc',
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 15,
        color: '#334155',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        minHeight: 48,
    },
    row: {
        flexDirection: 'row',
        gap: 12,
    },
    halfWidth: {
        flex: 1,
    },
    errorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fee2e2',
        padding: 12,
        borderRadius: 8,
        gap: 8,
        marginBottom: 12,
    },
    errorText: {
        fontSize: 13,
        color: '#ef4444',
        fontWeight: '600',
        flex: 1,
    },
    buttonContainer: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 8,
        marginBottom: 100,
        paddingBottom: 20,
    },
    cancelButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f1f5f9',
        paddingVertical: 14,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    cancelButtonText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#64748b',
    },
    saveButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0ea5e9',
        paddingVertical: 14,
        borderRadius: 12,
        gap: 6,
    },
    saveButtonText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#fff',
    },
});

