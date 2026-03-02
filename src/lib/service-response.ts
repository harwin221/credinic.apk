/**
 * Sistema estandarizado de respuestas de servicios
 * Garantiza consistencia en el manejo de errores y respuestas exitosas
 */

import { ZodError } from 'zod';

// ============================================================================
// TIPOS DE RESPUESTA ESTANDARIZADOS
// ============================================================================

export interface ServiceResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  code?: ErrorCode;
  details?: any;
}

export type ErrorCode = 
  // Errores de validación
  | 'VALIDATION_ERROR'
  | 'INVALID_INPUT'
  | 'MISSING_REQUIRED_FIELD'
  
  // Errores de autenticación y autorización
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'INVALID_CREDENTIALS'
  | 'SESSION_EXPIRED'
  | 'RATE_LIMITED'
  
  // Errores de base de datos
  | 'DATABASE_ERROR'
  | 'DUPLICATE_ENTRY'
  | 'RECORD_NOT_FOUND'
  | 'FOREIGN_KEY_CONSTRAINT'
  
  // Errores de negocio
  | 'INSUFFICIENT_BALANCE'
  | 'CREDIT_ALREADY_PAID'
  | 'INVALID_PAYMENT_AMOUNT'
  | 'CLIENT_HAS_ACTIVE_CREDITS'
  | 'SYSTEM_CLOSED'
  | 'BRANCH_CLOSED'
  
  // Errores del sistema
  | 'INTERNAL_ERROR'
  | 'SERVICE_UNAVAILABLE'
  | 'TIMEOUT'
  | 'NETWORK_ERROR';

// ============================================================================
// FUNCIONES DE UTILIDAD PARA RESPUESTAS
// ============================================================================

/**
 * Crea una respuesta exitosa
 */
export function createSuccessResponse<T>(data?: T, message?: string): ServiceResponse<T> {
  return {
    success: true,
    data,
    ...(message && { error: message }) // Usar error para mensajes informativos también
  };
}

/**
 * Crea una respuesta de error
 */
export function createErrorResponse(
  error: string,
  code?: ErrorCode,
  details?: any
): ServiceResponse {
  return {
    success: false,
    error,
    code,
    details
  };
}

/**
 * Crea una respuesta de error de validación desde ZodError
 */
export function createValidationErrorResponse(zodError: ZodError): ServiceResponse {
  const firstError = zodError.errors[0];
  const fieldName = firstError.path.join('.');
  const message = `${fieldName}: ${firstError.message}`;
  
  return createErrorResponse(
    message,
    'VALIDATION_ERROR',
    {
      field: fieldName,
      issues: zodError.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
        code: err.code
      }))
    }
  );
}

/**
 * Crea una respuesta de error de base de datos
 */
export function createDatabaseErrorResponse(error: any): ServiceResponse {
  // Mapear errores comunes de MySQL
  if (error.code === 'ER_DUP_ENTRY') {
    return createErrorResponse(
      'Ya existe un registro con estos datos',
      'DUPLICATE_ENTRY',
      { sqlCode: error.code, sqlMessage: error.sqlMessage }
    );
  }
  
  if (error.code === 'ER_NO_REFERENCED_ROW_2') {
    return createErrorResponse(
      'Referencia inválida a otro registro',
      'FOREIGN_KEY_CONSTRAINT',
      { sqlCode: error.code, sqlMessage: error.sqlMessage }
    );
  }
  
  if (error.code === 'ER_ROW_IS_REFERENCED_2') {
    return createErrorResponse(
      'No se puede eliminar porque está siendo usado por otros registros',
      'FOREIGN_KEY_CONSTRAINT',
      { sqlCode: error.code, sqlMessage: error.sqlMessage }
    );
  }
  
  // Error genérico de base de datos
  console.error('Database error:', error);
  return createErrorResponse(
    'Error en la base de datos',
    'DATABASE_ERROR',
    { sqlCode: error.code }
  );
}

// ============================================================================
// WRAPPER PARA SERVICIOS
// ============================================================================

/**
 * Wrapper que maneja errores automáticamente para servicios
 * Garantiza que todos los servicios retornen el mismo formato
 */
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  context?: string
): Promise<ServiceResponse<T>> {
  try {
    const result = await operation();
    return createSuccessResponse(result);
  } catch (error: any) {
    // Log del error para debugging
    console.error(`Service error${context ? ` in ${context}` : ''}:`, error);
    
    // Manejar diferentes tipos de errores
    if (error instanceof ZodError) {
      return createValidationErrorResponse(error);
    }
    
    if (error.code && error.code.startsWith('ER_')) {
      return createDatabaseErrorResponse(error);
    }
    
    // Error personalizado con código
    if (error.code && typeof error.code === 'string') {
      return createErrorResponse(
        error.message || 'Error en el servicio',
        error.code as ErrorCode,
        error.details
      );
    }
    
    // Error genérico
    return createErrorResponse(
      error.message || 'Error interno del servidor',
      'INTERNAL_ERROR'
    );
  }
}

// ============================================================================
// ERRORES PERSONALIZADOS
// ============================================================================

export class ServiceError extends Error {
  constructor(
    message: string,
    public code: ErrorCode,
    public details?: any
  ) {
    super(message);
    this.name = 'ServiceError';
  }
}

export class ValidationError extends ServiceError {
  constructor(message: string, details?: any) {
    super(message, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends ServiceError {
  constructor(message: string = 'No autorizado') {
    super(message, 'UNAUTHORIZED');
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends ServiceError {
  constructor(message: string = 'Acceso denegado') {
    super(message, 'FORBIDDEN');
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends ServiceError {
  constructor(resource: string = 'Registro') {
    super(`${resource} no encontrado`, 'RECORD_NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

export class BusinessLogicError extends ServiceError {
  constructor(message: string, code: ErrorCode, details?: any) {
    super(message, code, details);
    this.name = 'BusinessLogicError';
  }
}

// ============================================================================
// UTILIDADES PARA VALIDACIÓN
// ============================================================================

/**
 * Valida datos usando un schema de Zod y lanza error si falla
 */
export function validateOrThrow<T>(schema: any, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new ValidationError('Datos inválidos', result.error.errors);
  }
  return result.data;
}

/**
 * Valida datos y retorna ServiceResponse
 */
export function validateData<T>(schema: any, data: unknown): ServiceResponse<T> {
  const result = schema.safeParse(data);
  if (!result.success) {
    return createValidationErrorResponse(result.error);
  }
  return createSuccessResponse(result.data);
}