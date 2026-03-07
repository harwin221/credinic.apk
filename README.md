# 📋 SISTEMA DE GESTIÓN FINANCIERA CREDINICA
## Manual Completo de Migración Actualizado (Marzo 2026)

---

## 🎯 **DESCRIPCIÓN DEL SISTEMA**

**CrediNica** es un sistema integral de gestión de microfinanzas desarrollado como Progressive Web App (PWA) con capacidades offline para gestores de campo. El sistema está diseñado específicamente para operar bajo las regulaciones y prácticas del mercado financiero nicaragüense.

### **Características Principales:**
- ✅ **Gestión completa de clientes y créditos**
- ✅ **Cálculo automático de planes de pago con múltiples frecuencias**
- ✅ **Reportes financieros y operativos avanzados**
- ✅ **Manejo consistente de fechas en Nicaragua (UTC-6)**
- ✅ **Generación de recibos PDF con firma digital**
- ✅ **Arqueos de caja por usuario y sucursal**

---

## 🚀 **FASES DE MIGRACIÓN (EJECUCIÓN MANUAL)**

Para garantizar la integridad total de los datos (especialmente las fechas de pagos), la migración se realiza en 3 fases secuenciales desde la base de datos legacy:

### **FASE 1: USUARIOS Y CLIENTES**
**Archivo:** `legacy-scripts/migration-scripts/migration-fase1.js`
- Crea sucursales (León, Jinotepe).
- Migra usuarios y asigna roles (ADMIN, GERENTE, GESTOR, etc.).
- Migra clientes y genera `translation-map.json`.

### **FASE 2: CRÉDITOS Y PLANES DE PAGO**
**Archivo:** `legacy-scripts/migration-scripts/migration-fase2.js`
- Migra créditos activos, pagados y aprobados.
- Genera los planes de pago automáticos respetando feriados de Nicaragua.
- Crea el mapa de relación `credit-map.json`.

### **FASE 3: PAGOS (ABONOS)**
**Archivo:** `legacy-scripts/migration-scripts/migration-fase3.js`
- **Fuente de Verdad**: Lee directamente de la tabla `abonos`.
- **Integridad Temporal**: Utiliza `created_at` (UTC) para preservar la hora exacta del pago original.
- **Sincronización**: Actualiza el contador de recibos para que el sistema continúe la numeración actual.

---

## 🔧 **GUÍA DE INSTALACIÓN RÁPIDA**

1. **Dependencias:** `npm install`
2. **Configuración:** Completar el archivo `.env` con las credenciales de la base de datos vieja (`OLD_DB_*`) y la nueva (`DB_*`).
3. **Ejecución de Migración:**
   ```bash
   node legacy-scripts/migration-scripts/migration-fase1.js
   node legacy-scripts/migration-scripts/migration-fase2.js
   node legacy-scripts/migration-scripts/migration-fase3.js
   ```
4. **Desarrollo:** `npm run dev`
5. **Producción:** `npm run build && npm start`

---

## 📞 **SOPORTE Y DESARROLLO**

**© 2026 CrediNica - Todos los derechos reservados**
**León, Nicaragua 🇳🇮**

**Última actualización:** 6 de Marzo, 2026
**Versión de Proyecto:** 1.0.2 (Sincronización de Tiempos y Diseño Compacto)