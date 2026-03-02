

'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import type { UserRole, AppUser, Sucursal, Permission } from '@/lib/types';
import { useUser } from '@/hooks/use-user';
import { AccessDenied } from '@/components/AccessDenied';
import { getSucursales } from '@/services/sucursal-service';
import { getUsers as getUsersServer } from '@/services/user-service-server';
import { reportList, rolePermissions } from '@/lib/constants';
import { Skeleton } from '@/components/ui/skeleton';
import { ReportClientSearchModal } from './components/ReportClientSearchModal';
import { ReportCard } from '@/app/reports/components/ReportCard';
import { ReportFilterModal } from '@/app/reports/components/ReportFilterModal';

const ALLOWED_ROLES: UserRole[] = ['ADMINISTRADOR', 'GERENTE', 'FINANZAS', 'OPERATIVO', 'GESTOR'];

const OFFICE_ROLES: UserRole[] = ['GERENTE', 'OPERATIVO'];
const FIELD_ROLES: UserRole[] = ['GESTOR'];

export default function ReportsPage() {
  const { user } = useUser();
  const router = useRouter();
  const [isFilterModalOpen, setIsFilterModalOpen] = React.useState(false);
  const [isClientSearchModalOpen, setIsClientSearchModalOpen] = React.useState(false);
  const [selectedReport, setSelectedReport] = React.useState<(typeof reportList)[0] | null>(null);

  const [sucursales, setSucursales] = React.useState<Sucursal[]>([]);
  const [gestores, setGestores] = React.useState<AppUser[]>([]);
  const [officeUsers, setOfficeUsers] = React.useState<AppUser[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const isFieldRole = user && FIELD_ROLES.includes(user.role.toUpperCase() as UserRole);

    if (user && !isFieldRole) {
      const fetchData = async () => {
        setIsLoading(true);
        const [fetchedUsers, fetchedSucursales] = await Promise.all([
          getUsersServer(),
          getSucursales()
        ]);

        const activeUsers = fetchedUsers.filter(u => u.active);

        setSucursales(fetchedSucursales.filter(s => s.id && s.name));
        setGestores(activeUsers.filter(u => u.role === 'GESTOR'));
        setOfficeUsers(activeUsers.filter(u => OFFICE_ROLES.includes(u.role as UserRole)));

        setIsLoading(false);
      };
      fetchData();
    } else {
      setIsLoading(false);
    }
  }, [user]);

  const handleReportClick = (report: (typeof reportList)[0]) => {
    if (isLoading) return;

    setSelectedReport(report);
    if (report.needsClientSearch) {
      setIsClientSearchModalOpen(true);
    } else {
      setIsFilterModalOpen(true);
    }
  };

  const handleGenerateReport = (filters: { queryString: string }) => {
    if (selectedReport) {
      const url = `${selectedReport.href}?${filters.queryString}`;
      // Abrir en nueva pestaña
      window.open(url, '_blank');
    }
    setIsFilterModalOpen(false);
  };

  if (!user || !ALLOWED_ROLES.includes(user.role)) {
    return <AccessDenied />;
  }

  const userPermissions = rolePermissions[user.role as UserRole] || [];

  const accessibleReports = reportList.filter(report => {
    return userPermissions.includes(report.permission as Permission);
  });

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {accessibleReports.map((report) => (
          <ReportCard
            key={report.title}
            onClick={() => handleReportClick(report)}
            title={report.title}
            category={report.category}
            icon={report.icon}
            disabled={isLoading}
          />
        ))}
      </div>

      {selectedReport && !selectedReport.needsClientSearch && (
        <ReportFilterModal
          isOpen={isFilterModalOpen}
          onClose={() => setIsFilterModalOpen(false)}
          reportTitle={selectedReport.title}
          sucursales={sucursales}
          gestores={gestores}
          officeUsers={officeUsers}
          onSubmit={handleGenerateReport}
          hasViewTypeFilter={selectedReport.hasViewTypeFilter}
          currentUser={user}
        />
      )}

      {selectedReport && selectedReport.needsClientSearch && (
        <ReportClientSearchModal
          isOpen={isClientSearchModalOpen}
          onClose={() => setIsClientSearchModalOpen(false)}
          reportTitle={selectedReport.title}
          reportUrl={selectedReport.href}
        />
      )}
    </>
  );
}
