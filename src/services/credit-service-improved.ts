/**
 * Servicio de créditos mejorado con validación y manejo de errores estandarizado
 * Versión mejorada del servicio original con mejores prácticas
 */

'use server';

import { query, getNextSequenceValue } from '@/lib/mysql';
import type { CreditApplication, CreditDetail, CreditStatus, AppUser as User, RegisteredPayment } from '@/lib/types';
import { generatePaymentSchedule } from '@/lib/utils';
import { createLog } from './audit-log-service';
import { revalidatePath } from 'next/cache';
import {
    nowInNicaragua,
    isoToMySQLDateTime,
    isoToMySQLDateTimeNoon,
    formatDateForUser
} from '@/lib/date-utils';
import { generateCreditId, generateGuaranteeId, generateGuarantorId, generatePaymentId } from '@/lib/id-generator';
import { getUser } from './user-service-server';
import { getClient } from './client-service-server';
import { hasUserClosedDay } from './closure-service';
import { CreateCreditSchema, CreatePaymentSchema } from '@/lib/validation-schemas';

// ============================================================================
// TIPOS PARA RESPUESTAS ESTANDARIZADAS
// ============================================================================

type ServiceResult<T> = {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
};

// ============================================================================
// FUNCIONES PRINCIPALES
// ============================================================================

/**
 * Crea un nuevo crédito con validación completa
 */
