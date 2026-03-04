'use server';

import { query } from '@/lib/mysql';

export async function getFirstLogins(dateFrom: string, dateTo: string): Promise<any[]> {
  try {
    // We want the MIN(createdAt) per user, per day within the range.
    // Or simpler: strictly within that date range, the first login.
    // The user requested "al darle a un filtro por fecha pueda ver a que hora inicio sesion X usuario"
    // Usually, they just want the FIRST login of each user inside the selected date range.
    // So GROUP BY userId and get MIN(createdAt) when filtered by the dates.

    const sql = `
      SELECT 
        MIN(al.timestamp) as firstLoginTime,
        al.userId,
        u.fullName as userName,
        u.role,
        COALESCE(s.name, u.sucursal_name) as sucursalName,
        al.ipAddress
      FROM audit_logs al
      JOIN users u ON al.userId = u.id
      LEFT JOIN sucursales s ON u.sucursal_id = s.id
      WHERE al.action = 'user:login'
        AND DATE(DATE_SUB(al.timestamp, INTERVAL 6 HOUR)) >= ?
        AND DATE(DATE_SUB(al.timestamp, INTERVAL 6 HOUR)) <= ?
      GROUP BY DATE(DATE_SUB(al.timestamp, INTERVAL 6 HOUR)), al.userId, u.fullName, u.role, COALESCE(s.name, u.sucursal_name), al.ipAddress
      ORDER BY firstLoginTime DESC
    `;

    const params = [dateFrom, dateTo];

    const results: any[] = await query(sql, params);

    return results.map((row: any, index: number) => ({
      id: `${row.userId}-${index}`,
      userName: row.userName,
      sucursalName: row.sucursalName || 'Sin sucursal',
      role: row.role,
      loginTime: row.firstLoginTime,
      ipAddress: row.ipAddress || 'Desconocida'
    }));
  } catch (error) {
    console.error('Error fetching login logs:', error);
    throw new Error('Error al obtener los registros de inicio de sesión');
  }
}
