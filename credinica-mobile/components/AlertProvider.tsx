import React, { useState, useEffect } from 'react';
import CustomAlert from './CustomAlert';
import { Alert } from '../utils/alert';

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
        Alert.setCallback((config) => {
            setAlertConfig(config);
        });
    }, []);

    const handleClose = () => {
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
                        onPress: () => {
                            if (btn.onPress) btn.onPress();
                        },
                        style: btn.style,
                    }))}
                />
            )}
        </>
    );
}

