interface ExpLevel {
    level: number;
    lowerBound: number;
    upperBound: number;
    progress: number;
    color: string;
}

export type PlayerLevelBadgeIcon = 'crown' | 'diamond' | 'star';

const EXP_LEVEL_COLOR = 'hsl(var(--foreground))';

export function getExpLevelColor(_level: number) {
    return {
        color: EXP_LEVEL_COLOR
    };
}

export function getExpLevel(exp: number) {
    const normalizedExp = Math.max(0, Math.floor(Number(exp) || 0));
    const level = Math.floor(normalizedExp / 100) + 1;
    const lowerBound = (level - 1) * 100;
    const upperBound = level * 100;
    const levelColor = getExpLevelColor(level);
    const res: ExpLevel = {
        level,
        lowerBound,
        upperBound,
        progress: 0,
        color: levelColor.color
    };

    res.progress = Math.round(
        ((normalizedExp - res.lowerBound) / (res.upperBound - res.lowerBound)) * 1000
    )
        / 10;

    return res;
}

export function getPlayerExp(player: { exp?: unknown; extraExp?: unknown; } | null | undefined) {
    if (!player || player.exp === undefined || player.exp === null) {
        return null;
    }

    const baseExp = Number(player.exp);
    const extraExp = Number(player.extraExp ?? 0);

    if (!Number.isFinite(baseExp) || !Number.isFinite(extraExp)) {
        return null;
    }

    return Math.max(0, Math.floor(baseExp + extraExp));
}

export function getPlayerExpLevel(
    player: { exp?: unknown; extraExp?: unknown; } | null | undefined
) {
    const exp = getPlayerExp(player);

    return exp === null ? null : getExpLevel(exp);
}

export function getLevelBadgeCounts(level: number) {
    const normalizedLevel = Math.max(0, Math.floor(Number(level) || 0));
    const totalStars = Math.floor(normalizedLevel / 5);
    const totalDiamonds = Math.floor(totalStars / 5);

    return {
        crowns: Math.floor(totalDiamonds / 5),
        diamonds: totalDiamonds % 5,
        stars: totalStars % 5
    };
}

export function getLevelBadgeIcons(level: number, showAllTiers = false): PlayerLevelBadgeIcon[] {
    const counts = getLevelBadgeCounts(level);
    let visibleCounts = counts;

    if (!showAllTiers && counts.crowns > 0) {
        visibleCounts = { crowns: counts.crowns, diamonds: 0, stars: 0 };
    } else if (!showAllTiers && counts.diamonds > 0) {
        visibleCounts = { crowns: 0, diamonds: counts.diamonds, stars: 0 };
    }

    return [
        ...Array.from({ length: visibleCounts.crowns }, () => 'crown' as const),
        ...Array.from({ length: visibleCounts.diamonds }, () => 'diamond' as const),
        ...Array.from({ length: visibleCounts.stars }, () => 'star' as const)
    ];
}
