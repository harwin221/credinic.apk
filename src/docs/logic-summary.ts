
/**
 * =================================================================
 * RESUMEN DE LA LÓGICA DE NEGOCIO Y FLUJOS DE TRABAJO - CREDINICA
 * =================================================================
 *
 * Este archivo consolida la lógica de negocio principal de la aplicación
 * y describe los flujos de trabajo en un formato claro y legible.
 * NO es un archivo funcional, sino un documento de referencia.
 *
 */

// =================================================================
// 1. CÁLCULO Y ESTRUCTURA DE CRÉDITOS
// =================================================================

/**
 * 1.1. Generación del Plan de Pagos
 * ---------------------------------
 * Este es el corazón del sistema de créditos. Cuando se crea o simula un crédito,
 * se ejecuta el siguiente flujo para determinar cada una de las cuotas.
 *
 * Flujo de Trabajo:
 * 1.  **Recepción de Datos:** Se reciben los argumentos clave:
 *     - `monto_del_prestamo`: La cantidad de dinero que se entrega al cliente.
 *     - `tasa_interes_mensual`: El porcentaje de interés que se aplica cada mes (ej. 5 para 5%).
 *     - `plazo_en_meses`: El número total de meses para pagar el crédito.
 *     - `frecuencia_de_pago`: La periodicidad con la que el cliente debe pagar.
 *     - `fecha_de_inicio`: La fecha de la primera cuota.
 *     - `dias_feriados`: Un listado de fechas que no se consideran días hábiles.
 *
 * 2.  **Cálculo de Cuotas y Totales:**
 *     a. **Número de Cuotas:** Se determina cuántas cuotas tendrá el crédito basado en la frecuencia:
 *        - **Diario:** `plazo_en_meses * 20` (asumiendo 20 días laborables al mes).
 *        - **Semanal:** `plazo_en_meses * 4`.
 *        - **Catorcenal:** `plazo_en_meses * 2`.
 *        - **Quincenal:** `plazo_en_meses * 2`.
 *     b. **Interés Total:** Se calcula el interés total a pagar durante la vida del crédito:
 *        `interes_total = monto_del_prestamo * (tasa_interes_mensual / 100) * plazo_en_meses`.
 *     c. **Monto Total a Pagar:** `monto_total = monto_del_prestamo + interes_total`.
 *     d. **Cuota Periódica Fija:** Se calcula el valor de cada cuota individual:
 *        `cuota_periodica = monto_total / numero_de_cuotas`.
 *
 * 3.  **Generación de cada Cuota (Iteración):**
 *     - Se inicia un bucle desde 1 hasta el `numero_de_cuotas`.
 *     - Para cada iteración, se parte de la `fecha_de_inicio` teórica.
 *     - **Ajuste de Fecha de Pago:** La fecha teórica se ajusta para que no caiga en fin de semana o feriado, siguiendo estas reglas:
 *       - Si la fecha cae en **Domingo**, se mueve al Lunes siguiente.
 *       - Si la fecha cae en **Sábado** y la frecuencia es **Diaria**, se mueve al Lunes siguiente. Para otras frecuencias, el Sábado es válido.
 *       - Si la fecha (ya ajustada por fin de semana) cae en un **día feriado**, se mueve al día siguiente.
 *       - Este proceso se repite hasta que la fecha sea un día hábil válido.
 *     - Se crea el registro de la cuota con su número, la fecha de pago ya ajustada, el monto (que es la `cuota_periodica`), y el saldo restante.
 *     - Se calcula la fecha de la siguiente cuota teórica (sumando 1 día, 7 días, 14 días o 15 días según la frecuencia) y se repite el ciclo.
 *
 * 4.  **Resultado Final:** La función devuelve un objeto con la `cuota_periodica` y el listado completo de todas las cuotas calculadas (el plan de pagos).
 */

