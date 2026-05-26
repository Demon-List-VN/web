import type { PvpMode } from '$lib/client/pvp';
import { isPvpRatingStable } from '$lib/client/pvp';
import type { PlayerLinkRankBadge } from '$lib/utils/customListRank';

export type PvpRankKey =
    | 'C'
    | 'C+'
    | 'B'
    | 'B+'
    | 'A'
    | 'A+'
    | 'S'
    | 'S+'
    | 'SS'
    | 'SS+'
    | 'SSS';

export type PvpRankDefinition = {
    key: PvpRankKey;
    label: PvpRankKey;
    min: number | null;
    max: number | null;
    color: string;
    badgeStyle: string;
    progressStyle: string;
    summaryStyle: string;
};

export type PvpRankCondition = {
    key: 'less' | 'range' | 'at_least';
    values: {
        min?: number;
        max?: number;
        rating?: number;
    };
};

export type PvpRankProgress = {
    currentRank: PvpRankDefinition;
    nextRank: PvpRankDefinition | null;
    progress: number;
};

const PVP_RANK_PROGRESS_MIN_RATING = 500;

function solidStyle(color: string, textColor = '#ffffff', shadow = '') {
    return `background: ${color}; color: ${textColor};${shadow}`;
}

export const PVP_RANKS: PvpRankDefinition[] = [
    {
        key: 'C',
        label: 'C',
        min: null,
        max: 699,
        color: '#9CA3AF',
        badgeStyle: solidStyle('#9CA3AF'),
        progressStyle: 'background: #9CA3AF;',
        summaryStyle: 'border-color: #9CA3AF;'
    },
    {
        key: 'C+',
        label: 'C+',
        min: 700,
        max: 799,
        color: '#94A3B8',
        badgeStyle: solidStyle('#94A3B8'),
        progressStyle: 'background: #94A3B8;',
        summaryStyle: 'border-color: #94A3B8;'
    },
    {
        key: 'B',
        label: 'B',
        min: 800,
        max: 899,
        color: '#22C55E',
        badgeStyle: solidStyle('#22C55E'),
        progressStyle: 'background: #22C55E;',
        summaryStyle: 'border-color: #22C55E;'
    },
    {
        key: 'B+',
        label: 'B+',
        min: 900,
        max: 999,
        color: '#14B8A6',
        badgeStyle: solidStyle('#14B8A6'),
        progressStyle: 'background: #14B8A6;',
        summaryStyle: 'border-color: #14B8A6;'
    },
    {
        key: 'A',
        label: 'A',
        min: 1000,
        max: 1149,
        color: '#3B82F6',
        badgeStyle: solidStyle('#3B82F6'),
        progressStyle: 'background: #3B82F6;',
        summaryStyle: 'border-color: #3B82F6;'
    },
    {
        key: 'A+',
        label: 'A+',
        min: 1150,
        max: 1299,
        color: '#6366F1',
        badgeStyle: solidStyle('#6366F1'),
        progressStyle: 'background: #6366F1;',
        summaryStyle: 'border-color: #6366F1;'
    },
    {
        key: 'S',
        label: 'S',
        min: 1300,
        max: 1449,
        color: '#A855F7',
        badgeStyle: solidStyle('#A855F7'),
        progressStyle: 'background: #A855F7;',
        summaryStyle: 'border-color: #A855F7;'
    },
    {
        key: 'S+',
        label: 'S+',
        min: 1450,
        max: 1599,
        color: '#D946EF',
        badgeStyle: solidStyle('#D946EF'),
        progressStyle: 'background: #D946EF;',
        summaryStyle: 'border-color: #D946EF;'
    },
    {
        key: 'SS',
        label: 'SS',
        min: 1600,
        max: 1799,
        color: '#EF4444',
        badgeStyle: solidStyle('#EF4444'),
        progressStyle: 'background: #EF4444;',
        summaryStyle: 'border-color: #EF4444;'
    },
    {
        key: 'SS+',
        label: 'SS+',
        min: 1800,
        max: 1999,
        color: '#F97316',
        badgeStyle: 'background: linear-gradient(135deg, #F97316, #FACC15); color: #111827;',
        progressStyle: 'background: linear-gradient(90deg, #F97316, #FACC15);',
        summaryStyle: 'border-color: #F97316; box-shadow: 0 0 0 1px rgba(250, 204, 21, 0.22);'
    },
    {
        key: 'SSS',
        label: 'SSS',
        min: 2000,
        max: null,
        color: '#FACC15',
        badgeStyle:
            'background: linear-gradient(135deg, #FACC15, #FFFFFF 48%, #A855F7); color: #111827; box-shadow: 0 0 9px rgba(250, 204, 21, 0.58), 0 0 14px rgba(168, 85, 247, 0.36);',
        progressStyle: 'background: linear-gradient(90deg, #FACC15, #FFFFFF, #A855F7);',
        summaryStyle:
            'border-color: #FACC15; box-shadow: 0 0 0 1px rgba(250, 204, 21, 0.28), 0 0 16px rgba(168, 85, 247, 0.22);'
    }
];

