
'use server';

import { NextResponse } from 'next/server';
import { getSession } from '@/app/(auth)/login/actions';
import { getCredit, getClientCredits } from '@/services/credit-service-server';
import { generateFullStatement } from '@/lib/utils';
import type { CreditDetail } from '@/lib/types';

export async function GET(request: Request) {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    try {
        const { searchParams } = new URL(request.url);
        const creditId = searchParams.get('creditId');
        const clientId = searchParams.get('clientId');

        if (!creditId && !clientId) {
            return NextResponse.json({ error: 'Faltan los parámetros creditId o clientId' }, { status: 400 });
        }

        let creditData: CreditDetail | null = null;

        if (creditId) {
            creditData = await getCredit(creditId);
        } else if (clientId) {
            const clientCredits = await getClientCredits(clientId);
            const firstRelevantCredit = clientCredits.find(c => c.status === 'Active') || clientCredits.find(c => c.status === 'Paid');
            if (firstRelevantCredit) {
                creditData = await getCredit(firstRelevantCredit.id);
            }
        }
        
        if (!creditData) {
            return NextResponse.json({ error: 'No se encontró un crédito válido para generar el estado de cuenta.' }, { status: 404 });
        }

        const statementData = generateFullStatement(creditData);

        return NextResponse.json(statementData);

    } catch (error) {
        console.error('[API GET /reports/account-statement]', error);
        return NextResponse.json({ error: 'Error al generar el estado de cuenta.' }, { status: 500 });
    }
}
