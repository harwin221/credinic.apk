# Modo Offline - CrediNica Mobile

## ¿Qué es el Modo Offline?

El modo offline permite a los gestores trabajar sin conexión a internet. Los pagos y solicitudes de crédito se guardan localmente en el teléfono y se sincronizan automáticamente cuando hay conexión.

## 🔐 Persistencia de Sesión

### ¿Necesito iniciar sesión cada vez que abro la app?

**NO.** La sesión se mantiene guardada en el teléfono incluso si:
- Cierras la app completamente
- Reinicias el teléfono
- No tienes conexión a internet
- Pasan varios días sin abrir la app

### ¿Cuándo necesito iniciar sesión nuevamente?

Solo en estos casos:
- Cuando presionas "Cerrar Sesión" manualmente
- Cuando desinstalas y vuelves a instalar la app
- Cuando borras los datos de la app desde configuración del teléfono

### ¿Por qué funciona así?

Esto es especialmente útil para gestores que trabajan en zonas sin señal:
- Pueden cerrar la app por error y volver a abrirla sin problemas
- No necesitan internet para volver a entrar
- Pueden trabajar offline sin interrupciones

### Ejemplo de Uso Real

**Escenario:** Un gestor está en una zona rural sin señal móvil.

1. **Día 1 - Con señal:**
   - Inicia sesión en la app
   - La sesión se guarda en el teléfono
   - Descarga su cartera de clientes

2. **Día 2 - Sin señal:**
   - Cierra la app por error
   - Vuelve a abrir la app
   - ✅ **Entra automáticamente** (no pide login)
   - Puede aplicar pagos offline
   - Los pagos se guardan localmente

3. **Día 3 - Con señal:**
   - Abre la app (sigue con sesión activa)
   - La app detecta conexión
   - Sincroniza automáticamente todos los pagos del Día 2
   - Descarga datos actualizados

## Características

### 1. Detección Automática de Conexión
- La app detecta automáticamente si hay o no internet
- Muestra un indicador visual del estado de conexión
- Cambia automáticamente entre modo online y offline

### 2. Almacenamiento Local
La app guarda en el teléfono:
- **Clientes**: Lista completa de clientes asignados
- **Créditos**: Cartera completa con detalles
- **Pagos Pendientes**: Pagos aplicados sin conexión
- **Solicitudes Pendientes**: Créditos creados sin conexión

### 3. Sincronización Automática
Cuando hay conexión, la app:
1. Envía todos los pagos pendientes al servidor
2. Envía todas las solicitudes de crédito pendientes
3. Descarga datos actualizados del servidor
4. Actualiza la información local

## Cómo Funciona

### Aplicar Pagos Offline

1. **Sin Conexión**:
   - El gestor aplica un pago normalmente
   - El pago se guarda en la base de datos local
   - Se muestra mensaje: "Pago guardado offline"
   - El pago queda marcado como "pendiente de sincronización"

2. **Con Conexión**:
   - La app detecta que hay internet
   - Envía automáticamente todos los pagos pendientes
   - Marca los pagos como sincronizados
   - Descarga datos actualizados

### Crear Créditos Offline

1. **Sin Conexión**:
   - El gestor crea una solicitud de crédito
   - La solicitud se guarda localmente
   - Se muestra mensaje: "Solicitud guardada offline"

2. **Con Conexión**:
   - La app sincroniza la solicitud con el servidor
   - La solicitud aparece en la web con estado "Pending"
   - El administrador puede aprobarla normalmente

### Indicador de Sincronización

En la parte superior de las pantallas principales verás:

- **🟢 Conectado** - Hay internet, todo sincronizado
- **🟠 Sincronizando...** - Enviando datos al servidor
- **🔴 Sin Conexión** - Modo offline activo
- **⚠️ Pendientes: X** - Hay X pagos/créditos sin sincronizar

### Sincronización Manual

Puedes forzar una sincronización:
1. Toca el indicador de sincronización
2. Presiona "Sincronizar Ahora"
3. La app intentará sincronizar todos los datos pendientes

## Base de Datos Local

La app usa SQLite para almacenar datos localmente:

### Tablas Creadas

1. **offline_clients** - Clientes descargados
2. **offline_credits** - Créditos descargados
3. **pending_payments** - Pagos pendientes de sincronizar
4. **pending_credits** - Solicitudes pendientes de sincronizar
5. **config** - Configuración (última sincronización, etc.)

### Ubicación

Los datos se guardan en:
```
/data/data/com.credinica.mobile/databases/credinica_offline.db
```

## Comparación con App Web

La app móvil usa la misma lógica que la app web:

| Característica | App Web | App Móvil |
|---------------|---------|-----------|
| Base de Datos | IndexedDB | SQLite |
| Detección de Conexión | navigator.onLine | fetch con timeout |
| Sincronización | Automática cada 30s | Automática + Manual |
| Almacenamiento | Navegador | Teléfono |

## Limitaciones

1. **Solo para Gestores**: El modo offline solo funciona para usuarios con rol de gestor
2. **Datos Limitados**: Solo se descargan los clientes y créditos asignados al gestor
3. **Sin Anulaciones Offline**: Las anulaciones de pago requieren conexión (necesitan autorización)
4. **Sin Reportes Offline**: Los reportes y estadísticas requieren conexión

## Solución de Problemas

### Los datos no se sincronizan

1. Verifica que tengas conexión a internet
2. Toca el indicador de sincronización
3. Presiona "Sincronizar Ahora"
4. Si el problema persiste, cierra y abre la app

### Error al aplicar pago offline

1. Verifica que el monto sea válido
2. Asegúrate de que el crédito esté en tu cartera
3. Revisa que haya espacio en el teléfono

### Datos desactualizados

1. Toca el indicador de sincronización
2. Presiona "Sincronizar Ahora"
3. Espera a que termine la sincronización
4. Refresca la pantalla deslizando hacia abajo

## Seguridad

- Los datos se guardan encriptados en el teléfono
- Solo el usuario autenticado puede acceder a sus datos
- Los pagos offline se validan en el servidor antes de aplicarse
- Las solicitudes offline requieren aprobación del administrador

## Próximas Mejoras

- [ ] Sincronización en segundo plano
- [ ] Notificaciones cuando se sincronicen datos
- [ ] Resolución automática de conflictos
- [ ] Modo offline para anulaciones (con aprobación posterior)
- [ ] Caché de imágenes y documentos
