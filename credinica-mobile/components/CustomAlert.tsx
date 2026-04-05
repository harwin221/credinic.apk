import { View, Text, StyleSheet, Modal, TouchableOpacity, Animated } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';

interface CustomAlertProps {
    visible: boolean;
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message: string;
    onClose: () => void;
    buttons?: Array<{
        text: string;
        onPress: () => void;
        style?: 'default' | 'cancel' | 'destructive';
    }>;
}

export default function CustomAlert({ visible, type, title, message, onClose, buttons }: CustomAlertProps) {
    const scaleAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            Animated.spring(scaleAnim, {
                toValue: 1,
                useNativeDriver: true,
                tension: 50,
                friction: 7,
            }).start();
        } else {
            scaleAnim.setValue(0);
        }
    }, [visible]);

    const getIconAndColor = () => {
        switch (type) {
            case 'success':
                return { icon: 'check-circle', color: '#10b981', bg: '#d1fae5' };
            case 'error':
                return { icon: 'alert-circle', color: '#ef4444', bg: '#fee2e2' };
            case 'warning':
                return { icon: 'alert', color: '#f59e0b', bg: '#fef3c7' };
            case 'info':
                return { icon: 'information', color: '#3b82f6', bg: '#dbeafe' };
        }
    };

    const { icon, color, bg } = getIconAndColor();

    const defaultButtons = buttons || [{ text: 'OK', onPress: onClose, style: 'default' as const }];

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <View style={styles.overlay}>
                <Animated.View style={[styles.alertContainer, { transform: [{ scale: scaleAnim }] }]}>
                    <View style={[styles.iconContainer, { backgroundColor: bg }]}>
                        <MaterialCommunityIcons name={icon as any} size={48} color={color} />
                    </View>

                    <Text style={styles.title}>{title}</Text>
                    <Text style={styles.message}>{message}</Text>

                    <View style={styles.buttonsContainer}>
                        {defaultButtons.map((button, index) => (
                            <TouchableOpacity
                                key={index}
                                style={[
                                    styles.button,
                                    button.style === 'cancel' && styles.buttonCancel,
                                    button.style === 'destructive' && styles.buttonDestructive,
                                    defaultButtons.length === 1 && styles.buttonSingle,
                                ]}
                                onPress={() => {
                                    button.onPress();
                                    onClose();
                                }}
                            >
                                <Text
                                    style={[
                                        styles.buttonText,
                                        button.style === 'cancel' && styles.buttonTextCancel,
                                        button.style === 'destructive' && styles.buttonTextDestructive,
                                    ]}
                                >
                                    {button.text}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </Animated.View>
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
    alertContainer: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 24,
        width: '100%',
        maxWidth: 340,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 20,
        elevation: 10,
    },
    iconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    title: {
        fontSize: 20,
        fontWeight: '800',
        color: '#1e293b',
        marginBottom: 8,
        textAlign: 'center',
    },
    message: {
        fontSize: 15,
        color: '#64748b',
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 22,
    },
    buttonsContainer: {
        flexDirection: 'row',
        gap: 12,
        width: '100%',
    },
    button: {
        flex: 1,
        backgroundColor: '#0ea5e9',
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
    },
    buttonSingle: {
        flex: 1,
    },
    buttonCancel: {
        backgroundColor: '#f1f5f9',
    },
    buttonDestructive: {
        backgroundColor: '#ef4444',
    },
    buttonText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#fff',
    },
    buttonTextCancel: {
        color: '#64748b',
    },
    buttonTextDestructive: {
        color: '#fff',
    },
});

