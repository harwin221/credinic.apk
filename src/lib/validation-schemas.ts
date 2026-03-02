/**
 * Esquemas de validación centralizados para todo el sistema
 * Utiliza Zod para validación de tipos y datos
 */

import { z } from 'zod';
import { USER_ROLES, type PaymentFrequency } from './types';

// ============================================================================
// ESQUEMAS BASE
// ============================================================================

export const EmailSchema = z.string().email('Formato de email inválido');
export const PhoneSchema = z.string().regex(/^\d{8}$/, 'El teléfono debe tener 8 dígitos');
export const CedulaSchema = z.string().regex(/^\d{3}-\d{6}-\d{4}[A-Z]$/, 'Formato de cédula inválido (000-000000-0000A)');
export const PositiveNumberSchema = z.number().positive('Debe ser un número positivo');
export const NonEmptyStringSchema = z.string().min(1, 'Este campo es requerido');

// ============================================================================
// ESQUEMAS DE USUARIO
// ============================================================================

export const CreateUserSchema = z.object({
  displayName: z.string()
    .min(3, 'El nombre debe tener al menos 3 caracteres')
    .max(100, 'El nombre no puede exceder 100 caracteres')
    .regex(/^[a-zA-ZÀ-ÿ\s]+$/, 'El nombre solo puede contener letras y espacios'),
  
  username: z.string()
    .min(3, 'El usuario debe tener al menos 3 caracteres')
    .max(50, 'El usuario no puede exceder 50 caracteres')
    .regex(/^[a-zA-Z0-9._-]+$/, 'El usuario solo puede contener letras, números, puntos, guiones y guiones bajos')
    .toLowerCase(),
  
  password: z.string()
    .min(6, 'La contraseña debe tener al menos 6 caracteres'),
  
  phone: PhoneSchema.optional(),
  
  role: z.enum(USER_ROLES, {
    errorMap: () => ({ message: 'Rol inválido' })
  }),
  
  branch: z.string().min(1, 'Debe seleccionar una sucursal'),
  
  active: z.boolean().default(true)
});

export const UpdateUserSchema = CreateUserSchema.partial().omit({ password: true });

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Contraseña actual requerida'),
  newPassword: z.string()
    .min(8, 'La nueva contraseña debe tener al menos 8 caracteres')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'La contraseña debe contener al menos una mayúscula, una minúscula y un número'),
  confirmPassword: z.string()
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Las contraseñas no coinciden",
  path: ["confirmPassword"]
});

export const LoginSchema = z.object({
  username: z.string().min(1, 'Usuario requerido'),
  password: z.string().min(1, 'Contraseña requerida')
});

// ============================================================================
// ESQUEMAS DE CLIENTE
// ============================================================================

export const PersonalReferenceSchema = z.object({
  name: z.string().min(3, 'Nombre de referencia requerido').max(100),
  phone: PhoneSchema,
  address: z.string().min(10, 'Dirección debe tener al menos 10 caracteres').max(200),
  relationship: z.string().min(1, 'Relación requerida').max(50)
});

export const AsalariadoInfoSchema = z.object({
  companyName: z.string().min(3, 'Nombre de empresa requerido').max(100),
  jobAntiquity: z.string().min(1, 'Antigüedad laboral requerida').max(50),
  companyAddress: z.string().min(10, 'Dirección de empresa requerida').max(200),
  companyPhone: PhoneSchema.optional()
});

export const ComercianteInfoSchema = z.object({
  businessAntiquity: z.string().min(1, 'Antigüedad del negocio requerida').max(50),
  businessAddress: z.string().min(10, 'Dirección del negocio requerida').max(200),
  economicActivity: z.string().min(3, 'Actividad económica requerida').max(100)
});

// Create a base schema without the refine for partial updates
const BaseClientSchema = z.object({
  firstName: z.string().min(2, 'Primer nombre requerido').max(50),
  lastName: z.string().min(2, 'Primer apellido requerido').max(50),
  cedula: CedulaSchema,
  phone: PhoneSchema,
  sex: z.enum(['masculino', 'femenino'], { errorMap: () => ({ message: 'Sexo inválido' }) }),
  civilStatus: z.enum(['soltero', 'casado', 'divorciado', 'viudo', 'union_libre'], {
    errorMap: () => ({ message: 'Estado civil inválido' })
  }),
  employmentType: z.enum(['asalariado', 'comerciante'], {
    errorMap: () => ({ message: 'Tipo de empleo inválido' })
  }),
  department: z.string().min(1, 'Departamento requerido').max(50),
  municipality: z.string().min(1, 'Municipio requerido').max(50),
  neighborhood: z.string().min(1, 'Barrio requerido').max(100),
  address: z.string().min(10, 'Dirección debe tener al menos 10 caracteres').max(200),
  references: z.array(PersonalReferenceSchema).max(5).default([]),
  asalariadoInfo: AsalariadoInfoSchema.optional(),
  comercianteInfo: ComercianteInfoSchema.optional()
});

