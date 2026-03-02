
'use server';

import { getClients } from '@/services/client-service-server';
import { getCreditsAdmin } from '@/services/credit-service-server';
import type { AppUser } from '@/lib/types';

export async function getPortfolioForSync(user: AppUser) {
    if (!user) return null;

    try {
        // 1. Get all clients for this user
        const clientData = await getClients({ user });
        const allClients = clientData.allGestorClients || clientData.clients;

        // 2. Get all active credits for these clients to have high detail
        const creditData = await getCreditsAdmin({ user, searchTerm: '' });
        const activeCredits = creditData.credits.filter(c => c.status === 'Active');

        return {
            clients: allClients,
            credits: activeCredits,
            timestamp: Date.now()
        };
    } catch (error) {
        console.error('Error fetching portfolio for sync:', error);
        return null;
    }
}
