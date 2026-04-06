

import { z } from 'zod';

// Roles de Usuario
export const USER_ROLES = ["ADMINISTRADOR", "GERENTE", "GESTOR", "OPERATIVO", "FINANZAS"] as const;
export type UserRole = (typeof USER_ROLES)[number];

// Permisos del sistema
export type Permission =
  // Gestión de Usuarios
  | 'user:view' | 'user:create' | 'user:edit' | 'user:delete' | 'user:reset_password'
  // Gestión de Sucursales
  | 'branch:view' | 'branch:create' | 'branch:edit' | 'branch:delete'
  // Auditoría
  | 'audit:view'
  // Panel General
  | 'dashboard:view'
  // Reportes
  | 'reports:view' | 'reports:view:saldos' | 'reports:view:operativos' | 'reports:view:financieros'
  // Configuración
  | 'settings:view' | 'settings:seed_data'
  // Clientes
  | 'client:view' | 'client:create' | 'client:edit' | 'client:delete'
  // Créditos
  | 'credit:create' | 'credit:edit' | 'credit:delete' | 'credit:view:all' | 'credit:pay'
  // Aprobaciones y Anulaciones
  | 'approval:view' | 'approval:level2' | 'disbursement:view' | 'payment:void_request' | 'void:approve'
  // Cierres y Transferencias
  | 'closure:view' | 'closure:create'
  // Calculadora
  | 'calculator:use';


// Estructura del Usuario
export interface AppUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  username: string;
  phone?: string;
  sucursal?: string;
  sucursalName?: string;

  linkedDeviceId?: string | null;
  mustChangePassword?: boolean;
  createdAt: any; // MySQL Timestamp or Date
  updatedAt: any; // MySQL Timestamp or Date
  active?: boolean;
  sessionExpiresAt?: string;
}

// Estructura de la Sucursal
export interface Sucursal {
  id: string;
  name: string;
  managerId?: string;
  managerName?: string;
}

// Estructura de Feriados
export interface Holiday {
  id: string;
  date: string; // Formato YYYY-MM-DD
  name: string;
}

// Estructura de Clientes
export interface AsalariadoInfo {
  companyName: string;
  jobAntiquity: string;
  companyAddress: string;
  companyPhone?: string;
}

export interface ComercianteInfo {
  businessAntiquity: string;
  businessAddress: string;
  economicActivity: string;
}

export interface PersonalReference {
  id: string;
  name: string;
  phone: string;
  address: string;
  relationship: string;
}

export interface ClientInteraction {
  id: string;
  date: string; // ISO String
  user: string;
  type: 'Llamada' | 'Mensaje' | 'Visita' | 'Nota';
  notes: string;
}

export interface Client {
  id: string;
  clientNumber: string;
  name: string;
  firstName: string;
  lastName: string;
  cedula: string;
  phone: string;
  sex: 'masculino' | 'femenino';
  civilStatus: 'soltero' | 'casado' | 'divorciado' | 'viudo' | 'union_libre';
  employmentType: 'asalariado' | 'comerciante';
  sucursal: string;
  sucursalName?: string;
  department: string;
  municipality: string;
  neighborhood: string;
  address: string;
  createdAt: string; // ISO String
  references?: PersonalReference[];
  asalariadoInfo?: AsalariadoInfo | null;
  comercianteInfo?: ComercianteInfo | null;
  interactions?: ClientInteraction[];
  tags?: string[];
}

// Estructura de Créditos
export type PaymentFrequency = 'Diario' | 'Semanal' | 'Catorcenal' | 'Quincenal';
export type CreditStatus = 'Pending' | 'Approved' | 'Active' | 'Paid' | 'Rejected' | 'Expired' | 'Fallecido';

export interface GuaranteeItem {
  id: string;
  article: string;
  brand?: string | null;
  color?: string | null;
  model?: string | null;
  series?: string | null;
  estimatedValue: number;
}

export interface GuarantorItem {
  id: string;
  name: string;
  cedula: string;
  phone: string;
  address: string;
  relationship: string;
}

