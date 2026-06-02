interface ExpLevel {
    level: number;
    lowerBound: number;
    upperBound: number;
    progress: number;
    hue: number;
    color: string;
}

export type PlayerLevelBadgeIcon = 'crown' | 'diamond' | 'star';

const LEVEL_HUE_START = 108;
const LEVEL_HUE_STEP = 3.6;
const MAX_HUE = 360;

function normalizeHue(hue: number) {
    return Math.round((((hue % MAX_HUE) + MAX_HUE) % MAX_HUE) * 10) / 10;
}

export function getExpLevelColor(level: number) {
    const normalizedLevel = Math.max(1, Math.floor(Number(level) || 1));
    const hue = normalizeHue(LEVEL_HUE_START + (normalizedLevel - 1) * LEVEL_HUE_STEP);
    const formattedHue = Number.isInteger(hue) ? String(hue) : hue.toFixed(1);

    return {
        hue,
        color: `hsl(${formattedHue}, 100%, 50%)`
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
        hue: levelColor.hue,
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

export function getPlayerExpLevelStyle(
    player: { exp?: unknown; extraExp?: unknown; } | null | undefined
) {
    const expLevel = getPlayerExpLevel(player);

    return expLevel ? `--player-level-color: ${expLevel.color};` : '';
}

export function getLevelBadgeCounts(level: number) {
    const normalizedLevel = Math.max(0, Math.floor(Number(level) || 0));
    const totalStars = Math.floor(normalizedLevel / 10);

    return {
        crowns: Math.floor(totalStars / 100),
        diamonds: Math.floor((totalStars % 100) / 10),
        stars: totalStars % 10
    };
}

export function getLevelBadgeIcons(level: number): PlayerLevelBadgeIcon[] {
    const counts = getLevelBadgeCounts(level);

    return [
        ...Array.from({ length: counts.crowns }, () => 'crown' as const),
        ...Array.from({ length: counts.diamonds }, () => 'diamond' as const),
        ...Array.from({ length: counts.stars }, () => 'star' as const)
    ];
}