function finiteNumber(value: unknown) {
    const numberValue = Number(value);

    return Number.isFinite(numberValue) ? numberValue : null;
}

function firstFinite(values: unknown[]) {
    for (const value of values) {
        const numberValue = finiteNumber(value);

        if (numberValue !== null) {
            return numberValue;
        }
    }

    return null;
}

function hasModeNormalizedRating(player: any, mode: PvpMode) {
    return String(player?.mode || '') === mode;
}

export function getPvpRankCondition(rank: PvpRankDefinition): PvpRankCondition {
    if (rank.min === null && rank.max !== null) {
        return {
            key: 'less',
            values: { rating: rank.max + 1 }
        };
    }

    if (rank.min !== null && rank.max === null) {
        return {
            key: 'at_least',
            values: { rating: rank.min }
        };
    }

    return {
        key: 'range',
        values: {
            min: rank.min ?? 0,
            max: rank.max ?? 0
        }
    };
}

export function getPvpRatingForMode(player: any, mode: PvpMode = 'classic') {
    if (!player) {
        return null;
    }

    if (mode === 'platformer') {
        const platformerRating = firstFinite([
            player.pvpPlatformerRating,
            player.pvp_platformer_rating
        ]);

        if (platformerRating !== null) {
            return Math.round(platformerRating);
        }

        if (hasModeNormalizedRating(player, mode)) {
            const normalizedRating = firstFinite([player.pvpRating, player.pvp_rating]);

            return normalizedRating === null ? null : Math.round(normalizedRating);
        }

        return null;
    }

    const rating = firstFinite([player.pvpRating, player.pvp_rating]);

    return rating === null ? null : Math.round(rating);
}

export function getPvpRatingDeviationForMode(player: any, mode: PvpMode = 'classic') {
    if (!player) {
        return null;
    }

    if (mode === 'platformer') {
        const platformerDeviation = firstFinite([
            player.pvpPlatformerRatingDeviation,
            player.pvp_platformer_rating_deviation
        ]);

        if (platformerDeviation !== null) {
            return platformerDeviation;
        }

        return hasModeNormalizedRating(player, mode)
            ? firstFinite([player.pvpRatingDeviation, player.pvp_rating_deviation])
            : null;
    }

    return firstFinite([player.pvpRatingDeviation, player.pvp_rating_deviation]);
}

export function resolvePvpRank(
    rating: number | null | undefined,
    ratingDeviation: number | null | undefined
) {
    const ratingValue = finiteNumber(rating);

    if (ratingValue === null || !isPvpRatingStable(ratingDeviation)) {
        return null;
    }

    return PVP_RANKS.find((rank) =>
        (rank.min === null || ratingValue >= rank.min)
            && (rank.max === null || ratingValue <= rank.max)
    ) ?? null;
}

export function resolvePvpRankForPlayer(player: any, mode: PvpMode = 'classic') {
    return resolvePvpRank(
        getPvpRatingForMode(player, mode),
        getPvpRatingDeviationForMode(player, mode)
    );
}

export function resolvePvpRankBadge(
    player: any,
    mode: PvpMode = 'classic'
): PlayerLinkRankBadge | null {
    const rank = resolvePvpRankForPlayer(player, mode);

    if (!rank) {
        return null;
    }

    return {
        label: rank.label,
        name: `PvP ${rank.label}`,
        color: rank.color,
        style: rank.badgeStyle
    };
}

export function getPvpNextRankProgress(
    rating: number | null | undefined,
    ratingDeviation: number | null | undefined
): PvpRankProgress | null {
    const ratingValue = finiteNumber(rating);
    const currentRank = resolvePvpRank(ratingValue, ratingDeviation);

    if (ratingValue === null || !currentRank) {
        return null;
    }

    const currentIndex = PVP_RANKS.findIndex((rank) => rank.key === currentRank.key);
    const nextRank = PVP_RANKS[currentIndex + 1] ?? null;

    if (!nextRank?.min) {
        return {
            currentRank,
            nextRank: null,
            progress: 100
        };
    }

    const lowerBound = currentRank.min ?? PVP_RANK_PROGRESS_MIN_RATING;
    const progress = ((ratingValue - lowerBound) / (nextRank.min - lowerBound)) * 100;

    return {
        currentRank,
        nextRank,
        progress: Math.floor(Math.max(0, Math.min(100, progress)))
    };
}
