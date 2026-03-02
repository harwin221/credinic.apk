# 📋 SISTEMA DE GESTIÓN FINANCIERA CREDINIC
## Manual Completo de Migración, Funcionalidades y Roles

---

## 🎯 **DESCRIPCIÓN DEL SISTEMA**

**CrediNic** es un sistema integral de gestión de microfinanzas desarrollado como Progressive Web App (PWA) con capacidades offline para gestores de campo. El sistema está diseñado específicamente para operar bajo las regulaciones y prácticas del mercado financiero nicaragüense.

### **Características Principales:**
- ✅ **Gestión completa de clientes y créditos**
- ✅ **Cálculo automático de planes de pago con múltiples frecuencias**
- ✅ **Sistema de roles y permisos granular**
- ✅ **Reportes financieros y operativos avanzados**
- ✅ **Funcionalidad offline para gestores de campo**
- ✅ **API móvil para aplicación Android**
- ✅ **Manejo consistente de fechas en zona horaria Nicaragua**
- ✅ **Generación de recibos PDF con firma digital**
- ✅ **Sistema de auditoría completo**
- ✅ **Arqueos de caja por usuario y sucursal**

---

## 🏗️ **ARQUITECTURA TECNOLÓGICA**

### **Stack Principal:**
- **Frontend:** Next.js 16, React 18, TypeScript
- **Backend:** Next.js API Routes, Server Actions
- **Base de Datos:** MySQL 8.0
- **UI Framework:** Tailwind CSS, Radix UI, Shadcn/ui
- **PWA:** Service Workers, Cache API, IndexedDB
- **Autenticación:** JWT con cookies httpOnly
- **Reportes:** PDF-lib, XLSX
- **Fechas:** date-fns con zona horaria America/Managua

### **Estructura del Proyecto:**
```
src/
├── app/                    # Páginas y API routes (Next.js App Router)
│   ├── (auth)/            # Rutas de autenticación
│   ├── api/               # Endpoints de la API
│   ├── dashboard/         # Panel principal
│   ├── clients/           # Gestión de clientes
│   ├── credits/           # Gestión de créditos
│   ├── reports/           # Sistema de reportes
│   ├── settings/          # Configuración del sistema
│   └── ...
├── components/            # Componentes reutilizables
│   ├── ui/               # Componentes base (Shadcn/ui)
│   ├── clients/          # Componentes específicos de clientes
│   └── ...
├── hooks/                # Custom hooks de React
├── lib/                  # Utilidades y configuración
├── services/             # Servicios de datos y lógica de negocio
└── types/                # Definiciones TypeScript
```

---

## 🔐 **SISTEMA DE ROLES Y PERMISOS**

### **Roles Disponibles:**

#### **1. ADMINISTRADOR**
**Acceso:** Completo al sistema
**Permisos:**
- ✅ Gestión completa de usuarios (crear, editar, eliminar, resetear contraseñas)
- ✅ Gestión de sucursales
- ✅ Configuración del sistema
- ✅ Todos los reportes (saldos, operativos, financieros)
- ✅ Auditoría completa
- ✅ Aprobación de créditos (nivel 2)
- ✅ Aprobación de anulaciones de pagos
- ✅ Gestión de clientes y créditos sin restricciones
- ✅ Arqueos de caja
- ✅ Desembolsos
- ✅ Calculadora de pagos

#### **2. GERENTE**
**Acceso:** Gestión operativa y supervisión general
**Permisos:**
- ✅ Gestión de clientes y créditos de su sucursal
- ✅ Aprobación de créditos (nivel 2)
- ✅ Solicitud de anulación de pagos
- ✅ Reportes saldos, operativos y financieros
- ✅ Arqueos de caja
- ✅ Desembolsos
- ✅ Calculadora de pagos
- ❌ Gestión de usuarios
- ❌ Configuración del sistema

#### **3. FINANZAS**
**Acceso:** Reportes financieros y arqueos
**Permisos:**
- ✅ Visualización de clientes y créditos
- ✅ Todos los reportes (saldos, operativos, financieros)
- ✅ Arqueos de caja
- ✅ Calculadora de pagos
- ❌ Creación/edición de clientes y créditos
- ❌ Aprobaciones
- ❌ Desembolsos