/**
 * 1.2. Cálculo del Estado Actual de un Crédito
 * -------------------------------------------
 * Esta lógica determina la "salud" de un crédito en un momento dado (generalmente, "hoy").
 *
 * Flujo de Trabajo:
 * 1.  **Filtrar Pagos Válidos:** Se toman todos los abonos registrados al crédito y se descartan aquellos marcados como 'ANULADO'.
 *
 * 2.  **Calcular Saldo Pendiente:** Se resta el total de los pagos válidos al `monto_total` del crédito.
 *
 * 3.  **Identificar Pagos Vencidos (Mora):**
 *     a. Se identifican todas las cuotas del plan de pagos cuya `fecha_de_pago` es **anterior** a la fecha actual.
 *     b. Se suman los montos de todas esas cuotas vencidas. Esto representa el **monto que ya debería haberse pagado**.
 *     c. Se identifican todos los abonos realizados por el cliente con fecha **anterior** a la fecha actual.
 *     d. El **Monto en Mora** se calcula restando el total de abonos anteriores del total que se debía haber pagado anteriormente:
 *        `monto_en_mora = monto_de_cuotas_vencidas - monto_de_abonos_anteriores`.
 *
 * 4.  **Calcular Días de Atraso:**
 *     - Si el `monto_en_mora` es mayor que cero, el sistema busca la **primera cuota del plan que no ha sido cubierta** por los pagos.
 *     - La diferencia en días entre la fecha actual y la `fecha_de_pago` de esa primera cuota no pagada determina los **Días de Atraso**.
 *
 * 5.  **Clasificación de Riesgo (CONAMI):**
 *     - Basado en los `dias_de_atraso`, el crédito se clasifica en una categoría de riesgo:
 *       - **Categoría A (Riesgo Normal):** 1 a 15 días de atraso.
 *       - **Categoría B (Riesgo Potencial):** 16 a 30 días de atraso.
 *       - **Categoría C (Riesgo Real):** 31 a 60 días de atraso.
 *       - **Categoría D (Dudosa Recuperación):** 61 a 90 días de atraso.
 *       - **Categoría E (Irrecuperable):** Más de 90 días de atraso.
 *
 * 6.  **Resultado Final:** Se devuelve un objeto con todos estos detalles: saldo pendiente, monto en mora, días de atraso, categoría de riesgo, etc.
 */


// =================================================================
// 2. FLUJOS DE TRABAJO DE OPERACIONES (CRUD)
// =================================================================

/**
 * 2.1. Flujo para Crear un Cliente Nuevo
 * --------------------------------------
 * 1.  **Obtener Número de Cliente:** Se solicita un número secuencial único a la base de datos (ej. CLI-0123).
 * 2.  **Codificar Cédula:** La cédula del cliente se codifica en Base64 antes de guardarla para proteger la información.
 * 3.  **Insertar Datos Principales:** Se guardan los datos básicos del cliente (nombre, cédula codificada, dirección, etc.) en la tabla `clients`.
 * 4.  **Insertar Datos Relacionados:**
 *     - Si es asalariado, se guarda la información laboral en la tabla `asalariado_info`.
 *     - Si es comerciante, se guarda la información del negocio en `comerciante_info`.
 *     - Las referencias personales se guardan, una por una, en la tabla `personal_references`.
 * 5.  **Crear Registro de Auditoría:** Se llama a la función `createLog` para registrar quién creó el cliente y cuándo.
 */

/**
 * 2.2. Flujo para Crear una Solicitud de Crédito
 * ---------------------------------------------
 * 1.  **Obtener Número de Crédito:** Se solicita un número secuencial único (ej. CRE-00123).
 * 2.  **Generar Plan de Pagos:** Se llama a la lógica de `Generación del Plan de Pagos` (descrita en la sección 1.1) con los datos del formulario.
 * 3.  **Insertar Registro del Crédito:** Se guarda el registro principal del crédito en la tabla `credits` con estado inicial 'Pending'. Se almacenan todos los totales calculados (interés total, monto total, cuota).
 * 4.  **Insertar Datos Relacionados:**
 *     - El plan de pagos completo se guarda, cuota por cuota, en la tabla `payment_plan`.
 *     - Las garantías se guardan en la tabla `guarantees`.
 *     - Los fiadores se guardan en la tabla `guarantors`.
 * 5.  **Crear Registro de Auditoría:** Se registra que el usuario creó una nueva solicitud.
 */