export interface Payment {
  id: string;
  creditId: string;
  paymentNumber: number;
  paymentDate: string; // Formato YYYY-MM-DD
  amount: number;
  principal: number;
  interest: number;
  balance: number;
}

export interface RegisteredPayment {
  id: string;
  paymentDate: string; // ISO string
  amount: number;
  managedBy: string;
  transactionNumber?: string;
  status: 'VALIDO' | 'ANULACION_PENDIENTE' | 'ANULADO';
  isVoid?: boolean; // Campo legado, usar status
  voidReason?: string;
  voidRequestedBy?: string;
  paymentType?: 'NORMAL' | 'DISPENSA' | 'AJUSTE';
  notes?: string;
}

export interface CreditApplication {
  clientId: string;
  clientName: string;
  productType: string;
  subProduct: string;
  productDestination: string;
  amount: number;
  interestRate: number;
  termMonths: number;
  paymentFrequency: PaymentFrequency;
  firstPaymentDate: string; // ISO String
  collectionsManager: string;
  guarantees: GuaranteeItem[];
  guarantors: GuarantorItem[];
}

export interface CreditDetail extends CreditApplication {
  id: string;
  creditNumber: string;
  status: CreditStatus;
  applicationDate: string; // ISO String
  approvalDate?: string | null; // ISO String
  rejectionReason?: string;
  rejectedBy?: string;
  currencyType: 'CÓRDOBAS' | 'DÓLARES';
  principalAmount: number;
  netDisbursementAmount?: number;
  disbursedAmount: number;
  totalAmount: number;
  totalInterest: number;
  totalInstallmentAmount: number;
  deliveryDate: string; // ISO String
  dueDate: string; // ISO String
  disbursedBy?: string;
  disbursementOrigin?: string;
  branch?: string;
  branchName?: string;
  createdBy?: string;
  approvedBy?: string | null;
  lastModifiedBy?: string;
  updatedAt?: string; // ISO String - timestamp automático de la base de datos
  creditPromoter: string;
  paymentPlan: Payment[];
  registeredPayments?: RegisteredPayment[];
  clientDetails?: Partial<Client>;
  outstandingBalance?: number;
}

// Interfaz para los detalles calculados del estado de un crédito
export interface CreditStatusDetails {
  remainingBalance: number;
  overdueAmount: number;
  lateDays: number;
  currentLateFee: number;
  lastPaymentDate?: string;
  isExpired: boolean;
  isDueToday: boolean;
  paidToday: number;
  firstUnpaidDate?: string;
  conamiCategory: 'A' | 'B' | 'C' | 'D' | 'E';
  totalInstallmentAmount: number;
  dueTodayAmount: number;
}

// Nuevo tipo para la vista de cartera del gestor
export interface PortfolioCredit extends CreditDetail {
  details: CreditStatusDetails;
}


// Para la calculadora de pagos
export interface PaymentScheduleArgs {
  loanAmount: number;
  monthlyInterestRate: number;
  termMonths: number;
  paymentFrequency: PaymentFrequency;
  startDate: string;
  holidays?: string[];
}

export interface CalculatedPayment {
  periodicPayment: number;
  totalPayment: number;
  totalInterest: number;
  schedule: Payment[];
}


// Constantes para el dominio ficticio
export const FICTITIOUS_DOMAIN = 'credinica.com';

// Schemas para la creación de usuarios (usados en Server Actions)
export const CreateUserInputSchema = z.object({
  displayName: z.string().min(3),
  username: z.string().min(3, "El usuario debe tener al menos 3 caracteres"),
  email: z.string().email().optional().or(z.literal('')),
  password: z.string().optional(),
  phone: z.string().optional(),
  role: z.string(),
  branch: z.string(),
  status: z.boolean(),
});
export type CreateUserInput = z.infer<typeof CreateUserInputSchema>;

export const CreateUserOutputSchema = z.object({
  uid: z.string(),
  email: z.string().email(),
  message: z.string(),
});
export type CreateUserOutput = z.infer<typeof CreateUserOutputSchema>;


