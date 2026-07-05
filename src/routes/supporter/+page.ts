import type { PageLoad } from './$types';
import { supporterRevenueIntervalMs } from '$lib/client/supporterCampaign';

export async function load({ fetch }: Parameters<PageLoad>[0]) {
    try {
        const intervalMs = supporterRevenueIntervalMs();
        const [topBuyers, progress] = await Promise.all([
            (await fetch(`${import.meta.env.VITE_API_URL}/buyers/top?interval=${intervalMs}`))
                .json(),
            (await fetch(`${import.meta.env.VITE_API_URL}/buyers/progress?interval=${intervalMs}`))
                .json()
        ]);

        return { topBuyers, progress };
    } catch (error) {
        console.error('Failed to fetch top buyers:', error);

        return {
            topBuyers: [],
            progress: {
                totalRevenue: 0,
                serverCostPercent: 0,
                minecraftServerPercent: 0
            }
        };
    }
}