export const CreateClientSchema = BaseClientSchema.refine((data) => {
  if (data.employmentType === 'asalariado') {
    return !!data.asalariadoInfo;
  }
  if (data.employmentType === 'comerciante') {
    return !!data.comercianteInfo;
  }
  return true;
}, {
  message: "Información laboral requerida según el tipo de empleo",
  path: ["employmentType"]
});

export const UpdateClientSchema = BaseClientSchema.partial();

// ============================================================================
// ESQUEMAS DE CRÉDITO
// ============================================================================

export const GuaranteeSchema = z.object({
  article: z.string().min(1, 'Artículo requerido').max(100),
  brand: z.string().max(50).optional(),
  color: z.string().max(30).optional(),
  model: z.string().max(50).optional(),
  series: z.string().max(50).optional(),
  estimatedValue: PositiveNumberSchema.max(10000000, 'Valor estimado muy alto')
});

export const GuarantorSchema = z.object({
  name: z.string().min(3, 'Nombre del fiador requerido').max(100),
  cedula: CedulaSchema,
  phone: PhoneSchema,
  address: z.string().min(10, 'Dirección del fiador requerida').max(200),
  relationship: z.string().min(1, 'Relación requerida').max(50)
});

export const CreateCreditSchema = z.object({
  clientId: z.string().min(1, 'Cliente requerido'),
  productType: z.string().min(1, 'Tipo de producto requerido').max(50),
  subProduct: z.string().min(1, 'Sub-producto requerido').max(50),
  productDestination: z.string().min(1, 'Destino del producto requerido').max(200),
  
  amount: z.number()
    .positive('El monto debe ser positivo')
    .min(1000, 'El monto mínimo es C$1,000')
    .max(1000000, 'El monto máximo es C$1,000,000'),
  
  interestRate: z.number()
    .positive('La tasa de interés debe ser positiva')
    .min(1, 'La tasa mínima es 1%')
    .max(50, 'La tasa máxima es 50%'),
  
  termMonths: z.number()
    .positive('El plazo debe ser positivo')
    .min(0.5, 'El plazo mínimo es 0.5 meses')
    .max(60, 'El plazo máximo es 60 meses'),
  
  paymentFrequency: z.enum(['Diario', 'Semanal', 'Catorcenal', 'Quincenal'] as const, {
    errorMap: () => ({ message: 'Frecuencia de pago inválida' })
  }),
  
  firstPaymentDate: z.string().datetime('Fecha de primer pago inválida'),
  deliveryDate: z.string().datetime('Fecha de entrega inválida').optional(),
  collectionsManager: z.string().min(1, 'Gestor de cobro requerido'),
  
  guarantees: z.array(GuaranteeSchema).default([]),
  guarantors: z.array(GuarantorSchema).default([])
});

export const UpdateCreditSchema = CreateCreditSchema.partial();

// ============================================================================
// ESQUEMAS DE PAGO
// ============================================================================

export const CreatePaymentSchema = z.object({
  creditId: z.string().min(1, 'ID de crédito requerido'),
  amount: z.number()
    .positive('El monto debe ser positivo')
    .max(1000000, 'Monto muy alto'),
  paymentDate: z.string().datetime('Fecha de pago inválida'),
  transactionNumber: z.string().max(50).optional()
});

// ============================================================================
// ESQUEMAS DE SUCURSAL
// ============================================================================

export const CreateSucursalSchema = z.object({
  name: z.string()
    .min(3, 'El nombre debe tener al menos 3 caracteres')
    .max(100, 'El nombre no puede exceder 100 caracteres'),
  managerId: z.string().optional(),
  managerName: z.string().max(100).optional()
});

export const UpdateSucursalSchema = CreateSucursalSchema.partial();

// ============================================================================
// ESQUEMAS DE CIERRE DE CAJA
// ============================================================================

export const CreateClosureSchema = z.object({
  closureDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha inválido (YYYY-MM-DD)'),
  systemBalance: z.number(),
  physicalBalance: z.number(),
  notes: z.string().max(500).optional(),
  denominationsNIO: z.record(z.string(), z.number()).optional(),
  denominationsUSD: z.record(z.string(), z.number()).optional(),
  exchangeRate: z.number().positive().optional(),
  clientDeposits: z.number().default(0),
  manualTransfers: z.number().default(0)
});

// ============================================================================
// TIPOS DERIVADOS
// ============================================================================

export type CreateUserInput = z.infer<typeof CreateUserSchema>;
export type UpdateUserInput = z.infer<typeof UpdateUserSchema>;
export type ChangePasswordInput = z.infer<typeof ChangePasswordSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;

export type CreateClientInput = z.infer<typeof CreateClientSchema>;
export type UpdateClientInput = z.infer<typeof UpdateClientSchema>;

export type CreateCreditInput = z.infer<typeof CreateCreditSchema>;
export type UpdateCreditInput = z.infer<typeof UpdateCreditSchema>;

export type CreatePaymentInput = z.infer<typeof CreatePaymentSchema>;

export type CreateSucursalInput = z.infer<typeof CreateSucursalSchema>;
export type UpdateSucursalInput = z.infer<typeof UpdateSucursalSchema>;

export type CreateClosureInput = z.infer<typeof CreateClosureSchema>;