#### **4. OPERATIVO**
**Acceso:** Operaciones diarias de oficina
**Permisos:**
- ✅ Gestión de clientes y créditos de su sucursal
- ✅ Aplicación de pagos
- ✅ Reportes saldos y operativos
- ✅ Arqueos de caja
- ✅ Visualización de solicitudes
- ✅ Desembolsos
- ✅ Calculadora de pagos
- ❌ Aprobaciones de créditos
- ❌ Reportes financieros

#### **5. GESTOR**
**Acceso:** Gestión directa de clientes y cobranza
**Permisos:**
- ✅ Gestión de sus clientes asignados
- ✅ Creación de créditos para sus clientes
- ✅ Aplicación de pagos
- ✅ Solicitud de anulación de pagos
- ✅ Reportes básicos
- ✅ Calculadora de pagos
- ❌ Visualización de otros gestores
- ❌ Aprobaciones
- ❌ Arqueos de caja

---

## 📊 **FUNCIONALIDADES PRINCIPALES**

### **1. Gestión de Clientes**
- **Registro completo:** Datos personales, laborales, referencias
- **Tipos de empleo:** Asalariado, Comerciante
- **Geografía:** Departamentos y municipios de Nicaragua
- **Interacciones:** Historial de llamadas, visitas, notas
- **Tags:** Etiquetado personalizable
- **Referencias personales:** Contactos de emergencia

### **2. Gestión de Créditos**
- **Estados:** Pendiente, Aprobado, Activo, Pagado, Rechazado, Vencido, Fallecido
- **Frecuencias de pago:**
  - **Diario:** 20 cuotas por mes (días laborables)
  - **Semanal:** 4 cuotas por mes
  - **Catorcenal:** 2 cuotas por mes (cada 14 días)
  - **Quincenal:** 2 cuotas por mes (cada 15 días)
- **Garantías:** Registro de bienes en garantía
- **Fiadores:** Información de garantes
- **Cálculo automático:** Intereses, mora, fechas de vencimiento

### **3. Sistema de Pagos**
- **Aplicación de pagos:** Individual o por lotes
- **Recibos digitales:** PDF con firma digital
- **Anulaciones:** Flujo de solicitud y aprobación
- **Modo offline:** Registro sin internet con sincronización automática
- **Tipos de pago:** Normal, Dispensa, Ajuste

### **4. Reportes Avanzados**

#### **Reportes de Cartera:**
- **Saldos de Cartera:** Balance general por gestor/sucursal
- **Porcentaje Pagado:** Análisis de cumplimiento
- **Créditos Vencidos:** Cartera en mora
- **Proyección de Cuotas Futuras:** Planificación de cobros
- **Análisis de Rechazos:** Estadísticas de solicitudes rechazadas
- **Estado de Cuenta:** Individual y consolidado

#### **Reportes Operativos:**
- **Listado de Cobros Diario:** Agenda de cobranza
- **Colocación vs Recuperación:** Análisis de flujo de caja
- **Reporte de Desembolsos:** Control de entregas
- **Reporte de Recuperación:** Detalle de pagos recibidos

#### **Reportes Financieros:**
- **Meta Cobranza:** Objetivos vs resultados
- **Reporte de Provisiones:** Clasificación CONAMI (A, B, C, D, E)
- **Historial de Arqueos:** Control de caja histórico

### **5. Arqueos de Caja**
- **Control diario:** Balance sistema vs físico
- **Denominaciones:** Conteo por billetes y monedas (NIO/USD)
- **Diferencias:** Registro de faltantes/sobrantes
- **Depósitos de clientes:** Control de efectivo recibido
- **Transferencias manuales:** Ajustes contables

### **6. Sistema de Auditoría**
- **Registro completo:** Todas las acciones sensibles
- **Trazabilidad:** Quién, cuándo, desde dónde, qué cambió
- **Tipos de entidad:** Cliente, crédito, usuario, pago, sistema
- **Retención:** Logs inmutables con IP y timestamp

---

## 🚀 **FASES DE MIGRACIÓN**

### **FASE 1: USUARIOS Y CLIENTES**
**Archivo:** `legacy-scripts/migration-scripts/migration-fase1.js`

**Proceso:**
1. **Preparación del esquema:** Añade columnas `legacyId` para trazabilidad
2. **Limpieza de tablas:** Trunca datos existentes (modo producción)
3. **Creación de sucursales:** León y Jinotepe por defecto
4. **Migración de usuarios:** Mapeo de roles del sistema legacy
5. **Migración de clientes:** Conversión de datos personales y geográficos
6. **Asignación inteligente de sucursales:** Basada en dirección y geografía
7. **Actualización de contadores:** Sincronización de secuencias

