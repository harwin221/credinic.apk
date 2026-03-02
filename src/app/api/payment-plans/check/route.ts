import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/mysql';
import { getSession } from '@/app/(auth)/login/actions';
import { ensurePaymentPlanExists } from '@/services/holiday-service';

export async function GET(request: NextRequest) {
  try {
    const user = await getSession();
    if (!user || user.role !== 'ADMINISTRADOR') {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }

    // Obtener todos los créditos activos
    const activeCredits: any = await query(`
      SELECT c.id, c.creditNumber, c.clientName, 
             (SELECT COUNT(*) FROM payment_plan WHERE creditId = c.id) as planCount
      FROM credits c 
      WHERE c.status = 'Active'
      ORDER BY c.creditNumber
    `);

    const creditsWithoutPlan = activeCredits.filter((c: any) => c.planCount === 0);
    const creditsWithPlan = activeCredits.filter((c: any) => c.planCount > 0);

    return NextResponse.json({
      success: true,
      summary: {
        totalActiveCredits: activeCredits.length,
        creditsWithPlan: creditsWithPlan.length,
        creditsWithoutPlan: creditsWithoutPlan.length
      },
      creditsWithoutPlan: creditsWithoutPlan.map((c: any) => ({
        id: c.id,
        creditNumber: c.creditNumber,
        clientName: c.clientName
      }))
    });

  } catch (error: any) {
    console.error('Error checking payment plans:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getSession();
    if (!user || user.role !== 'ADMINISTRADOR') {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }

    const { creditId } = await request.json();

    if (!creditId) {
      return NextResponse.json({ error: 'creditId es requerido' }, { status: 400 });
    }

    const result = await ensurePaymentPlanExists(creditId, user);
    
    return NextResponse.json(result);

  } catch (error: any) {
    console.error('Error ensuring payment plan:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}