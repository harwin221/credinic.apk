# 📋 INSTRUCCIONES DE MIGRACIÓN - CREDINIC

## 🎯 Pasos para Ejecutar la Migración Completa

### **Requisitos Previos:**
1. Tener Node.js instalado
2. Tener acceso a las bases de datos (vieja y nueva)
3. Verificar que el archivo `.env` tenga las credenciales correctas

---

## 🚀 COMANDOS DE MIGRACIÓN (Ejecutar en orden)

### **Paso 1: Migración Fase 1 - Usuarios y Clientes**
```bash
node legacy-scripts/migration-scripts/migration-fase1.js
```
**Resultado esperado:**
- Migra usuarios del sistema
- Migra clientes
- Crea sucursales
- Genera archivo `translation-map.json`

---

### **Paso 2: Migración Fase 2 - Créditos**
```bash
node legacy-scripts/migration-scripts/migration-fase2.js
```
**Resultado esperado:**
- Migra todos los créditos
- Genera planes de pago
- Genera archivo `credit-map.json`

---

### **Paso 3: Migración Fase 3 - Pagos (Abonos)**
```bash
node legacy-scripts/migration-scripts/migration-fase3.js
```
**Resultado esperado:**
- Migra todos los pagos/abonos
- Usa `created_at` para mantener la hora exacta del pago
- Convierte de hora Nicaragua a UTC

---

### **Paso 4: Crear Usuario Administrador**
```bash
node legacy-scripts/migration-scripts/crear-admin.js
```
**Resultado esperado:**
- Crea o actualiza el usuario administrador
- Username: `admin`
- Contraseña: `Leon123`

---

### **Paso 5: Verificar Migración**
```bash
node legacy-scripts/migration-scripts/verificar-migracion.js
```
**Resultado esperado:**
- Muestra resumen de datos migrados
- Verifica que todo se haya migrado correctamente

---

## 📊 RESUMEN DE DATOS ESPERADOS

Después de la migración completa deberías ver:
- ✅ Usuarios migrados
- ✅ Clientes migrados
- ✅ Créditos migrados
- ✅ Pagos migrados con hora exacta
- ✅ 2 Sucursales (León y Jinotepe)
- ✅ Usuario administrador creado

---

## ⚠️ NOTAS IMPORTANTES

1. **Ejecutar en orden**: Los pasos deben ejecutarse en el orden indicado (Fase 1 → Fase 2 → Fase 3 → Admin → Verificar)
2. **No interrumpir**: Dejar que cada script termine completamente
3. **Verificar errores**: Si hay errores, revisar antes de continuar
4. **Usuario Admin al final**: El script de crear-admin.js se ejecuta AL FINAL porque la Fase 1 ya migra los usuarios
5. **Hora de pagos**: Los pagos ahora se migran con la hora EXACTA usando `created_at`
6. **Zona horaria**: Las fechas se convierten automáticamente de Nicaragua a UTC

---

## 🔧 SOLUCIÓN DE PROBLEMAS

### Si hay error de conexión a la base de datos:
- Verificar credenciales en el archivo `.env`
- Verificar que las bases de datos estén accesibles

### Si falla alguna fase:
- Revisar el mensaje de error
- Verificar que la fase anterior se completó correctamente
- Consultar con el equipo de desarrollo

---

## 📞 CONTACTO

Si tienes problemas durante la migración, contacta al equipo de desarrollo.

---

**Desarrollado por:**
**Ing. Harwin Manuel Rueda Herrera**
**León, Nicaragua 🇳🇮**