**Mapeos importantes:**
- **Sexo:** 0→Masculino, 1→Femenino
- **Estado civil:** 0→Soltero, 1→Casado, 2→Unión Libre, etc.
- **Roles:** 1→ADMINISTRADOR, 2→FINANZAS, 4→GESTOR

### **FASE 2: CRÉDITOS Y PLANES DE PAGO**
**Archivo:** `legacy-scripts/migration-scripts/migration-fase2.js`

**Proceso:**
1. **Migración de créditos:** Conversión de datos financieros
2. **Generación automática de planes de pago:** Usando algoritmo del sistema
3. **Asignación de gestores:** Mapeo de agentes a gestores
4. **Cálculo de fechas:** Primer pago, vencimiento, entrega
5. **Ajuste por feriados:** Consideración del calendario nicaragüense
6. **Estados de crédito:** Mapeo de estados legacy a nuevos

**Características del plan de pagos:**
- **Ajuste automático:** Evita fines de semana y feriados
- **Frecuencias soportadas:** Diario, Semanal, Catorcenal, Quincenal
- **Cálculo preciso:** Interés simple, cuotas niveladas
- **Balance decreciente:** Control de saldo pendiente

### **FASE 3: PAGOS HISTÓRICOS**
**Archivo:** `legacy-scripts/migration-scripts/migration-fase3.js`

**Proceso:**
1. **Migración por lotes:** Procesamiento de 50 pagos por vez
2. **Preservación de timestamps:** Mantiene fecha y hora exacta
3. **Generación de recibos:** Números de transacción automáticos
4. **Estados de pago:** Válido, Anulado
5. **Reconexión automática:** Manejo de timeouts de base de datos
6. **Trazabilidad completa:** Mapeo de usuarios que aplicaron pagos

### **SCRIPTS DE MANTENIMIENTO**

#### **Corrección de Contadores** (`fix-counters.js`)
- Sincroniza secuencias de clientes, créditos y recibos
- Evita duplicados en numeración
- Actualiza tabla `counters`

#### **Creación de Administrador** (`crear-admin.js`)
- Genera usuario administrador por defecto
- Credenciales: admin@credinica.com / admin123
- Asignación a sucursal principal

#### **Auditoría de IPs** (`add-ip-to-audit.js`)
- Añade columna `ipAddress` a tabla de auditoría
- Mejora trazabilidad de acciones

#### **Corrección de Datos** (`fix-*.js`)
- Reparación de fechas inconsistentes
- Corrección de claves foráneas
- Limpieza de montos nulos

---

## 🔧 **INSTALACIÓN Y CONFIGURACIÓN**

### **1. Requisitos del Sistema**
- **Node.js:** v18 LTS o superior
- **MySQL:** 8.0 (recomendado) o MariaDB compatible
- **Sistema Operativo:** Linux (Ubuntu/Debian para producción), Windows
- **Memoria RAM:** Mínimo 4GB, recomendado 8GB
- **Espacio en disco:** Mínimo 10GB para base de datos

### **2. Variables de Entorno**
```env
# Conexión a Base de Datos
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=tu_contraseña_segura
DB_NAME=credinica_prod
DB_PORT=3306

# Configuración de la App
NEXT_PUBLIC_APP_URL=https://tu-dominio.com
JWT_SECRET=tu_clave_secreta_para_tokens_jwt_muy_larga_y_segura
NODE_ENV=production

# Configuración Regional
TZ=America/Managua

# Base de Datos Legacy (para migración)
OLD_DB_HOST=localhost
OLD_DB_USER=legacy_user
OLD_DB_PASSWORD=legacy_password
OLD_DB_DATABASE=sistema_anterior
```

### **3. Instalación Paso a Paso**

#### **Opción A: Instalación Nueva**
```bash
# 1. Clonar repositorio
git clone [repositorio] credinic
cd credinic

# 2. Instalar dependencias
npm install

# 3. Crear base de datos
mysql -u root -p
CREATE DATABASE credinica_prod CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# 4. Importar estructura
mysql -u root -p credinica_prod < creacion\ base\ de\ datos.sql

# 5. Configurar variables de entorno
cp .env.example .env
# Editar .env con tus datos

# 6. Compilar y ejecutar
npm run build
npm start
```

