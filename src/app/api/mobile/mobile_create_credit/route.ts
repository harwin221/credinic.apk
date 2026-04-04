import { NextResponse } from 'next/server';
import { addCredit } from '@/services/credit-service-server';
import { getUser } from '@/services/user-service-server';
import { getClient } from '@/services/client-service-server';

export const dynamic = 'force-dynamic';

/**
 * Endpoint para crear una nueva solicitud de crédito desde la app móvil
 * POST /api/mobile/mobile_create_credit
 * 
 * USA EXACTAMENTE EL MISMO SERVICIO QUE LA APP WEB: credit-service-server.ts
 */
export async function POST(request: Request) {
    try {
        const body = await request.json();
        
        const {
            clientId,
            productType = 'PERSONAL',
            subProduct = 'CONSUMO',
            productDestination,
            amount,
            interestRate,
            termMonths,
            paymentFrequency,
            firstPaymentDate,
            collectionsManager,
            guarantees = [],
            guarantors = [],
        } = body;

        // Validaciones básicas
        if (!clientId || !productDestination || !amount || !interestRate || !termMonths || !paymentFrequency || !firstPaymentDate || !collectionsManager) {
            return NextResponse.json({ 
                success: false, 
                message: 'Faltan campos requeridos' 
            }, { status: 400 });
        }

        // Obtener información del gestor que está creando el crédito
        const creator = await getUser(collectionsManager);
        if (!creator) {
            return NextResponse.json({ 
                success: false, 
                message: 'Gestor no encontrado' 
            }, { status: 404 });
        }

        // Obtener información del cliente
        const client = await getClient(clientId);
        if (!client) {
            return NextResponse.json({ 
                success: false, 
                message: 'Cliente no encontrado' 
            }, { status: 404 });
        }

        // Preparar datos para el servicio (mismo formato que la web)
        const creditData = {
            clientId,
            clientName: client.name,
            productType,
            subProduct,
            productDestination,
            amount: parseFloat(amount),
            interestRate: parseFloat(interestRate),
            termMonths: parseFloat(termMonths),
            paymentFrequency,
            firstPaymentDate,
            collectionsManager,
            guarantees,
            guarantors,
        };

        console.log('[MOBILE_CREATE_CREDIT] Usando addCredit de credit-service-server.ts');

        // Usar EXACTAMENTE el mismo servicio que la app web
        const result = await addCredit(creditData, creator);

        if (!result.success) {
            return NextResponse.json({ 
                success: false, 
                message: result.error || 'Error al crear la solicitud de crédito' 
            }, { status: 400 });
        }

        console.log('[MOBILE_CREATE_CREDIT] Crédito creado exitosamente:', result.creditId);

        return NextResponse.json({
            success: true,
            message: 'Solicitud de crédito creada exitosamente',
            data: {
                creditId: result.creditId,
                status: creator.role.toUpperCase() === 'ADMINISTRADOR' || creator.role.toUpperCase() === 'OPERATIVO' ? 'Approved' : 'Pending'
            }
        });

    } catch (error: any) {
        console.error('Error en mobile_create_credit:', error);
        return NextResponse.json({ 
            success: false, 
            message: error?.message || 'Error al crear la solicitud de crédito' 
        }, { status: 500 });
    }
}
