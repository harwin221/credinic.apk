# 📊 ANÁLISIS DE MANEJO DE FECHAS Y ZONAS HORARIAS

## 🌍 CONFIGURACIÓN GENERAL

### Base de Datos MySQL
- **Timezone configurado**: `+00:00` (UTC)
- **dateStrings**: `false` (convierte a objetos Date de JavaScript)
- **Ubicación**: La base de datos está FUERA de Nicaragua

### Zona Horaria de la Aplicación
- **Zona horaria objetivo**: `America/Managua` (UTC-6)
- **Constante**: `NICARAGUA_TIMEZONE = 'America/Managua'`

---

## 📅 CÓMO SE GUARDAN LAS FECHAS

### 1. CRÉDITOS (credits table)

#### Fechas que se guardan con MEDIODÍA (12:00:00):
Estas son fechas que representan "días completos" sin hora específica:

```typescript
// Función usada: isoToMySQLDateTimeNoon()
- applicationDate      → YYYY-MM-DD 12:00:00
- approvalDate         → YYYY-MM-DD 12:00:00
- firstPaymentDate     → YYYY-MM-DD 12:00:00
- deliveryDate         → YYYY-MM-DD 12:00:00
- dueDate              → YYYY-MM-DD 12:00:00
```

**¿Por qué mediodía?**
- Evita problemas de zona horaria al convertir fechas
- Asegura que la fecha no cambie al convertir entre zonas horarias
- Ejemplo: Si guardas "2024-01-15 00:00:00" y conviertes a Nicaragua, podría mostrar "2024-01-14"

**Proceso de guardado:**
1. Usuario ingresa fecha: `2024-01-15`
2. Se convierte a: `2024-01-15T12:00:00.000Z` (mediodía UTC)
3. Se guarda en MySQL: `2024-01-15 12:00:00`
4. Al leer, se convierte a Nicaragua y sigue siendo: `2024-01-15`

---

### 2. PLAN DE PAGOS (payment_plan table)

```typescript
// Función usada: Concatenación directa con mediodía
paymentDate → YYYY-MM-DD 12:00:00
```

**Ejemplo de código:**
```typescript
await query(
  'INSERT INTO payment_plan (..., paymentDate, ...) VALUES (...)',
  [..., `${p.paymentDate} 12:00:00`, ...]
);
```

**Razón:**
- Las fechas de vencimiento son "días completos"
- No importa la hora exacta, solo el día
- Mediodía evita cambios de fecha al convertir zonas horarias

---

### 3. PAGOS DE CLIENTES (payments_registered table)

```typescript
// Función usada: isoToMySQLDateTime()
paymentDate → YYYY-MM-DD HH:MM:SS (hora EXACTA)
```

**¡CRÍTICO!** Los pagos SÍ necesitan la hora exacta:

**Proceso de guardado:**
1. Usuario registra pago a las 3:45 PM hora Nicaragua
2. Se convierte a UTC: `2024-01-15T21:45:00.000Z`
3. Se guarda en MySQL: `2024-01-15 21:45:00` (UTC)
4. Al leer, se convierte a Nicaragua: `2024-01-15 15:45:00`

**Código:**
```typescript
const paymentDateForDB = isoToMySQLDateTime(paymentData.paymentDate);
await query(
  'INSERT INTO payments_registered (..., paymentDate, ...) VALUES (...)',
  [..., paymentDateForDB, ...]
);
```

---

### 4. DÍAS FERIADOS (holidays table)

```typescript
// Función usada: isoToMySQLDateTimeNoon()
date → YYYY-MM-DD 12:00:00
```

**Ejemplo:**
```typescript
const formattedDate = isoToMySQLDateTimeNoon(holidayData.date);
await query(
  'INSERT INTO holidays (id, name, date) VALUES (?, ?, ?)',
  [newId, holidayData.name, formattedDate]
);
```

**Razón:**
- Los feriados son días completos, no momentos específicos
- Mediodía evita que el feriado "cambie de día" al convertir zonas horarias

---

## 🔄 FUNCIONES DE CONVERSIÓN

### Para GUARDAR en la base de datos:

#### `isoToMySQLDateTime(isoString)` - Para fechas con HORA EXACTA
```typescript
// Entrada: "2024-01-15T21:45:00.000Z" (ISO UTC)
// Salida:  "2024-01-15 21:45:00" (MySQL UTC)
// Uso: Pagos, auditoría, timestamps exactos
```

#### `isoToMySQLDateTimeNoon(isoString)` - Para fechas SIN HORA
```typescript
// Entrada: "2024-01-15" o "2024-01-15T21:45:00.000Z"
// Salida:  "2024-01-15 12:00:00" (MySQL UTC)
// Uso: Fechas de créditos, feriados, vencimientos
```

### Para MOSTRAR al usuario:

