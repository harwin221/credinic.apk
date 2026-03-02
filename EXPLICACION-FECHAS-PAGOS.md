# 🔍 ANÁLISIS: Cómo Trabaja el Sistema con Fechas de Pagos

## 📊 PROBLEMA ACTUAL EN LA MIGRACIÓN

### Base de Datos Vieja:
- Tabla `abonos`: `fecha_abono` es tipo **DATE** (solo fecha, sin hora)
- Tabla `prestamo_coutas`: `fecha_pagado` es tipo **DATETIME** ← **TIENE LA HORA EXACTA**
- Tabla `prestamo_cuota_abono`: `created_at` es tipo **TIMESTAMP** ← **TIENE LA HORA EXACTA**

### Script de Migración Actual (Fase 3):
```javascript
// ❌ PROBLEMA: Usa payment.fecha_abono que NO tiene hora
const paymentDateTime = payment.fecha_abono; // Solo tiene fecha
```

**Resultado:** Todos los pagos migrados aparecen a las 12:00 AM porque `fecha_abono` no tiene hora.

---

## ✅ CÓMO DEBERÍA MIGRAR

### Opción 1: Usar `prestamo_cuota_abono.created_at`
```javascript
// Obtener la hora exacta del pago desde prestamo_cuota_abono
const [payments] = await oldDbConnection.execute(`
    SELECT 
        pca.abono_id,
        pca.created_at as fecha_hora_exacta,
        a.total_efectivo,
        a.prestamo_id,
        a.estado
    FROM prestamo_cuota_abono pca
    INNER JOIN abonos a ON a.id = pca.abono_id
    WHERE a.estado = 1
    GROUP BY pca.abono_id
`);

// Usar created_at que tiene la hora exacta
const paymentDateTime = payment.fecha_hora_exacta;
```

### Opción 2: Usar `prestamo_coutas.fecha_pagado`
```javascript
// Obtener la hora exacta desde prestamo_coutas
const [payments] = await oldDbConnection.execute(`
    SELECT 
        a.id,
        a.prestamo_id,
        a.total_efectivo,
        pc.fecha_pagado as fecha_hora_exacta,
        a.estado
    FROM abonos a
    INNER JOIN prestamo_cuota_abono pca ON pca.abono_id = a.id
    INNER JOIN prestamo_coutas pc ON pc.id = pca.prestamo_cuota_id
    WHERE a.estado = 1
    GROUP BY a.id
`);

// Usar fecha_pagado que tiene la hora exacta
const paymentDateTime = payment.fecha_hora_exacta;
```

---

## 🚀 CÓMO TRABAJA EL SISTEMA NUEVO AL REGISTRAR PAGOS

### 1. Frontend (Formulario de Pago)

**Archivo:** `src/app/credits/components/PaymentForm.tsx`

```typescript
// Al abrir el formulario, se inicializa con la fecha/hora actual
defaultValues: {
  amount: undefined,
  paymentDate: nowInNicaragua(), // ← Genera ISO string UTC
  paymentType: 'NORMAL',
  notes: ''
}
```

**Función `nowInNicaragua()`** (en `src/lib/date-utils.ts`):
```typescript
export const nowInNicaragua = (): string => {
    return new Date().toISOString(); // ← Devuelve UTC ISO string
};
```

**Ejemplo:**
- Usuario registra pago a las 3:45 PM hora Nicaragua
- `nowInNicaragua()` devuelve: `"2024-01-15T21:45:00.000Z"` (UTC)

---

### 2. Backend (Guardar en Base de Datos)

**Archivo:** `src/services/credit-service-server.ts`

```typescript
// Recibe paymentData.paymentDate como ISO string UTC
const paymentDateForDB = isoToMySQLDateTime(paymentData.paymentDate);

await query(
  'INSERT INTO payments_registered (..., paymentDate, ...) VALUES (...)',
  [..., paymentDateForDB, ...]
);
```

**Función `isoToMySQLDateTime()`** (en `src/lib/date-utils.ts`):
```typescript
export const isoToMySQLDateTime = (isoString: string): string => {
    const date = parseISO(isoString);
    // Formatea en UTC para MySQL
    return formatInTimeZone(date, 'UTC', 'yyyy-MM-dd HH:mm:ss');
};
```

**Proceso completo:**
1. Frontend: `"2024-01-15T21:45:00.000Z"` (ISO UTC)
2. Backend: `isoToMySQLDateTime()` convierte a `"2024-01-15 21:45:00"` (MySQL UTC)
3. MySQL: Guarda `2024-01-15 21:45:00` en la columna `paymentDate` (DATETIME)

---

### 3. Mostrar al Usuario (Leer de Base de Datos)

**Archivo:** `src/app/reports/account-statement/page.tsx`

```typescript
// Al mostrar el pago
<TableCell>
  {formatDateUtil(p.paymentDate, 'dd/MM/yy HH:mm')}
</TableCell>
```

**Función `formatDateForUser()`** (en `src/lib/date-utils.ts`):
```typescript
export const formatDateForUser = (
    dateInput: string | Date,
    formatString: string = 'dd/MM/yyyy'
): string => {
    // Si es formato MySQL con hora (YYYY-MM-DD HH:MM:SS)
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(dateString)) {
        // MySQL devuelve fechas en UTC, agregar Z para indicarlo
        dateString = dateString.replace(' ', 'T') + 'Z';
    }
    
    const date = parseISO(dateString);
    
    // Convertir de UTC a hora de Nicaragua y formatear
    return formatInTimeZone(date, NICARAGUA_TIMEZONE, formatString, { locale: es });
};
```

