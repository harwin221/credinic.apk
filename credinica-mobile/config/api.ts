// Configuración de la API
// Cambia esta URL según tu entorno

// Para desarrollo local (tu computadora)
// export const API_BASE_URL = 'http://192.168.0.13:3000'; // Cambia la IP por la de tu computadora

// Para producción (URL real del sistema)
export const API_BASE_URL = 'https://app.credinica.com';

// Para desarrollo con Vercel (testing)
// export const API_BASE_URL = 'https://credinic-apk.vercel.app';

// Para desarrollo con túnel (ngrok, etc)
// export const API_BASE_URL = 'https://tu-tunel.ngrok.io';

export const API_ENDPOINTS = {
    base: API_BASE_URL,
    mobile_login: `${API_BASE_URL}/api/mobile/mobile_login`,
    mobile_clients: `${API_BASE_URL}/api/mobile/mobile_clients`,
    mobile_client_detail: `${API_BASE_URL}/api/mobile/mobile_client_detail`,
    mobile_credit_detail: `${API_BASE_URL}/api/mobile/mobile_credit_detail`,
    mobile_dashboard: `${API_BASE_URL}/api/mobile/mobile_dashboard`,
    mobile_portfolio: `${API_BASE_URL}/api/mobile/mobile_portfolio`,
    mobile_search: `${API_BASE_URL}/api/mobile/mobile_search`,
    mobile_payments: `${API_BASE_URL}/api/mobile/mobile_payments`,
    mobile_create_credit: `${API_BASE_URL}/api/mobile/mobile_create_credit`,
    mobile_void_payment: `${API_BASE_URL}/api/mobile/mobile_void_payment`,
    mobile_requests: `${API_BASE_URL}/api/mobile/requests`,
    mobile_disbursements: `${API_BASE_URL}/api/mobile/disbursements`,
    approve_credit: `${API_BASE_URL}/api/mobile/approve-credit`,
    reject_credit: `${API_BASE_URL}/api/mobile/reject-credit`,
    disburse_credit: `${API_BASE_URL}/api/mobile/disburse-credit`,
    deny_disbursement: `${API_BASE_URL}/api/mobile/deny-disbursement`,
    mobile_receipt: `${API_BASE_URL}/api/mobile/receipt`,
    change_password: `${API_BASE_URL}/api/users/change-password`,
};
