'use client';

import * as React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getDepartments, getMunicipalitiesByDepartment } from '@/services/geography-service';
import type { Department, Municipality } from '@/services/geography-service';

interface GeographySelectProps {
  departmentValue?: string;
  municipalityValue?: string;
  onDepartmentChange: (departmentId: string) => void;
  onMunicipalityChange: (municipalityId: string) => void;
  disabled?: boolean;
}

export function GeographySelect({
  departmentValue,
  municipalityValue,
  onDepartmentChange,
  onMunicipalityChange,
  disabled = false
}: GeographySelectProps) {
  const [departments, setDepartments] = React.useState<Department[]>([]);
  const [municipalities, setMunicipalities] = React.useState<Municipality[]>([]);
  const [loadingDepartments, setLoadingDepartments] = React.useState(true);
  const [loadingMunicipalities, setLoadingMunicipalities] = React.useState(false);

  // Cargar departamentos al montar el componente
  React.useEffect(() => {
    const loadDepartments = async () => {
      try {
        const depts = await getDepartments();
        setDepartments(depts);
      } catch (error) {
        console.error('Error loading departments:', error);
      } finally {
        setLoadingDepartments(false);
      }
    };

    loadDepartments();
  }, []);

  // Cargar municipios cuando cambia el departamento
  React.useEffect(() => {
    const loadMunicipalities = async () => {
      if (!departmentValue) {
        setMunicipalities([]);
        return;
      }

      setLoadingMunicipalities(true);
      try {
        const munis = await getMunicipalitiesByDepartment(departmentValue);
        setMunicipalities(munis);
      } catch (error) {
        console.error('Error loading municipalities:', error);
        setMunicipalities([]);
      } finally {
        setLoadingMunicipalities(false);
      }
    };

    loadMunicipalities();
  }, [departmentValue]);

  const handleDepartmentChange = (value: string) => {
    onDepartmentChange(value);
    // Limpiar municipio cuando cambia el departamento
    onMunicipalityChange('');
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Departamento</label>
        <Select
          value={departmentValue}
          onValueChange={handleDepartmentChange}
          disabled={disabled || loadingDepartments}
        >
          <SelectTrigger>
            <SelectValue placeholder={loadingDepartments ? "Cargando..." : "Seleccionar departamento"} />
          </SelectTrigger>
          <SelectContent>
            {departments.map((dept) => (
              <SelectItem key={dept.id} value={dept.id}>
                {dept.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Municipio</label>
        <Select
          value={municipalityValue}
          onValueChange={onMunicipalityChange}
          disabled={disabled || !departmentValue || loadingMunicipalities}
        >
          <SelectTrigger>
            <SelectValue 
              placeholder={
                !departmentValue 
                  ? "Seleccionar departamento primero" 
                  : loadingMunicipalities 
                    ? "Cargando..." 
                    : "Seleccionar municipio"
              } 
            />
          </SelectTrigger>
          <SelectContent>
            {municipalities.map((muni) => (
              <SelectItem key={muni.id} value={muni.id}>
                {muni.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}