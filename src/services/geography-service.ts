'use server';

import { query } from '@/lib/mysql';

export interface Department {
  id: string;
  name: string;
}

export interface Municipality {
  id: string;
  name: string;
  departmentId: string;
}

/**
 * Obtiene todos los departamentos
 */
export async function getDepartments(): Promise<Department[]> {
  try {
    const departments = await query('SELECT id, name FROM departments ORDER BY name');
    return departments as Department[];
  } catch (error) {
    console.error('Error fetching departments:', error);
    return [];
  }
}

/**
 * Obtiene todos los municipios de un departamento específico
 */
export async function getMunicipalitiesByDepartment(departmentId: string): Promise<Municipality[]> {
  try {
    const municipalities = await query(
      'SELECT id, name, departmentId FROM municipalities WHERE departmentId = ? ORDER BY name',
      [departmentId]
    );
    return municipalities as Municipality[];
  } catch (error) {
    console.error('Error fetching municipalities:', error);
    return [];
  }
}

/**
 * Obtiene todos los municipios
 */
export async function getAllMunicipalities(): Promise<Municipality[]> {
  try {
    const municipalities = await query(
      'SELECT id, name, departmentId FROM municipalities ORDER BY name'
    );
    return municipalities as Municipality[];
  } catch (error) {
    console.error('Error fetching all municipalities:', error);
    return [];
  }
}

/**
 * Obtiene un departamento por ID
 */
export async function getDepartmentById(id: string): Promise<Department | null> {
  try {
    const departments = await query('SELECT id, name FROM departments WHERE id = ?', [id]);
    return departments.length > 0 ? departments[0] as Department : null;
  } catch (error) {
    console.error('Error fetching department by ID:', error);
    return null;
  }
}

/**
 * Obtiene un municipio por ID
 */
export async function getMunicipalityById(id: string): Promise<Municipality | null> {
  try {
    const municipalities = await query(
      'SELECT id, name, departmentId FROM municipalities WHERE id = ?',
      [id]
    );
    return municipalities.length > 0 ? municipalities[0] as Municipality : null;
  } catch (error) {
    console.error('Error fetching municipality by ID:', error);
    return null;
  }
}