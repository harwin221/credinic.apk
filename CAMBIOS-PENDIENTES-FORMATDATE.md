# 🔧 CAMBIOS PENDIENTES: Conversión de Zona Horaria en formatDate

## ⚠️ PROBLEMA ENCONTRADO

Varios componentes usan `format(parseISO())` para mostrar fechas con hora, pero **NO convierten de UTC a Nicaragua**.

Esto significa que las horas se muestran en UTC en lugar de hora Nicaragua.

---

## 📝 ARCHIVOS QUE NECESITAN CORRECCIÓN

### 1. ✅ YA CORREGIDO: `src/app/dashboard/components/AdminDashboard.tsx`

**Cambio realizado:**
```typescript
// ❌ ANTES
import { format, parseISO } from 'date-fns';
const formatDate = (dateString?: string) => {
    return format(parseISO(dateString), "dd/MM/yyyy, h:mm a", { locale: es });
};

// ✅ DESPUÉS
import { formatInTimeZone } from 'date-fns-tz';
const formatDate = (dateString?: string) => {
    return formatInTimeZone(parseISO(dateString), 'America/Managua', "dd/MM/yyyy, h:mm a", { locale: es });
};
```

---

### 2. ⚠️ PENDIENTE: `src/app/reports/payments-detail/page.tsx`

**Línea 21:**
```typescript
// ❌ ACTUAL
const formatDate = (dateString?: string) => {
  if (!dateString) return 'N/A';
  const dateToFormat = /^\d{4}-\d{2}-\d{2}$/.test(dateString) ? dateString + 'T12:00:00' : dateString;
  return format(parseISO(dateToFormat), 'dd/MM/yyyy HH:mm', { locale: es });
};

// ✅ CAMBIAR A
import { formatInTimeZone } from 'date-fns-tz';

const formatDate = (dateString?: string) => {
  if (!dateString) return 'N/A';
  try {
    const dateToFormat = /^\d{4}-\d{2}-\d{2}$/.test(dateString) ? dateString + 'T12:00:00Z' : dateString;
    return formatInTimeZone(dateToFormat, 'America/Managua', 'dd/MM/yyyy HH:mm', { locale: es });
  } catch (e) {
    return 'Fecha Inválida';
  }
};
```

**Agregar import:**
```typescript
import { formatInTimeZone } from 'date-fns-tz';
```

---

### 3. ⚠️ PENDIENTE: `src/app/reports/payments/page.tsx`

**Línea 22:**
```typescript
// ❌ ACTUAL
const formatDate = (dateString?: string) => {
  if (!dateString) return 'N/A';
  const dateToFormat = /^\d{4}-\d{2}-\d{2}$/.test(dateString) ? dateString + 'T12:00:00' : dateString;
  return format(parseISO(dateToFormat), 'dd/MM/yyyy HH:mm', { locale: es });
};

// ✅ CAMBIAR A
import { formatInTimeZone } from 'date-fns-tz';

const formatDate = (dateString?: string) => {
  if (!dateString) return 'N/A';
  try {
    const dateToFormat = /^\d{4}-\d{2}-\d{2}$/.test(dateString) ? dateString + 'T12:00:00Z' : dateString;
    return formatInTimeZone(dateToFormat, 'America/Managua', 'dd/MM/yyyy HH:mm', { locale: es });
  } catch (e) {
    return 'Fecha Inválida';
  }
};
```

**Agregar import:**
```typescript
import { formatInTimeZone } from 'date-fns-tz';
```

---

### 4. ⚠️ PENDIENTE: `src/app/reports/closures-history/components/ClosureDetailDialog.tsx`

**Línea 22:**
```typescript
// ❌ ACTUAL
const formatDateTime = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
        return format(parseISO(dateString), 'dd/MM/yyyy HH:mm:ss', { locale: es });
    } catch {
        return 'Fecha Inválida';
    }
};

// ✅ CAMBIAR A
import { formatInTimeZone } from 'date-fns-tz';

const formatDateTime = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
        return formatInTimeZone(dateString, 'America/Managua', 'dd/MM/yyyy HH:mm:ss', { locale: es });
    } catch {
        return 'Fecha Inválida';
    }
};
```

**Agregar import:**
```typescript
import { formatInTimeZone } from 'date-fns-tz';
```

---

### 5. ⚠️ PENDIENTE: `src/components/clients/Interactions.tsx`

**Línea 82:**
```typescript
// ❌ ACTUAL
<p className="text-muted-foreground">{format(parseISO(interaction.date), 'dd MMM yy, HH:mm', { locale: es })}</p>

// ✅ CAMBIAR A
import { formatInTimeZone } from 'date-fns-tz';

<p className="text-muted-foreground">{formatInTimeZone(interaction.date, 'America/Managua', 'dd MMM yy, HH:mm', { locale: es })}</p>
```

**Agregar import:**
```typescript
import { formatInTimeZone } from 'date-fns-tz';
```

---

## 🎯 RESUMEN

### Archivos a modificar:
1. ✅ `src/app/dashboard/components/AdminDashboard.tsx` - **YA CORREGIDO**
2. ⚠️ `src/app/reports/payments-detail/page.tsx` - **PENDIENTE**
3. ⚠️ `src/app/reports/payments/page.tsx` - **PENDIENTE**
4. ⚠️ `src/app/reports/closures-history/components/ClosureDetailDialog.tsx` - **PENDIENTE**
5. ⚠️ `src/components/clients/Interactions.tsx` - **PENDIENTE**

### Patrón de cambio:
```typescript
// ❌ ANTES
format(parseISO(dateString), formatString, { locale: es })

// ✅ DESPUÉS
formatInTimeZone(dateString, 'America/Managua', formatString, { locale: es })
```

### Import necesario:
```typescript
import { formatInTimeZone } from 'date-fns-tz';
```

---

## ✅ DESPUÉS DE ESTOS CAMBIOS:

- Todas las fechas con hora se mostrarán en hora Nicaragua
- Los pagos migrados mostrarán la hora correcta
- Los reportes mostrarán horas correctas
- El dashboard mostrará "Última Cuota" con hora Nicaragua correcta

---

## 🚀 PRÓXIMOS PASOS:

1. Aplicar los 4 cambios pendientes manualmente
2. Ejecutar la migración con `npm run migrate`
3. Verificar que las horas se muestren correctamente en:
   - Dashboard Admin (Última Cuota)
   - Reporte de Pagos Detallado
   - Reporte de Pagos
   - Historial de Cierres
   - Interacciones de Clientes

---

¿Quieres que aplique estos cambios ahora?
