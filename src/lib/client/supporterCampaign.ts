export const SUPPORTER_REVENUE_START_DATE = '2026-07-01T00:00:00+07:00';
export const PRIZE_POOL_REVENUE_SHARE = 0.5;

const DEFAULT_INTERVAL_MS = 30 * 24 * 60 * 60 * 1000;

export function supporterRevenueIntervalMs(now = Date.now()) {
    const startMs = new Date(SUPPORTER_REVENUE_START_DATE)
        .getTime();
    const intervalMs = now - startMs;

    return Number.isFinite(intervalMs)
        ? Math.max(1, intervalMs)
        : DEFAULT_INTERVAL_MS;
}

export function supporterPrizePool(totalRevenue: number | string | null | undefined) {
    const parsedRevenue = Number(totalRevenue);

    if (!Number.isFinite(parsedRevenue)) {
        return 0;
    }

    return Math.max(0, parsedRevenue * PRIZE_POOL_REVENUE_SHARE);
}