#### **Opción B: Migración desde Sistema Legacy**
```bash
# 1-5. Seguir pasos de instalación nueva

# 6. Configurar variables de migración en .env
OLD_DB_HOST=servidor_anterior
OLD_DB_USER=usuario_anterior
# ... etc

# 7. Ejecutar migración en orden estricto
node legacy-scripts/migration-scripts/migration-fase1.js
node legacy-scripts/migration-scripts/migration-fase2.js
node legacy-scripts/migration-scripts/migration-fase3.js

# 8. Scripts de corrección
node legacy-scripts/migration-scripts/crear-admin.js
node legacy-scripts/migration-scripts/fix-counters.js
node legacy-scripts/migration-scripts/add-ip-to-audit.js

# 9. Verificar migración
node legacy-scripts/migration-scripts/verificar-migracion.js

# 10. Compilar y ejecutar
npm run build
npm start
```

### **4. Configuración de Producción**

#### **Nginx (Recomendado)**
```nginx
server {
    listen 80;
    server_name tu-dominio.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name tu-dominio.com;
    
    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

#### **PM2 (Gestor de Procesos)**
```bash
# Instalar PM2
npm install -g pm2

# Crear archivo ecosystem.config.js
module.exports = {
  apps: [{
    name: 'credinic',
    script: 'npm',
    args: 'start',
    cwd: '/path/to/credinic',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
};

# Iniciar aplicación
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

---

## 📱 **PROGRESSIVE WEB APP (PWA)**

### **Características PWA:**
- ✅ **Instalable:** En Android, iOS y Desktop
- ✅ **Offline:** Funciona sin internet para gestores
- ✅ **Notificaciones push:** Recordatorios y alertas
- ✅ **Experiencia nativa:** Pantalla completa, iconos
- ✅ **Actualizaciones automáticas:** Sin intervención del usuario
- ✅ **Cache inteligente:** Datos críticos siempre disponibles

### **Instalación en Dispositivos:**
- **Android:** Chrome → Menú → "Instalar aplicación"
- **iOS:** Safari → Compartir → "Agregar a pantalla de inicio"
- **Desktop:** Chrome/Edge → Barra de direcciones → Icono de instalación

### **Funcionalidad Offline:**
- **Gestores:** Pueden registrar pagos sin internet
- **Sincronización automática:** Al recuperar conexión
- **Cache de datos:** Clientes y créditos asignados
- **Indicador de estado:** Muestra conexión online/offline

---

## 🔒 **SEGURIDAD Y CUMPLIMIENTO**

### **Medidas de Seguridad:**
- **Autenticación JWT:** Tokens seguros con expiración
- **Cookies httpOnly:** Protección contra XSS
- **HTTPS obligatorio:** Cifrado en tránsito
- **Rate limiting:** Protección contra ataques de fuerza bruta
- **Validación de datos:** En frontend y backend
- **Sanitización:** Prevención de inyección SQL
- **Auditoría completa:** Registro de todas las acciones

### **Protección de Datos:**
- **Cédulas codificadas:** Base64 para datos sensibles
- **Logs inmutables:** Auditoría no modificable
- **Backup automático:** Respaldo diario de base de datos
- **Acceso por roles:** Principio de menor privilegio
- **Sesiones limitadas:** Expiración automática

### **Cumplimiento Regulatorio:**
- **CONAMI:** Clasificación de riesgo A, B, C, D, E
- **Provisiones:** Cálculo automático según normativa
- **Reportes regulatorios:** Formatos estándar
- **Trazabilidad:** Auditoría completa de operaciones

---

## 📈 **MONITOREO Y MANTENIMIENTO**

### **Endpoints de Salud:**
- `GET /api/health` - Estado general del sistema
- `GET /api/version` - Versión actual de la aplicación
- `GET /api/show-ip` - IP del cliente (debugging)

### **Logs del Sistema:**
- **Aplicación:** Logs de Next.js en `/var/log/credinic/`
- **Base de datos:** Logs de MySQL en `/var/log/mysql/`
- **Nginx:** Logs de acceso y errores
- **PM2:** Logs de proceso y errores

### **Backup y Recuperación:**
```bash
# Backup diario automático
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
mysqldump -u root -p credinica_prod > /backups/credinic_$DATE.sql
gzip /backups/credinic_$DATE.sql

# Limpiar backups antiguos (mantener 30 días)
find /backups -name "credinic_*.sql.gz" -mtime +30 -delete
```

### **Mantenimiento Preventivo:**
- **Actualización mensual:** Dependencias y parches de seguridad
- **Limpieza de logs:** Rotación automática cada 30 días
- **Optimización de BD:** Análisis y optimización de índices
- **Monitoreo de espacio:** Alertas de disco lleno
- **Pruebas de backup:** Verificación mensual de restauración

---

## 🎓 **CAPACITACIÓN DE USUARIOS**

### **Manual de Usuario por Rol:**

#### **Para Administradores:**
1. **Configuración inicial del sistema**
2. **Gestión de usuarios y sucursales**
3. **Configuración de feriados y parámetros**
4. **Interpretación de reportes financieros**
5. **Resolución de problemas técnicos**

#### **Para Gerentes:**
1. **Supervisión de operaciones diarias**
2. **Aprobación de créditos y anulaciones**
3. **Análisis de reportes de sucursal**
4. **Gestión de arqueos de caja**
5. **Control de cartera vencida**

#### **Para Gestores:**
1. **Uso de la aplicación móvil/PWA**
2. **Registro de clientes y créditos**
3. **Aplicación de pagos offline**
4. **Generación de recibos**
5. **Seguimiento de cartera asignada**

#### **Para Operativos:**
1. **Operaciones de ventanilla**
2. **Atención al cliente**
3. **Procesamiento de pagos**
4. **Arqueos de caja diarios**
5. **Generación de reportes básicos**

---

## 🔧 **SOLUCIÓN DE PROBLEMAS COMUNES**

### **Problemas de Conexión:**
```bash
# Verificar estado de servicios
systemctl status mysql
systemctl status nginx
pm2 status

# Reiniciar servicios
systemctl restart mysql
systemctl restart nginx
pm2 restart credinic
```

### **Problemas de Base de Datos:**
```sql
-- Verificar conexiones activas
SHOW PROCESSLIST;

-- Optimizar tablas
OPTIMIZE TABLE clients, credits, payments_registered;

-- Verificar integridad
CHECK TABLE clients, credits, payments_registered;
```

### **Problemas de Sincronización Offline:**
```javascript
// Limpiar cache del navegador
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(function(registrations) {
    for(let registration of registrations) {
      registration.unregister();
    }
  });
}

// Limpiar IndexedDB
indexedDB.deleteDatabase('CredinicOfflineDB');
```

---

## 📞 **SOPORTE TÉCNICO**

### **Contacto de Soporte:**
- **Desarrollador:** Ing. Harwin Manuel Rueda Herrera
- **Ubicación:** León, Nicaragua 🇳🇮
- **Especialidad:** Sistemas de gestión financiera

### **Niveles de Soporte:**
1. **Nivel 1:** Problemas de usuario y configuración básica
2. **Nivel 2:** Problemas técnicos y de base de datos
3. **Nivel 3:** Desarrollo de nuevas funcionalidades

### **Tiempo de Respuesta:**
- **Crítico:** 2 horas (sistema no funcional)
- **Alto:** 8 horas (funcionalidad limitada)
- **Medio:** 24 horas (problemas menores)
- **Bajo:** 72 horas (mejoras y consultas)

---

## 📋 **CHANGELOG Y VERSIONES**

### **Versión 1.0.0 - Inicial**
- ✅ Sistema completo de gestión de créditos
- ✅ PWA con funcionalidad offline
- ✅ Sistema de roles y permisos
- ✅ Reportes avanzados
- ✅ Migración desde sistema legacy
- ✅ Auditoría completa

### **Próximas Versiones:**
- **v1.1.0:** Integración con impresoras térmicas Bluetooth
- **v1.2.0:** App Android nativa
- **v1.3.0:** Dashboard ejecutivo con métricas avanzadas
- **v1.4.0:** API de integración con sistemas contables
- **v1.5.0:** Módulo de recursos humanos

---

## 📄 **LICENCIA Y DERECHOS**

**Sistema de Gestión Financiera CrediNic v1.0**

**© 2026 CrediNic - Todos los derechos reservados**

Este software es propiedad intelectual privada. Queda prohibida su distribución, modificación o comercialización no autorizada.

**Desarrollado por:**
**Ing. Harwin Manuel Rueda Herrera**
**León, Nicaragua 🇳🇮**

---

*Este documento constituye la documentación oficial completa del Sistema CrediNic. Para actualizaciones y soporte técnico, contactar al desarrollador.*

**Última actualización:** Febrero 2026
**Versión del documento:** 1.0