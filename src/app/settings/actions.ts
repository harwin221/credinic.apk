'use server';

import { revalidateActiveCreditsStatus, transferPortfolio } from '@/services/credit-service-server';
import { revalidatePath } from 'next/cache';
import type { AppUser } from '@/lib/types';

export async function syncPaymentPlansAction() {
  try {
    const result = await revalidateActiveCreditsStatus();

    if (result.success) {
      // Revalidar rutas relacionadas
      revalidatePath('/credits');
      revalidatePath('/reports');
      revalidatePath('/dashboard');
    }

    return result;
  } catch (error: any) {
    console.error('Error en syncPaymentPlansAction:', error);
    return {
      success: false,
      updatedCount: 0,
      skippedCount: 0,
      error: 'Error al ejecutar la sincronización de planes de pago.'
    };
  }
}

export async function transferPortfolioAction(fromGestorId: string, toGestorId: string, actor: AppUser) {
  try {
    return await transferPortfolio(fromGestorId, toGestorId, actor);
  } catch (error: any) {
    console.error('Error en transferPortfolioAction:', error);
    return { success: false, error: 'Error al ejecutar el traslado de cartera.' };
  }
}