// Tipos para Abonos / Pagos
export const PaymentFormSchema = z.object({
  amount: z.coerce.number().positive({ message: 'El monto debe ser positivo.' }),
  paymentDate: z.string().refine((date) => !isNaN(new Date(date).getTime()), { message: "Formato de fecha inválido." }),
});
export type PaymentFormValues = z.infer<typeof PaymentFormSchema>;


// Tipos para Notificaciones
export interface NotificationActionContext {
  type: 'payment_void' | 'transfer_request';
  id: string; // e.g., creditId or transferId
  subId?: string; // e.g., paymentId
}

export interface AppNotification {
  id?: string;
  userId: string;
  message: string;
  link?: string;
  read: boolean;
  timestamp: string; // ISO String
  actionable?: boolean;
  actionContext?: NotificationActionContext;
  paymentDetails?: {
    amount: string;
    date: string;
    clientName: string;
    requestedBy: string;
    reason: string;
  };
}

// Tipos para Arqueo / Cierres
export interface DailyTransaction {
  id: string;
  type: 'Payment' | 'Disbursement';
  amount: number;
  description: string;
  timestamp: string; // ISO string
}

export interface DailyActivitySummary {
  type: 'Cobranza' | 'Desembolso';
  totalActivityAmount: number;
  transactions: DailyTransaction[];
}

export interface DailyActivityReport {
  collections: DailyActivitySummary;
  disbursements: DailyActivitySummary;
}

export interface CashClosure {
  id?: string;
  userId: string;
  userName: string;
  sucursalId: string;
  closureDate: string; // YYYY-MM-DD
  systemBalance: number;
  physicalBalance: number;
  difference: number;
  notes?: string;
  denominationsNIO?: Record<string, number>;
  denominationsUSD?: Record<string, number>;
  exchangeRate?: number;
  closedByUserId: string;
  closedByUserName: string;
  reviewedAt?: string;
  clientDeposits?: number;
  manualTransfers?: number; // Campo para registrar transferencias manualmente
}


export interface AuditLog {
  id: string;
  timestamp: string; // ISO String
  userId: string;
  userName: string;
  ipAddress?: string;
  action: string;
  details: string;
  entityId: string;
  entityType: 'client' | 'credit' | 'user' | 'payment' | 'system' | 'settings';
  changes: any;
}

export interface ReceiptInput {
  creditId: string;
  paymentId: string;
  isReprint: boolean;
}

export interface ReceiptOutput {
  html?: string;
  pdfDataUri?: string;
  transactionNumber?: string;
  error?: string;
}

export interface ExpiredCreditItem {
  creditId: string;
  clientName: string;
  disbursedAmount: number;
  dueDate: string;
  installmentAmount: number;
  overdueAmount: number;
  remainingBalance: number;
  sucursalName: string;
  gestorName: string;
}

export interface ProcessedStatementInstallment extends Payment {
  lateDays: number;
  lateFee: number;
  paidAmount: number;
  status: 'PAGADA' | 'ATRASADA' | 'PENDIENTE';
}

export interface ProcessedStatementPayment extends RegisteredPayment {
  principalApplied: number;
  interestApplied: number;
  lateFeeApplied: number;
}

export interface FullStatement {
  installments: ProcessedStatementInstallment[];
  payments: ProcessedStatementPayment[];
  totals: {
    plan: { cuota: number; mora: number; pagado: number; saldo: number; };
    abonos: { total: number; capital: number; interes: number; mora: number; };
  }
}

export interface PercentPaidItem {
  creditId: string;
  creditNumber: string;
  clientName: string;
  sucursalName: string;
  gestorName: string;
  totalAmount: number;
  paidAmount: number;
  paidPercentage: number;
}

export interface RejectionAnalysisItem {
  creditId: string;
  applicationDate: string;
  rejectionDate?: string;
  clientName: string;
  sucursalName: string;
  amount: number;
  reason: string;
  rejectedBy: string;
  gestorName?: string;
}

export interface ProvisionCredit {
  id: string;
  creditNumber: string;
  clientName: string;
  gestorName: string;
  remainingBalance: number;
  lateDays: number;
  provisionCategory: 'A' | 'B' | 'C' | 'D' | 'E';
  provisionAmount: number;
}
