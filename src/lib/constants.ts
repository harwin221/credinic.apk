
import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard, Users, CreditCard, Calculator, ShieldCheck, Settings,
  FileSpreadsheet, Wallet, Repeat, Landmark,
  HandCoins, Archive, FileX, BarChartHorizontal, UserCheck, TrendingUp, CircleAlert, CircleCheck, BookUser, FileText, History, ArrowRightLeft, CalendarClock, AlertTriangle, Library, BookCopy, ShieldQuestion, Briefcase, Target, PieChart, List, Receipt, ArchiveIcon
} from 'lucide-react';
import type { UserRole, Permission } from './types';

export const TIMEZONE = 'America/Managua';

export const MANAGEMENT_ROLES: UserRole[] = ['GESTOR'];

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  disabled?: boolean;
  permission: Permission;
}

export const NAV_ITEMS: NavItem[] = [
  {
    title: 'Panel General',
    href: '/dashboard',
    icon: LayoutDashboard,
    permission: 'dashboard:view',
  },
  {
    title: 'Clientes',
    href: '/clients',
    icon: Users,
    permission: 'client:view',
  },
  {
    title: 'Créditos',
    href: '/credits',
    icon: CreditCard,
    permission: 'credit:view:all',
  },
  {
    title: 'Arqueo de Caja',
    href: '/arqueo',
    icon: ArchiveIcon,
    permission: 'closure:view',
  },
  {
    title: 'Solicitudes',
    href: '/requests',
    icon: ShieldCheck,
    permission: 'approval:view',
  },
  {
    title: 'Desembolsos',
    href: '/disbursements',
    icon: HandCoins,
    permission: 'disbursement:view',
  },
  {
    title: 'Calculadora de Pagos',
    href: '/calculator',
    icon: Calculator,
    permission: 'calculator:use',
  },
  {
    title: 'Reportes',
    href: '/reports',
    icon: FileSpreadsheet,
    permission: 'reports:view',
  },
  {
    title: 'Auditoría',
    href: '/audit',
    icon: ShieldQuestion,
    permission: 'audit:view',
  },
  {
    title: 'Anulaciones',
    href: '/requests/payment-voids',
    icon: FileX,
    permission: 'void:approve',
  },
  {
    title: 'Configuración',
    href: '/settings',
    icon: Settings,
    permission: 'settings:view',
  }
];