**Proceso completo:**
1. MySQL: `"2024-01-15 21:45:00"` (UTC)
2. Backend: Devuelve como string `"2024-01-15 21:45:00"`
3. Frontend: `formatDateForUser()` convierte a Nicaragua
4. Usuario ve: `"15/01/24 15:45"` (hora Nicaragua)

---

## 📝 RESUMEN DEL FLUJO COMPLETO

### Registrar Nuevo Pago (Post-Migración):

```
Usuario registra pago a las 3:45 PM (Nicaragua)
    ↓
Frontend: nowInNicaragua() → "2024-01-15T21:45:00.000Z" (UTC)
    ↓
Backend: isoToMySQLDateTime() → "2024-01-15 21:45:00" (MySQL UTC)
    ↓
MySQL: Guarda "2024-01-15 21:45:00" en paymentDate
    ↓
Frontend lee: "2024-01-15 21:45:00"
    ↓
formatDateForUser() → "15/01/2024 15:45:00" (Nicaragua)
    ↓
Usuario ve: "15/01/24 15:45" ✅
```

---

## ⚙️ CONFIGURACIÓN CLAVE

### MySQL Connection (src/lib/mysql.ts):
```typescript
{
  timezone: '+00:00', // UTC - Estándar ISO 8601
  dateStrings: false, // Convertir fechas a objetos Date de JavaScript
}
```

**¿Por qué UTC?**
- Estándar internacional
- Evita problemas de horario de verano
- Facilita conversiones entre zonas horarias
- La base de datos puede estar en cualquier parte del mundo

**¿Por qué `dateStrings: false`?**
- Permite que MySQL devuelva fechas como objetos Date
- Facilita el manejo de fechas en JavaScript
- Las funciones de conversión manejan correctamente los objetos Date

---

## 🎯 RECOMENDACIÓN FINAL

### Para la Migración:
```javascript
// Usar prestamo_cuota_abono.created_at para obtener hora exacta
const [payments] = await oldDbConnection.execute(`
    SELECT 
        pca.abono_id,
        pca.created_at as payment_datetime,
        a.total_efectivo,
        a.prestamo_id,
        a.created_user_id,
        a.estado
    FROM prestamo_cuota_abono pca
    INNER JOIN abonos a ON a.id = pca.abono_id
    WHERE a.estado = 1
    GROUP BY pca.abono_id
    ORDER BY pca.created_at
`);

// Usar la hora exacta
const paymentDateTime = payment.payment_datetime;
```

### Para Nuevos Pagos (Ya está correcto):
- ✅ Frontend usa `nowInNicaragua()` → ISO UTC
- ✅ Backend usa `isoToMySQLDateTime()` → MySQL UTC
- ✅ Frontend usa `formatDateForUser()` → Muestra en Nicaragua
- ✅ Todo funciona correctamente

---

## 🔧 CÓMO LO TRABAJARÍA YO

### 1. Corregir Script de Migración:
```javascript
// En migration-fase3.js
async function migratePayments(oldDbConnection, newDbConnection, creditMap, userClientMap) {
    console.log(`--- FASE 3: MIGRANDO PAGOS CON HORA EXACTA ---`);

    const userNameMap = await getUserNamesMap(newDbConnection);

    // ✅ USAR created_at de prestamo_cuota_abono para hora exacta
    const [payments] = await oldDbConnection.execute(`
        SELECT 
            pca.abono_id as id,
            a.prestamo_id,
            pca.created_at as fecha_hora_pago,
            a.total_efectivo,
            a.created_user_id,
            a.estado
        FROM prestamo_cuota_abono pca
        INNER JOIN abonos a ON a.id = pca.abono_id
        WHERE a.estado = 1
        GROUP BY pca.abono_id
        ORDER BY pca.created_at
    `);
    
    console.log(`  📊 Total de pagos a procesar: ${payments.length}`);

    for (const payment of payments) {
        const newCreditId = creditMap[payment.prestamo_id];
        if (!newCreditId) continue;

        const newId = `pay_${String(payment.id).padStart(6, '0')}`;
        const newUserId = userClientMap[payment.created_user_id] || userClientMap[1];
        const managedBy = userNameMap[newUserId] || "Administrador Sistema";
        const transactionNumber = `REC-${String(payment.id).padStart(6, '0')}`;

        // ✅ Usar fecha_hora_pago que tiene la hora exacta
        const paymentDateTime = payment.fecha_hora_pago;

        const sql = `INSERT INTO payments_registered 
            (id, legacyId, creditId, paymentDate, amount, managedBy, transactionNumber, status) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
            
        const values = [
            newId, 
            payment.id, 
            newCreditId, 
            paymentDateTime, // ← Hora exacta
            payment.total_efectivo, 
            managedBy, 
            transactionNumber,
            'valido'
        ];

        await newDbConnection.execute(sql, values);
    }
}
```

### 2. Mantener Sistema Actual (Ya está bien):
- No cambiar nada en el código actual
- El flujo de nuevos pagos ya funciona correctamente
- Solo corregir la migración

### 3. Verificar Después de Migrar:
```sql
-- Ver pagos con hora exacta
SELECT 
    id,
    creditId,
    DATE_FORMAT(paymentDate, '%Y-%m-%d %H:%i:%s') as fecha_hora,
    amount,
    managedBy
FROM payments_registered
ORDER BY paymentDate
LIMIT 10;
```

---

## ✅ CONCLUSIÓN

**Problema:** La migración usa `abonos.fecha_abono` (DATE sin hora)

**Solución:** Usar `prestamo_cuota_abono.created_at` (TIMESTAMP con hora exacta)

**Sistema Nuevo:** Ya funciona correctamente, no necesita cambios

**Resultado:** Después de re-migrar, todos los pagos tendrán su hora exacta preservada
