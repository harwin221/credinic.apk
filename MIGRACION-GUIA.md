# 🚀 GUÍA DE MIGRACIÓN - BASE VIEJA → BASE NUEVA

## 📋 CAMBIOS IMPLEMENTADOS

### ✅ Optimizaciones Realizadas

1. **Conversión Correcta de Zonas Horarias con date-fns-tz**
   - Los pagos ahora se convierten correctamente de hora Nicaragua → UTC
   - Eliminado el problema de las "6 horas" en la migración
   - Uso explícito de `zonedTimeToUtc` para conversiones precisas

2. **Migración Más Rápida**
   - **Fase 2 (Créditos)**: Procesamiento en lotes de 100 créditos
   - **Fase 3 (Pagos)**: Procesamiento en lotes de 500 pagos (antes 200)
   - Inserción de planes de pago en una sola query (antes era una por cuota)
   - Eliminadas pausas innecesarias entre lotes

3. **MySQL Más Predecible**
   - Cambiado `dateStrings: false` → `dateStrings: true`
   - MySQL ahora devuelve fechas como strings (más predecible)
   - Eliminada ambigüedad de Date objects

4. **Closure Service Mejorado**
   - Uso explícito de zona horaria Nicaragua
   - No depende de la zona horaria del servidor

---

## 🎯 CÓMO EJECUTAR LA MIGRACIÓN

### Opción 1: Migración Completa (Recomendado)

```bash
npm run migrate
```

Este comando ejecuta las 3 fases automáticamente y muestra un resumen al final.

### Opción 2: Migración por Fases (Para debugging)

```bash
# Fase 1: Usuarios y Clientes
npm run migrate:fase1

# Fase 2: Créditos y Planes de Pago
npm run migrate:fase2

# Fase 3: Pagos
npm run migrate:fase3
```

---

## ⚙️ CONFIGURACIÓN PREVIA

### 1. Archivo .env

Asegúrate de tener configuradas las credenciales de ambas bases de datos:

```env
# Base de datos VIEJA (origen)
OLD_DB_HOST=tu_host_viejo
OLD_DB_USER=tu_usuario_viejo
OLD_DB_PASSWORD=tu_password_viejo
OLD_DB_DATABASE=nombre_db_vieja

# Base de datos NUEVA (destino)
NEW_DB_HOST=tu_host_nuevo
NEW_DB_USER=tu_usuario_nuevo
NEW_DB_PASSWORD=tu_password_nuevo
NEW_DB_DATABASE=nombre_db_nueva
```

### 2. Dependencias

Asegúrate de tener instaladas las dependencias:

```bash
npm install
```

---

## 📊 QUÉ HACE CADA FASE

### Fase 1: Usuarios y Clientes
- Migra usuarios del sistema (ADMINISTRADOR, FINANZAS, GESTOR)
- Migra clientes con su información geográfica
- Crea sucursales (León y Jinotepe)
- Asigna clientes a sucursales inteligentemente
- Genera: `translation-map.json`

### Fase 2: Créditos y Planes de Pago
- Migra créditos con todas sus propiedades
- Genera planes de pago automáticamente
- Respeta feriados para ajustar fechas
- Usa mediodía (12:00:00) para fechas sin hora específica
- Genera: `credit-map.json`

### Fase 3: Pagos
- Migra pagos con conversión correcta Nicaragua → UTC
- Usa `zonedTimeToUtc` de date-fns-tz
- Preserva la hora exacta de cada pago
- Procesamiento en lotes de 500 para máxima velocidad

---

## 🔍 VERIFICACIÓN POST-MIGRACIÓN

### 1. Verificar Contadores

```sql
SELECT * FROM counters WHERE id = 'main';
```

Deberías ver:
- `clientNumber`: Cantidad de clientes migrados
- `creditNumber`: Cantidad de créditos migrados
- `reciboNumber`: Cantidad de pagos migrados

### 2. Verificar Fechas de Pagos

```sql
SELECT 
    id,
    creditId,
    paymentDate,
    amount,
    managedBy
FROM payments_registered
ORDER BY paymentDate DESC
LIMIT 10;
```

Las fechas deben estar en UTC (6 horas más que Nicaragua).

