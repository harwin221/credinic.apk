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
        // collectionsManager puede venir como ID o como fullName desde la app móvil
        let creator = await getUser(collectionsManager);
        
        // Si no se encuentra por ID, intentar buscar por fullName
        if (!creator) {
            console.log('[MOBILE_CREATE_CREDIT] No se encontró por ID, buscando por fullName:', collectionsManager);
            const { query } = await import('@/lib/mysql');
            const userRows: any = await query('SELECT * FROM users WHERE fullName = ? LIMIT 1', [collectionsManager]);
            if (userRows && userRows.length > 0) {
                creator = userRows[0];
            }
        }
        
        if (!creator) {
            console.error('[MOBILE_CREATE_CREDIT] Gestor no encontrado:', collectionsManager);
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