export async function createCreditImproved(
  creditData: Partial<CreditApplication> & { deliveryDate?: string }, 
  creator: User
): Promise<ServiceResult<string>> {
  try {
    // 1. Validar datos de entrada
    const validationResult = CreateCreditSchema.safeParse(creditData);
    if (!validationResult.success) {
      return {
        success: false,
        error: `Datos inválidos: ${validationResult.error.errors.map(e => e.message).join(', ')}`,
        code: 'VALIDATION_ERROR'
      };
    }

    const validatedData = validationResult.data;

    // 2. Obtener información del cliente
    const client = await getClient(validatedData.clientId);
    if (!client) {
      return {
        success: false,
        error: "Cliente no encontrado.",
        code: 'CLIENT_NOT_FOUND'
      };
    }

    // 3. Generar IDs únicos
    const sequence = await getNextSequenceValue('creditNumber');
    const creditNumber = `CRE-${String(sequence).padStart(5, '0')}`;
    const newCreditId = generateCreditId();

    // 3. Validar gestor de cobro
    if (validatedData.collectionsManager) {
      const gestor = await getUser(validatedData.collectionsManager);
      if (!gestor) {
        return {
          success: false,
          error: "El gestor de cobro seleccionado no es válido.",
          code: 'INVALID_MANAGER'
        };
      }
    }

    // 4. Obtener feriados para ajustar fechas de pago
    const holidaysResult: any = await query('SELECT date FROM holidays');
    const holidays = holidaysResult.map((h: any) => formatDateForUser(h.date, 'yyyy-MM-dd'));

    // 5. Generar plan de pagos
    const scheduleData = generatePaymentSchedule({
      loanAmount: validatedData.amount,
      monthlyInterestRate: validatedData.interestRate,
      termMonths: validatedData.termMonths,
      paymentFrequency: validatedData.paymentFrequency,
      startDate: validatedData.firstPaymentDate,
      holidays
    });

    if (!scheduleData) {
      return {
        success: false,
        error: "No se pudo generar el plan de pagos con los datos proporcionados.",
        code: 'SCHEDULE_GENERATION_ERROR'
      };
    }

    // 6. Determinar estado inicial basado en rol del creador
    const creatorRole = creator.role.toUpperCase();
    const isAdminOrOperativo = creatorRole === 'ADMINISTRADOR' || creatorRole === 'OPERATIVO';
    const initialStatus: CreditStatus = isAdminOrOperativo ? 'Approved' : 'Pending';

    const applicationDate = nowInNicaragua();
    const approvalDate = isAdminOrOperativo ? nowInNicaragua() : null;
    const approvedBy = isAdminOrOperativo ? creator.fullName : null;

    // 7. Insertar crédito principal
    const creditSql = `
      INSERT INTO credits (
        id, creditNumber, clientId, clientName, status, applicationDate, approvalDate, approvedBy, 
        amount, principalAmount, interestRate, termMonths, paymentFrequency, currencyType, 
        totalAmount, totalInterest, totalInstallmentAmount, firstPaymentDate, deliveryDate, dueDate, 
        collectionsManager, createdBy, branch, branchName, productType, subProduct, productDestination
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    // Obtener datos del gestor si existe
    let gestorName = null;
    let gestorBranch = null;
    let gestorBranchName = null;
    
    if (validatedData.collectionsManager) {
      const gestor = await getUser(validatedData.collectionsManager);
      if (gestor) {
        gestorName = gestor.fullName;
        gestorBranch = gestor.sucursal || null;
        gestorBranchName = gestor.sucursalName || null;
      }
    }

    await query(creditSql, [
      newCreditId, creditNumber, validatedData.clientId, client.name, initialStatus,
      isoToMySQLDateTime(applicationDate),
      approvalDate ? isoToMySQLDateTime(approvalDate) : null,
      approvedBy, validatedData.amount, validatedData.amount, validatedData.interestRate, 
      validatedData.termMonths, validatedData.paymentFrequency, 'CÓRDOBAS',
      scheduleData.totalPayment, scheduleData.totalInterest, scheduleData.periodicPayment,
      isoToMySQLDateTimeNoon(validatedData.firstPaymentDate),
      validatedData.deliveryDate ? isoToMySQLDateTimeNoon(validatedData.deliveryDate) : null,
      `${scheduleData.schedule[scheduleData.schedule.length - 1].paymentDate} 12:00:00`,
      gestorName, creator.fullName,
      gestorBranch, gestorBranchName, 
      validatedData.productType, validatedData.subProduct, validatedData.productDestination
    ]);

    // 8. Insertar garantías si existen
    if (validatedData.guarantees && validatedData.guarantees.length > 0) {
      for (const guarantee of validatedData.guarantees) {
        const guaranteeId = generateGuaranteeId();
        await query(
          'INSERT INTO guarantees (id, creditId, article, brand, color, model, series, estimatedValue) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [guaranteeId, newCreditId, guarantee.article, guarantee.brand, guarantee.color, guarantee.model, guarantee.series, guarantee.estimatedValue]
        );
      }
    }

    // 9. Insertar fiadores si existen
    if (validatedData.guarantors && validatedData.guarantors.length > 0) {
      for (const guarantor of validatedData.guarantors) {
        const guarantorId = generateGuarantorId();
        await query(
          'INSERT INTO guarantors (id, creditId, name, cedula, phone, address, relationship) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [guarantorId, newCreditId, guarantor.name, guarantor.cedula, guarantor.phone, guarantor.address, guarantor.relationship]
        );
      }
    }

    // 10. Insertar plan de pagos
    if (scheduleData.schedule.length > 0) {
      for (const payment of scheduleData.schedule) {
        await query(
          'INSERT INTO payment_plan (creditId, paymentNumber, paymentDate, amount, principal, interest, balance) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [newCreditId, payment.paymentNumber, `${payment.paymentDate} 12:00:00`, payment.amount, payment.principal, payment.interest, payment.balance]
        );
      }
    }

    // 11. Registrar en auditoría
    await createLog(creator, 'credit:create', `Creó la solicitud de crédito ${creditNumber} para ${client.name}.`, { targetId: newCreditId });
    if (isAdminOrOperativo) {
      await createLog(creator, 'credit:approve', `Aprobó automáticamente el crédito ${creditNumber} durante la creación.`, { targetId: newCreditId });
    }

    // 12. Revalidar rutas
    revalidatePath('/credits');
    revalidatePath('/requests');

    return {
      success: true,
      data: newCreditId
    };

  } catch (error: any) {
    console.error("Error al crear el crédito:", error);
    return {
      success: false,
      error: 'Ocurrió un error interno al procesar la solicitud.',
      code: 'INTERNAL_ERROR'
    };
  }
}

/**
 * Registra un pago con validación completa
 */
export async function addPaymentImproved(
  creditId: string,
  paymentData: Omit<RegisteredPayment, 'id'>,
  actor: User
): Promise<ServiceResult<string>> {
  try {
    // 1. Validar datos de entrada
    const validationResult = CreatePaymentSchema.safeParse({
      creditId,
      ...paymentData
    });

    if (!validationResult.success) {
      return {
        success: false,
        error: `Datos de pago inválidos: ${validationResult.error.errors.map(e => e.message).join(', ')}`,
        code: 'VALIDATION_ERROR'
      };
    }

    // 2. Verificar que el crédito existe y está activo
    const creditResult: any = await query('SELECT id, status, clientName FROM credits WHERE id = ? LIMIT 1', [creditId]);
    if (creditResult.length === 0) {
      return {
        success: false,
        error: 'Crédito no encontrado.',
        code: 'CREDIT_NOT_FOUND'
      };
    }

    const credit = creditResult[0];
    if (credit.status !== 'Active') {
      return {
        success: false,
        error: `No se pueden registrar pagos en créditos con estado: ${credit.status}`,
        code: 'INVALID_CREDIT_STATUS'
      };
    }

    // 3. Verificar que el usuario no ha cerrado el día (si aplica)
    const hasClosedDay = await hasUserClosedDay(actor.id);
    if (hasClosedDay) {
      return {
        success: false,
        error: 'No puede registrar pagos después de cerrar el día.',
        code: 'DAY_ALREADY_CLOSED'
      };
    }

    // 4. Generar ID único para el pago
    const paymentId = generatePaymentId();

    // 5. Insertar el pago
    const sql = 'INSERT INTO payments_registered (id, creditId, paymentDate, amount, managedBy, transactionNumber, status) VALUES (?, ?, ?, ?, ?, ?, ?)';
    await query(sql, [
      paymentId,
      creditId,
      isoToMySQLDateTime(paymentData.paymentDate),
      paymentData.amount,
      paymentData.managedBy,
      paymentData.transactionNumber || `PAY-${Date.now()}`,
      paymentData.status || 'VALIDO'
    ]);

    // 6. Verificar si el crédito está completamente pagado
    const paymentsResult: any = await query(
      "SELECT SUM(amount) as totalPaid FROM payments_registered WHERE creditId = ? AND status = 'VALIDO'",
      [creditId]
    );
    const totalPaid = paymentsResult[0]?.totalPaid || 0;

    const creditDetailsResult: any = await query('SELECT totalAmount FROM credits WHERE id = ?', [creditId]);
    const totalAmount = creditDetailsResult[0]?.totalAmount || 0;

    if (totalPaid >= totalAmount) {
      await query("UPDATE credits SET status = 'Paid' WHERE id = ?", [creditId]);
      await createLog(actor, 'credit:update', `El crédito ${credit.clientName} se actualizó a status 'Paid' por pago completo.`, { targetId: creditId });
    }

    // 7. Registrar en auditoría
    await createLog(actor, 'payment:create', `Registró un abono de C$${paymentData.amount} para el crédito ${credit.clientName}.`, { targetId: creditId });

    // 8. Revalidar rutas
    revalidatePath(`/credits/${creditId}`);
    revalidatePath('/credits');

    return {
      success: true,
      data: paymentId
    };

  } catch (error: any) {
    console.error(`Error al registrar pago para crédito ${creditId}:`, error);
    return {
      success: false,
      error: 'Ocurrió un error interno al registrar el pago.',
      code: 'INTERNAL_ERROR'
    };
  }
}

/**
 * Obtiene un crédito con validación y manejo de errores
 */
export async function getCreditImproved(creditId: string): Promise<ServiceResult<CreditDetail>> {
  try {
    if (!creditId) {
      return {
        success: false,
        error: 'ID de crédito requerido.',
        code: 'MISSING_CREDIT_ID'
      };
    }

    // Consulta principal del crédito
    const creditResult: any = await query('SELECT * FROM credits WHERE id = ? LIMIT 1', [creditId]);
    if (creditResult.length === 0) {
      return {
        success: false,
        error: 'Crédito no encontrado.',
        code: 'CREDIT_NOT_FOUND'
      };
    }

    const credit = creditResult[0];

    // Obtener datos relacionados en paralelo
    const [paymentPlan, registeredPayments, guarantees, guarantors, clientDetails] = await Promise.all([
      query('SELECT * FROM payment_plan WHERE creditId = ? ORDER BY paymentNumber', [creditId]),
      query("SELECT * FROM payments_registered WHERE creditId = ? ORDER BY paymentDate DESC", [creditId]),
      query('SELECT * FROM guarantees WHERE creditId = ?', [creditId]),
      query('SELECT * FROM guarantors WHERE creditId = ?', [creditId]),
      getClient(credit.clientId)
    ]);

    // Construir objeto de respuesta
    const creditDetail: CreditDetail = {
      ...credit,
      paymentPlan: paymentPlan.map((p: any) => ({
        ...p,
        paymentDate: p.paymentDate ? new Date(p.paymentDate).toISOString() : null
      })),
      registeredPayments: registeredPayments.map((p: any) => ({
        ...p,
        paymentDate: p.paymentDate ? new Date(p.paymentDate).toISOString() : null
      })),
      guarantees,
      guarantors,
      clientDetails: clientDetails || undefined
    };

    return {
      success: true,
      data: creditDetail
    };

  } catch (error: any) {
    console.error(`Error al obtener crédito ${creditId}:`, error);
    return {
      success: false,
      error: 'Ocurrió un error interno al obtener el crédito.',
      code: 'INTERNAL_ERROR'
    };
  }
}