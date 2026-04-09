import React, { useState, useEffect } from 'react';
import CustomAlert from './CustomAlert';
import { AlertHelper } from '../utils/custom-alert-helper';

interface AlertConfig {
    title: string;
    message: string;
    type: 'success' | 'error' | 'warning' | 'info';
    buttons?: Array<{
        text: string;
        onPress?: () => void;
        style?: 'default' | 'cancel' | 'destructive';
    }>;
}

export function AlertProvider({ children }: { children: React.ReactNode }) {
    const [alertConfig, setAlertConfig] = useState<AlertConfig | null>(null);

    useEffect(() => {
        AlertHelper.setCallback((config) => {
            console.log('[ALERT_PROVIDER] Setting alert config:', config.title);
            setAlertConfig(config);
        });
    }, []);

    const handleClose = () => {
        console.log('[ALERT_PROVIDER] Closing alert');
        setAlertConfig(null);
    };

    return (
        <>
            {children}
            {alertConfig && (
                <CustomAlert
                    visible={true}
                    type={alertConfig.type}
                    title={alertConfig.title}
                    message={alertConfig.message}
                    onClose={handleClose}
                    buttons={alertConfig.buttons?.map(btn => ({
                        text: btn.text,
                        onPress: btn.onPress || (() => {}),
                        style: btn.style,
                    }))}
                />
            )}
        </>
    );
}

