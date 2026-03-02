'use client';

/**
 * Este archivo simula llamadas del lado del cliente a la base de datos.
 * IMPORTANTE: En un proyecto de producción real, esto NUNCA se haría así.
 * En su lugar, se crearían API Routes en Next.js (`/api/mi-consulta`)
 * que serían llamadas desde aquí usando `fetch`.
 * Esas API Routes serían las únicas que tendrían acceso a la base de datos
 * y contendrían toda la lógica de seguridad y consultas.
 *
 * Para los propósitos de este experimento, asumimos que este mecanismo funciona
 * y que las Server Actions o API Routes correspondientes existen.
 */
export async function clientQuery(sql: string, params: any[] = []) {
  console.warn(
    `[Simulación de Consulta del Cliente] Se está simulando una consulta del lado del cliente.
     En un entorno real, esto debería ser una llamada a una API Route segura que ejecute la consulta en el servidor.
     SQL: ${sql}`,
    params
  );
  
  // Como no podemos acceder a la base de datos real, devolvemos un array vacío
  // para evitar que la interfaz de usuario se rompa al esperar un array.
  // La lógica real de la consulta debería estar en el servidor.
  return [];
}
