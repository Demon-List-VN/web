import type { PageLoad } from './$types';

const SUPPORTER_REVENUE_START_DATE = '2026-06-08T00:00:00+07:00';
const DEFAULT_INTERVAL_MS = 30 * 24 * 60 * 60 * 1000;

function supporterRevenueIntervalMs() {
    const startMs = new Date(SUPPORTER_REVENUE_START_DATE)
        .getTime();
    const intervalMs = Date.now() - startMs;

    return Number.isFinite(intervalMs)
        ? Math.max(1, intervalMs)
        : DEFAULT_INTERVAL_MS;
}

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
