'use server';

import { updatePaymentPlanDates } from '@/services/payment-plan-service';
import { revalidatePath } from 'next/cache';
import type { AppUser } from '@/lib/types';

export async function updatePaymentPlanDatesAction(
  creditId: string,
  updatedPayments: { paymentNumber: number; paymentDate: string }[],
  actor: AppUser
) {
  const result = await updatePaymentPlanDates(creditId, updatedPayments, actor);
  
  if (result.success) {
    // Revalidar las rutas relacionadas
    revalidatePath(`/credits/${creditId}`);
    revalidatePath('/credits');
  }
  
  return result;
}