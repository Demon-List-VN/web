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
