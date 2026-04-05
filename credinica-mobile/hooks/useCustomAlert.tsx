import { useState } from 'react';

interface AlertButton {
    text: string;
    onPress: () => void;
    style?: 'default' | 'cancel' | 'destructive';
}

interface AlertState {
    visible: boolean;
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message: string;
    buttons?: AlertButton[];
}

export function useCustomAlert() {
    const [alert, setAlert] = useState<AlertState>({
        visible: false,
        type: 'info',
        title: '',
        message: '',
    });

    const showAlert = (
        title: string,
        message: string,
        type: 'success' | 'error' | 'warning' | 'info' = 'info',
        buttons?: AlertButton[]
    ) => {
        setAlert({
            visible: true,
            type,
            title,
            message,
            buttons,
        });
    };

    const hideAlert = () => {
        setAlert(prev => ({ ...prev, visible: false }));
    };

    // Métodos de conveniencia
    const success = (title: string, message: string, buttons?: AlertButton[]) => {
        showAlert(title, message, 'success', buttons);
    };

    const error = (title: string, message: string, buttons?: AlertButton[]) => {
        showAlert(title, message, 'error', buttons);
    };

    const warning = (title: string, message: string, buttons?: AlertButton[]) => {
        showAlert(title, message, 'warning', buttons);
    };

    const info = (title: string, message: string, buttons?: AlertButton[]) => {
        showAlert(title, message, 'info', buttons);
    };

    // Método para confirmaciones (con botones Cancelar/Confirmar)
    const confirm = (
        title: string,
        message: string,
        onConfirm: () => void,
        onCancel?: () => void,
        type: 'warning' | 'info' = 'warning'
    ) => {
        showAlert(title, message, type, [
            {
                text: 'Cancelar',
                onPress: onCancel || (() => {}),
                style: 'cancel',
            },
            {
                text: 'Confirmar',
                onPress: onConfirm,
                style: type === 'warning' ? 'destructive' : 'default',
            },
        ]);
    };

    return {
        alert,
        showAlert,
        hideAlert,
        success,
        error,
        warning,
        info,
        confirm,
    };
}