#### `formatDateForUser(dateInput, format)` - Convierte UTC a Nicaragua
```typescript
// Entrada: "2024-01-15 21:45:00" (MySQL UTC)
// Salida:  "15/01/2024" (Nicaragua)
// Proceso: UTC → Nicaragua → Formatear
```

#### `formatDateTimeForUser(dateInput)` - Con hora
```typescript
// Entrada: "2024-01-15 21:45:00" (MySQL UTC)
// Salida:  "15/01/2024 15:45:00" (Nicaragua)
// Proceso: UTC → Nicaragua → Formatear con hora
```

---

## ⚠️ PROBLEMAS POTENCIALES Y SOLUCIONES

### ❌ PROBLEMA 1: Fechas que "cambian de día"
**Causa:** Guardar fechas con hora 00:00:00 en UTC
```typescript
// MAL: "2024-01-15 00:00:00" UTC → "2024-01-14 18:00:00" Nicaragua
```

**Solución:** Usar mediodía (12:00:00)
```typescript
// BIEN: "2024-01-15 12:00:00" UTC → "2024-01-15 06:00:00" Nicaragua
// La fecha sigue siendo 15 de enero
```

### ❌ PROBLEMA 2: Perder la hora exacta de los pagos
**Causa:** Usar mediodía para pagos
```typescript
// MAL: Pago a las 3:45 PM → "2024-01-15 12:00:00"
```

**Solución:** Usar `isoToMySQLDateTime()` para pagos
```typescript
// BIEN: Pago a las 3:45 PM → "2024-01-15 21:45:00" UTC
```

### ❌ PROBLEMA 3: Conversión incorrecta al leer
**Causa:** No convertir de UTC a Nicaragua al mostrar
```typescript
// MAL: Mostrar "2024-01-15 21:45:00" directamente
```

**Solución:** Usar `formatDateForUser()` o `formatDateTimeForUser()`
```typescript
// BIEN: "2024-01-15 21:45:00" UTC → "15/01/2024 15:45:00" Nicaragua
```

---

## ✅ RESUMEN DE BUENAS PRÁCTICAS

### 1. En la Base de Datos (MySQL)
- ✅ Configurar timezone: `+00:00` (UTC)
- ✅ Guardar TODO en UTC
- ✅ Usar DATETIME, no DATE (para evitar problemas de zona horaria)

### 2. Al Guardar Fechas
- ✅ Fechas sin hora (créditos, feriados, plan de pago): `isoToMySQLDateTimeNoon()` → 12:00:00
- ✅ Fechas con hora (pagos, auditoría): `isoToMySQLDateTime()` → hora exacta

### 3. Al Leer Fechas
- ✅ Siempre convertir de UTC a Nicaragua: `formatDateForUser()`
- ✅ Para fechas con hora: `formatDateTimeForUser()`
- ✅ Para comparaciones: usar `toNicaraguaTime()`

### 4. En el Frontend
- ✅ Mostrar fechas en hora de Nicaragua
- ✅ Usar `formatDateForUser()` para mostrar
- ✅ Usar `userInputToISO()` para enviar al servidor

---

## 🔍 VERIFICACIÓN ACTUAL

### Estado de la Migración:
- ✅ Créditos: Usando mediodía correctamente
- ✅ Plan de pagos: Usando mediodía correctamente
- ✅ Feriados: Usando mediodía correctamente
- ⚠️ Pagos: Verificar que se mantenga la hora exacta (NO mediodía)

### Código de Migración Fase 3:
```javascript
// ✅ CORRECTO: Nicaragua LOCAL → UTC (Suma 6 horas)
// La fecha viene de la base vieja en hora local de Nicaragua.
// Se debe convertir a UTC para que el sistema nuevo la lea bien.
const utcDate = toDate(sourceDate, { timeZone: 'America/Managua' });
const paymentDateTime = formatInTimeZone(utcDate, 'UTC', 'yyyy-MM-dd HH:mm:ss');
```

---

## 📝 RECOMENDACIONES

1. **NUNCA** usar `dateStrings: true` en MySQL
   - Causa problemas de conversión
   - Dificulta el manejo de zonas horarias

2. **SIEMPRE** guardar en UTC
   - La base de datos debe estar en UTC
   - Convertir a Nicaragua solo al mostrar

3. **USAR mediodía para fechas sin hora**
   - Evita cambios de fecha al convertir zonas horarias
   - Aplicar a: créditos, feriados, plan de pagos

4. **MANTENER hora exacta para eventos**
   - Pagos, auditoría, logs
   - Usar `isoToMySQLDateTime()`

5. **CONVERTIR al mostrar**
   - Siempre usar `formatDateForUser()` o `formatDateTimeForUser()`
   - Nunca mostrar fechas UTC directamente al usuario
