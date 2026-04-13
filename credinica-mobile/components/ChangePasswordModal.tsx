import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { API_ENDPOINTS } from '../config/api';
import CustomAlert from './CustomAlert';
import { sessionService } from '../services/session';

interface ChangePasswordModalProps {
    visible: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function ChangePasswordModal({ visible, onClose, onSuccess }: ChangePasswordModalProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
    });

    const resetForm = () => {
        setFormData({
            currentPassword: '',
            newPassword: '',
            confirmPassword: '',
        });
        setShowCurrentPassword(false);
        setShowNewPassword(false);
        setShowConfirmPassword(false);
    };

    const handleSubmit = async () => {
        // Validaciones
        if (!formData.currentPassword) {
            setAlert({
                visible: true,
                type: 'warning',
                title: 'Campo Requerido',
                message: 'Debes ingresar tu contraseña actual',
            });
            return;
        }

        if (!formData.newPassword || formData.newPassword.length < 6) {
            setAlert({
                visible: true,
                type: 'warning',
                title: 'Contraseña Inválida',
                message: 'La nueva contraseña debe tener al menos 6 caracteres',
            });
            return;
        }

        if (formData.newPassword !== formData.confirmPassword) {
            setAlert({
                visible: true,
                type: 'warning',
                title: 'Contraseñas No Coinciden',
                message: 'La nueva contraseña y la confirmación deben ser iguales',
            });
            return;
        }

        if (formData.currentPassword === formData.newPassword) {
            setAlert({
                visible: true,
                type: 'warning',
                title: 'Contraseña Repetida',
                message: 'La nueva contraseña no puede ser igual a la actual',
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

            const response = await fetch(API_ENDPOINTS.change_password, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: session.id,
                    currentPassword: formData.currentPassword,
                    newPassword: formData.newPassword,
                }),
            });

            const result = await response.json();

            if (result.success) {
                setAlert({
                    visible: true,
                    type: 'success',
                    title: '¡Éxito!',
                    message: 'Tu contraseña ha sido cambiada exitosamente',
                    onConfirm: () => {
                        resetForm();
                        onClose();
                        onSuccess();
                    },
                });
            } else {
                setAlert({
                    visible: true,
                    type: 'error',
                    title: 'Error',
                    message: result.error || 'No se pudo cambiar la contraseña',
                });
            }
        } catch (error) {
            console.error('Error cambiando contraseña:', error);
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

    return (
        <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
            <View style={styles.modalOverlay}>
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <MaterialCommunityIcons name="lock-reset" size={24} color="#0ea5e9" />
                        <Text style={styles.modalTitle}>Cambiar Contraseña</Text>
                        <TouchableOpacity onPress={onClose} disabled={isSubmitting}>
                            <MaterialCommunityIcons name="close" size={24} color="#64748b" />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.formContainer}>
                        {/* Contraseña Actual */}
                        <Text style={styles.label}>Contraseña Actual</Text>
                        <View style={styles.passwordContainer}>
                            <TextInput
                                style={styles.passwordInput}
                                placeholder="Ingresa tu contraseña actual"
                                secureTextEntry={!showCurrentPassword}
                                value={formData.currentPassword}
                                onChangeText={(text) => setFormData({ ...formData, currentPassword: text })}
                                editable={!isSubmitting}
                            />
                            <TouchableOpacity
                                style={styles.eyeButton}
                                onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                            >
                                <MaterialCommunityIcons
                                    name={showCurrentPassword ? 'eye-off' : 'eye'}
                                    size={20}
                                    color="#64748b"
                                />
                            </TouchableOpacity>
                        </View>

                        {/* Nueva Contraseña */}
                        <Text style={styles.label}>Nueva Contraseña</Text>
                        <View style={styles.passwordContainer}>
                            <TextInput
                                style={styles.passwordInput}
                                placeholder="Mínimo 6 caracteres"
                                secureTextEntry={!showNewPassword}
                                value={formData.newPassword}
                                onChangeText={(text) => setFormData({ ...formData, newPassword: text })}
                                editable={!isSubmitting}
                            />
                            <TouchableOpacity
                                style={styles.eyeButton}
                                onPress={() => setShowNewPassword(!showNewPassword)}
                            >
                                <MaterialCommunityIcons
                                    name={showNewPassword ? 'eye-off' : 'eye'}
                                    size={20}
                                    color="#64748b"
                                />
                            </TouchableOpacity>
                        </View>

                        {/* Confirmar Nueva Contraseña */}
                        <Text style={styles.label}>Confirmar Nueva Contraseña</Text>
                        <View style={styles.passwordContainer}>
                            <TextInput
                                style={styles.passwordInput}
                                placeholder="Repite la nueva contraseña"
                                secureTextEntry={!showConfirmPassword}
                                value={formData.confirmPassword}
                                onChangeText={(text) => setFormData({ ...formData, confirmPassword: text })}
                                editable={!isSubmitting}
                            />
                            <TouchableOpacity
                                style={styles.eyeButton}
                                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                            >
                                <MaterialCommunityIcons
                                    name={showConfirmPassword ? 'eye-off' : 'eye'}
                                    size={20}
                                    color="#64748b"
                                />
                            </TouchableOpacity>
                        </View>

                        {/* Botón de Cambiar */}
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
                                    <Text style={styles.submitButtonText}>Cambiar Contraseña</Text>
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
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContainer: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 24,
        width: '100%',
        maxWidth: 400,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 24,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: '#1e293b',
        flex: 1,
        marginLeft: 12,
    },
    formContainer: {
        gap: 16,
    },
    label: {
        fontSize: 14,
        fontWeight: '700',
        color: '#334155',
        marginBottom: 8,
    },
    passwordContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f8fafc',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        marginBottom: 8,
    },
    passwordInput: {
        flex: 1,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 15,
        color: '#334155',
    },
    eyeButton: {
        padding: 12,
    },
    submitButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0ea5e9',
        paddingVertical: 14,
        borderRadius: 12,
        gap: 8,
        marginTop: 8,
    },
    submitButtonDisabled: {
        backgroundColor: '#94a3b8',
    },
    submitButtonText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#fff',
    },
});
