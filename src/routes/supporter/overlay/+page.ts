import type { PageLoad } from './$types';

const SUPPORTER_REVENUE_START_DATE = '2026-06-08T00:00:00+07:00';
const DEFAULT_INTERVAL_MS = 30 * 24 * 60 * 60 * 1000;

export function supporterRevenueIntervalMs() {
    const startMs = new Date(SUPPORTER_REVENUE_START_DATE)
        .getTime();
    const intervalMs = Date.now() - startMs;

    return Number.isFinite(intervalMs)
        ? Math.max(1, intervalMs)
        : DEFAULT_INTERVAL_MS;
}

export const load: PageLoad = async ({ fetch }) => {
    const response = await fetch(
        `${import.meta.env.VITE_API_URL}/donations/overlay?interval=${supporterRevenueIntervalMs()}`
    );

    if (!response.ok) {
        return {
            overlay: {
                latestDonation: null,
                topSupporters: [],
                progress: {
                    totalRevenue: 0,
                    serverCostPercent: 0,
                    minecraftServerPercent: 0,
                    gdvnCupFundingPercent: 0,
                    hcmGrandFinalsPercent: 0,
                    hanoiQuarterfinalsPercent: 0
                }
            }
        };
    }

    return {
        overlay: await response.json()
    };
};