**Ejemplo:**
- Pago registrado en Nicaragua: 15:45 (3:45 PM)
- Guardado en MySQL: 21:45 (9:45 PM UTC)
- Frontend mostrará: 15:45 (3:45 PM Nicaragua) ✅

### 3. Verificar Créditos

```sql
SELECT 
    creditNumber,
    clientName,
    deliveryDate,
    firstPaymentDate,
    dueDate,
    status
FROM credits
LIMIT 10;
```

Todas las fechas deben tener hora 12:00:00 (mediodía).

### 4. Verificar Plan de Pagos

```sql
SELECT 
    creditId,
    paymentNumber,
    paymentDate,
    amount
FROM payment_plan
WHERE creditId = 'cred_001'
ORDER BY paymentNumber;
```

Todas las fechas deben tener hora 12:00:00 (mediodía).

---

## ⚠️ SOLUCIÓN DE PROBLEMAS

### Error: "No se encontró translation-map.json"

**Causa:** La Fase 1 no se completó correctamente.

**Solución:**
```bash
npm run migrate:fase1
```

### Error: "No se encontró credit-map.json"

**Causa:** La Fase 2 no se completó correctamente.

**Solución:**
```bash
npm run migrate:fase2
```

### Error: "Connection refused" o "Access denied"

**Causa:** Credenciales incorrectas en .env

**Solución:**
1. Verifica las credenciales en .env
2. Asegúrate de que las bases de datos estén accesibles
3. Prueba la conexión manualmente

### Migración muy lenta

**Causa:** Conexión lenta a la base de datos

**Solución:**
- Ejecuta la migración desde un servidor cercano a las bases de datos
- Verifica la velocidad de tu conexión a internet
- Considera aumentar `connectionLimit` en los scripts

---

## 📈 RENDIMIENTO ESPERADO

Con las optimizaciones implementadas:

- **Fase 1**: ~30 segundos (depende de cantidad de usuarios/clientes)
- **Fase 2**: ~2-5 minutos (depende de cantidad de créditos)
- **Fase 3**: ~3-8 minutos (depende de cantidad de pagos)

**Total estimado:** 5-15 minutos para una base de datos mediana.

---

## 🎉 DESPUÉS DE LA MIGRACIÓN

1. **Verifica los datos** usando las queries de verificación arriba
2. **Inicia tu aplicación**: `npm run dev`
3. **Prueba el login** con un usuario migrado
4. **Verifica que las fechas se muestren correctamente** en el frontend
5. **Prueba registrar un nuevo pago** para confirmar que funciona

---

## 📝 NOTAS IMPORTANTES

### Sobre las Fechas

- **Créditos, Planes de Pago, Feriados**: Usan mediodía (12:00:00)
  - Esto evita problemas de "un día antes/después" al convertir zonas horarias
  - Siempre mostrarán el mismo día sin importar la zona horaria

- **Pagos**: Usan hora exacta
  - Se guardan en UTC
  - Se muestran en hora Nicaragua
  - Preservan la hora exacta del pago

### Sobre las Sucursales

La migración asigna clientes a sucursales inteligentemente:
- Si la dirección, departamento o municipio contiene "León" → Sucursal León
- Caso contrario → Sucursal Jinotepe

Puedes ajustar esto manualmente después de la migración si es necesario.

### Sobre los Gestores

Los gestores se asignan automáticamente basándose en:
- El campo `agente_id` de la base vieja
- Si no existe, se asigna "Administrador Administrador"

---

## 🆘 SOPORTE

Si encuentras problemas durante la migración:

1. Revisa los logs en la consola
2. Verifica las credenciales en .env
3. Ejecuta las fases individualmente para identificar el problema
4. Revisa las queries de verificación para confirmar los datos

---

## ✅ CHECKLIST POST-MIGRACIÓN

- [ ] Contadores actualizados correctamente
- [ ] Fechas de pagos en UTC (6 horas más que Nicaragua)
- [ ] Fechas de créditos con mediodía (12:00:00)
- [ ] Plan de pagos generado para todos los créditos
- [ ] Clientes asignados a sucursales
- [ ] Usuarios migrados con roles correctos
- [ ] Aplicación inicia sin errores
- [ ] Login funciona correctamente
- [ ] Fechas se muestran correctamente en el frontend
- [ ] Nuevo pago se registra correctamente

---

¡Migración exitosa! 🎉
