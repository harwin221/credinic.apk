/**
 * Custom Alert utility that uses CustomAlert component
 * Drop-in replacement for React Native's Alert.alert
 */

let alertCallback: ((config: CustomAlertConfig) => void) | null = null;

interface CustomAlertConfig {
    title: string;
    message: string;
    type: 'success' | 'error' | 'warning' | 'info';
    buttons?: Array<{
        text: string;
        onPress?: () => void;
        style?: 'default' | 'cancel' | 'destructive';
    }>;
}

const showAlert = (
    title: string,
    message?: string,
    buttons?: Array<{
        text: string;
        onPress?: () => void;
        style?: 'default' | 'cancel' | 'destructive';
    }>,
    options?: { cancelable?: boolean }
) => {
    // Determinar el tipo basado en el título o contenido
    let type: 'success' | 'error' | 'warning' | 'info' = 'info';
    
    const titleLower = title.toLowerCase();
    const messageLower = (message || '').toLowerCase();
    
    if (titleLower.includes('éxito') || titleLower.includes('exito') || titleLower.includes('bienvenido') || titleLower.includes('completado') || titleLower.includes('guardado') || titleLower.includes('aprobad') || titleLower.includes('configurad')) {
        type = 'success';
    } else if (titleLower.includes('error') || titleLower.includes('fallo') || titleLower.includes('falló') || messageLower.includes('no se pudo') || titleLower.includes('denegad')) {
        type = 'error';
    } else if (titleLower.includes('advertencia') || titleLower.includes('aviso') || titleLower.includes('confirmar') || titleLower.includes('cerrar sesión') || titleLower.includes('aprobar') || titleLower.includes('rechazar') || titleLower.includes('denegar') || titleLower.includes('anular') || titleLower.includes('seguro')) {
        type = 'warning';
    }

    if (alertCallback) {
        alertCallback({
            title,
            message: message || '',
            type,
            buttons: buttons || [{ text: 'OK', onPress: () => {}, style: 'default' }],
        });
    }
};

const setCallback = (callback: (config: CustomAlertConfig) => void) => {
    alertCallback = callback;
};

// Export as object to avoid naming conflicts
export const AlertHelper = {
    alert: showAlert,
    setCallback: setCallback,
};