/**
 * 2.3. Flujo para Registrar un Abono
 * ---------------------------------
 * 1.  **Insertar Pago:** Se guarda el registro del abono en la tabla `payments_registered`, incluyendo el monto, la fecha, y el gestor que lo recibió. El estado inicial es 'VALIDO'.
 * 2.  **Crear Registro de Auditoría:** Se registra la acción del abono.
 * 3.  **Refrescar Vistas:** Se invalida la caché de la página del crédito para que los cambios se reflejen inmediatamente en la interfaz.
 */


// =================================================================
// 3. LÓGICA DE REPORTES
// =================================================================

/**
 * 3.1. Reporte de Colocación vs. Recuperación
 * --------------------------------------------
 * Este reporte compara cuánto dinero ha colocado (prestado) cada gestor contra cuánto ha recuperado (cobrado).
 *
 * Flujo de Trabajo:
 * 1.  **Consulta de Recuperación:** Se realiza una consulta a la base de datos que suma todos los abonos (`payments_registered`) y los agrupa por el nombre del gestor (`managedBy`).
 * 2.  **Consulta de Colocación:** En paralelo, se hace otra consulta que suma los montos de los créditos desembolsados (`credits.principalAmount`) y los agrupa por el gestor que los promovió (`collectionsManager`).
 * 3.  **Combinación de Datos:** Los resultados de ambas consultas se combinan en un solo listado. Para cada gestor, se presenta su total de colocación y su total de recuperación.
 */

/**
 * 3.2. Reporte de Cartera en Mora (Listado de Cobros)
 * ----------------------------------------------------
 * Este es el reporte principal para los gestores. Les dice a quién deben ir a cobrar hoy.
 *
 * Flujo de Trabajo:
 * 1.  **Obtener Créditos Activos:** Se obtienen todos los créditos con estado 'Active'.
 * 2.  **Calcular Estado Individual:** Para cada crédito, se ejecuta la lógica de `Cálculo del Estado Actual` (descrita en 1.2).
 * 3.  **Filtrar y Clasificar:** Se filtran solo los créditos que requieren una acción de cobro y se clasifican en tres categorías:
 *     - **'D' (Diario):** La cuota del crédito vence el día de hoy y aún no ha sido pagada.
 *     - **'M' (Mora):** El crédito tiene un `monto_en_mora` de días anteriores.
 *     - **'V' (Vencido):** La fecha de vencimiento final del crédito ya pasó y todavía tiene saldo pendiente.
 * 4.  **Agrupar por Gestor:** Los resultados se agrupan por gestor para que cada uno vea su propio listado de cobro.
 */

// =================================================================
// 4. ROLES DE USUARIO Y PERMISOS
// =================================================================

/**
 * La aplicación define varios roles, cada uno con un conjunto específico de permisos.
 *
 * Roles Definidos:
 * - **ADMINISTRADOR:** Acceso total a todas las funcionalidades, incluyendo configuración del sistema, gestión de usuarios y sucursales. El único que puede eliminar datos sensibles.
 * - **GERENTE:** Vista global de reportes y operaciones. Puede gestionar créditos y aprobaciones, pero no la configuración del sistema.
 * - **OPERATIVO:** Rol de oficina encargado de crear clientes y solicitudes de crédito, y preparar desembolsos. No tiene acceso a reportes financieros.
 * - **FINANZAS:** Acceso de solo lectura a todos los reportes financieros y de cartera, pero no puede modificar datos operativos como créditos o clientes. Realiza arqueos de caja.
 * - **GESTOR:** Rol de campo. Su vista se centra en su cartera de clientes. Puede registrar abonos y crear nuevas solicitudes para sus clientes existentes o nuevos clientes que él mismo ingrese (si se le da el permiso).
 *
 * El acceso a cada página y a cada acción (como editar, eliminar, aprobar) está protegido y solo se habilita si el rol del usuario actual tiene el permiso requerido.
 */