export const reportList = [
  {
    title: "Saldos de Cartera",
    category: "Cartera",
    icon: Wallet,
    href: "/reports/saldos-cartera",
    permission: 'reports:view:saldos',
    hasViewTypeFilter: true,
  },
  {
    title: "Porcentaje Pagado",
    category: "Cartera",
    icon: PieChart,
    href: "/reports/percent-paid",
    permission: 'reports:view:saldos',
  },
  {
    title: "Créditos Ganados y Perdidos",
    category: "Cartera",
    icon: TrendingUp,
    href: "/reports/ganados-perdidos",
    permission: 'reports:view:saldos',
  },
  {
    title: "Cancelados y No Renovados",
    category: "Cartera",
    icon: UserCheck,
    href: "/reports/non-renewed",
    permission: 'reports:view:saldos',
  },
  {
    title: "Proyección de Cuotas Futuras",
    category: "Cartera",
    icon: CalendarClock,
    href: "/reports/future-installments",
    permission: 'reports:view:saldos',
    hasViewTypeFilter: true,
  },
  {
    title: "Análisis de Rechazos",
    category: "Cartera",
    icon: FileX,
    href: "/reports/rejection-analysis",
    permission: 'reports:view:saldos',
  },
  {
    title: "Reporte de Vencimiento",
    category: "Cartera",
    icon: CalendarClock,
    href: "/reports/expired-credits",
    permission: 'reports:view:saldos',
  },
  {
    title: "Estado de Cuenta",
    category: "Cartera",
    icon: FileText,
    href: "/reports/account-statement",
    permission: 'reports:view', // General permission
    needsClientSearch: true,
  },
  {
    title: "Estado de Cuenta Consolidado",
    category: "Cartera",
    icon: Library,
    href: "/reports/consolidated-statement",
    permission: 'reports:view', // General permission
    needsClientSearch: true,
  },
  {
    title: "Listado de Cobros Diario",
    category: "Operativos",
    icon: BookUser,
    href: "/reports/overdue-credits",
    permission: 'reports:view:operativos',
  },
  {
    title: 'Colocación vs Recuperación',
    category: 'Operativos',
    icon: Briefcase,
    href: '/reports/colocacion',
    permission: 'reports:view:operativos',
  },
  {
    title: "Reporte de Desembolsos",
    category: "Operativos",
    icon: HandCoins,
    href: "/reports/disbursements",
    permission: 'reports:view:operativos',
  },
  {
    title: "Reporte de Recuperación",
    category: "Operativos",
    icon: BarChartHorizontal,
    href: "/reports/payments-detail",
    permission: 'reports:view:operativos',
    hasViewTypeFilter: true
  },
  {
    title: "Meta Cobranza",
    category: "Financieros",
    icon: Target,
    href: "/reports/recovery",
    permission: 'reports:view:financieros',
  },
  {
    title: "Reporte de Provisiones",
    category: "Financieros",
    icon: CircleAlert,
    href: "/reports/provisioning",
    permission: 'reports:view:financieros',
  },
  {
    title: "Historial de Arqueos",
    category: "Financieros",
    icon: History,
    href: "/reports/closures-history",
    permission: 'closure:view',
  },
];

export const NAV_ITEMS_FOOTER: NavItem[] = [
];

export const rolePermissions: Record<UserRole, Permission[]> = {
  ADMINISTRADOR: [
    'dashboard:view', 'client:view', 'client:create', 'client:edit', 'client:delete',
    'credit:view:all', 'credit:create', 'credit:edit', 'credit:delete', 'credit:pay', 'payment:void_request', 'void:approve',
    'closure:view', 'closure:create',
    'calculator:use', 'reports:view', 'reports:view:saldos', 'reports:view:operativos', 'reports:view:financieros',
    'audit:view', 'settings:view', 'settings:seed_data',
    'user:view', 'user:create', 'user:edit', 'user:delete', 'user:reset_password',
    'branch:view', 'branch:create', 'branch:edit', 'branch:delete', 'approval:view', 'approval:level2',
    'disbursement:view'
  ],
  FINANZAS: [
    'dashboard:view', 'client:view', 'credit:view:all', 'closure:view', 'closure:create',
    'reports:view', 'reports:view:saldos', 'reports:view:operativos', 'reports:view:financieros',
    'calculator:use'
  ],
  OPERATIVO: [
    'dashboard:view', 'client:view', 'client:create', 'client:edit',
    'credit:view:all', 'credit:create', 'credit:edit', 'credit:pay',
    'closure:view', 'closure:create',
    'calculator:use', 'reports:view', 'reports:view:saldos', 'reports:view:operativos',
    'approval:view', 'disbursement:view'
  ],
  GERENTE: [
    'dashboard:view', 'client:view', 'client:create', 'client:edit',
    'credit:view:all', 'credit:create', 'credit:edit', 'credit:pay', 'payment:void_request', 'void:approve',
    'closure:view', 'closure:create',
    'calculator:use', 'reports:view', 'reports:view:saldos', 'reports:view:operativos', 'reports:view:financieros',
    'approval:view', 'approval:level2',
    'disbursement:view'
  ],
  GESTOR: [
    'dashboard:view', 'client:view',
    'credit:create', 'credit:pay', 'payment:void_request',
    'calculator:use', 'reports:view'
  ],
};

export const USER_ROLES = Object.keys(rolePermissions) as UserRole[];
