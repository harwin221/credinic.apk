'use client';

/**
 * Obtiene o crea un ID de dispositivo único y lo guarda en el localStorage.
 * @returns {string} - El ID único del dispositivo.
 */
export function getDeviceId(): string {
  if (typeof window === 'undefined') {
    return 'server-device'; // Valor de respaldo para el lado del servidor.
  }
  
  let deviceId = localStorage.getItem('device_id');
  
  if (!deviceId) {
    // Si no existe, se genera uno nuevo combinando la fecha y un número aleatorio.
    deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('device_id', deviceId);
  }
  
  return deviceId;
}

// Función para determinar si el dispositivo es móvil basado en el user agent.
// Esto es más confiable para la lógica que un hook que depende del tamaño de la pantalla.
export function getDeviceType(): 'mobile' | 'desktop' {
  if (typeof window === 'undefined') {
    return 'desktop'; // Asumir escritorio en el servidor
  }
  const ua = navigator.userAgent;
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    return 'mobile'; // Las tablets se consideran móviles para este propósito
  }
  if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
    return 'mobile';
  }
  return 'desktop';
}
