const DAY_MS = 24 * 60 * 60 * 1000;

export interface SupporterTierInfo {
	tier: number;
	label: string;
	daysLeft: number;
	currentTierStart: number;
	nextTierDays: number;
	progress: number;
	color: string;
}

const SUPPORTER_TIER_COLORS: Record<number, string> = {
	1: 'var(--supporter-tier-1)',
	2: 'var(--supporter-tier-2)',
	3: 'var(--supporter-tier-3)',
	4: 'var(--supporter-tier-4)',
	5: 'var(--supporter-tier-5)',
	6: 'var(--supporter-tier-6)'
};

export function getSupporterDaysLeft(supporterUntil?: string | null, now = new Date()): number {
	if (!supporterUntil) {
		return 0;
	}

	const expiryTime = new Date(supporterUntil).getTime();

	if (!Number.isFinite(expiryTime)) {
		return 0;
	}

	const diff = expiryTime - now.getTime();

	return diff > 0 ? Math.ceil(diff / DAY_MS) : 0;
}

export function getSupporterTierFromDays(daysLeft: number): number | null {
	if (!Number.isFinite(daysLeft) || daysLeft <= 0) {
		return null;
	}

	if (daysLeft <= 30) return 1;
	if (daysLeft <= 90) return 2;
	if (daysLeft <= 180) return 3;
	if (daysLeft <= 360) return 4;
	if (daysLeft <= 720) return 5;

	return 6 + Math.floor((daysLeft - 721) / 360);
}

export function getSupporterTier(supporterUntil?: string | null, now = new Date()): number | null {
	return getSupporterTierFromDays(getSupporterDaysLeft(supporterUntil, now));
}

export function getSupporterTierLabel(tier: number | null): string {
	switch (tier) {
		case 1:
			return 'Supporter';
		case 2:
			return 'Supporter+';
		case 3:
			return 'Supporter++';
		case 4:
			return 'Supporter+++';
		case 5:
			return 'Legendary Supporter';
		default:
			return tier && tier >= 6 ? `Ascendant Supporter T${tier}` : 'Supporter';
	}
}

export function getSupporterTierColor(tier: number | null): string {
	if (!tier) {
		return SUPPORTER_TIER_COLORS[1];
	}

	return SUPPORTER_TIER_COLORS[Math.min(tier, 6)] ?? SUPPORTER_TIER_COLORS[6];
}

export function getSupporterTierStyle(tier: number | null): string {
	return `--supporter-tier-color: ${getSupporterTierColor(tier)};`;
}

export function getSupporterTierBounds(tier: number): { start: number; end: number } {
	switch (tier) {
		case 1:
			return { start: 0, end: 30 };
		case 2:
			return { start: 30, end: 90 };
		case 3:
			return { start: 90, end: 180 };
		case 4:
			return { start: 180, end: 360 };
		case 5:
			return { start: 360, end: 720 };
		default: {
			const normalizedTier = Math.max(6, tier);
			const start = 720 + (normalizedTier - 6) * 360;
			return { start, end: start + 360 };
		}
	}
}

export function getSupporterTierInfo(
	supporterUntil?: string | null,
	now = new Date()
): SupporterTierInfo | null {
	const daysLeft = getSupporterDaysLeft(supporterUntil, now);
	const tier = getSupporterTierFromDays(daysLeft);

	if (!tier) {
		return null;
	}

	const { start, end } = getSupporterTierBounds(tier);
	const progress = Math.max(0, Math.min(100, ((daysLeft - start) / (end - start)) * 100));

	return {
		tier,
		label: getSupporterTierLabel(tier),
		daysLeft,
		currentTierStart: start,
		nextTierDays: end,
		progress,
		color: getSupporterTierColor(tier)
	};
}
