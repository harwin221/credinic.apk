import React, { useState } from 'react';
import { View, Text, TextInput, Modal, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface ReasonModalProps {
    visible: boolean;
    title: string;
    message: string;
    onCancel: () => void;
    onConfirm: (reason: string) => void;
}

export default function ReasonModal({ visible, title, message, onCancel, onConfirm }: ReasonModalProps) {
    const [reason, setReason] = useState('');

    const handleConfirm = () => {
        if (reason.trim() === '') {
            return;
        }
        onConfirm(reason.trim());
        setReason('');
    };

    const handleCancel = () => {
        setReason('');
        onCancel();
    };

    return (
        <Modal
            visible={visible}
            animationType="fade"
            transparent={true}
            onRequestClose={handleCancel}
        >
            <View style={styles.overlay}>
                <View style={styles.modalContainer}>
                    <View style={styles.header}>
                        <Text style={styles.title}>{title}</Text>
                        <TouchableOpacity onPress={handleCancel}>
                            <MaterialCommunityIcons name="close" size={24} color="#64748b" />
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.message}>{message}</Text>

                    <TextInput
                        style={styles.input}
                        placeholder="Escribe el motivo aquí..."
                        placeholderTextColor="#94a3b8"
                        value={reason}
                        onChangeText={setReason}
                        multiline
                        numberOfLines={4}
                        textAlignVertical="top"
                        autoFocus
                    />

                    <View style={styles.buttonContainer}>
                        <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
                            <Text style={styles.cancelButtonText}>Cancelar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={[styles.confirmButton, reason.trim() === '' && styles.confirmButtonDisabled]} 
                            onPress={handleConfirm}
                            disabled={reason.trim() === ''}
                        >
                            <Text style={styles.confirmButtonText}>Confirmar</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContainer: {
        backgroundColor: '#ffffff',
        borderRadius: 16,
        width: '100%',
        maxWidth: 400,
        padding: 20,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
        color: '#334155',
    },
    message: {
        fontSize: 14,
        color: '#64748b',
        marginBottom: 16,
        lineHeight: 20,
    },
    input: {
        backgroundColor: '#f8fafc',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 12,
        padding: 12,
        fontSize: 14,
        color: '#334155',
        minHeight: 100,
        marginBottom: 16,
    },
    buttonContainer: {
        flexDirection: 'row',
        gap: 12,
    },
    cancelButton: {
        flex: 1,
        backgroundColor: '#f1f5f9',
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: 'center',
    },
    cancelButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#64748b',
    },
    confirmButton: {
        flex: 1,
        backgroundColor: '#ef4444',
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: 'center',
    },
    confirmButtonDisabled: {
        backgroundColor: '#fca5a5',
        opacity: 0.5,
    },
    confirmButtonText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#ffffff',
    },
});

