import type { PvpMode } from '$lib/client/pvp';
import { isPvpRatingStable } from '$lib/client/pvp';
import type { PlayerLinkRankBadge } from '$lib/utils/customListRank';

export type PvpRankKey =
    | 'D'
    | 'D+'
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

const PVP_RANK_PROGRESS_MIN_RATING = 0;

function solidStyle(color: string, textColor = '#ffffff', shadow = '') {
    return `background: ${color}; color: ${textColor};${shadow}`;
}

export const PVP_RANKS: PvpRankDefinition[] = [
    {
        key: 'D',
        label: 'D',
        min: null,
        max: 499,
        color: '#717783',
        badgeStyle: solidStyle('#717783'),
        progressStyle: 'background: #717783;',
        summaryStyle: 'border-color: #717783;'
    },
    {
        key: 'D+',
        label: 'D+',
        min: 500,
        max: 699,
        color: '#9CA3AF',
        badgeStyle: solidStyle('#9CA3AF'),
        progressStyle: 'background: #9CA3AF;',
        summaryStyle: 'border-color: #9CA3AF;'
    },
    {
        key: 'C',
        label: 'C',
        min: 700,
        max: 899,
        color: '#6F9CAF',
        badgeStyle: solidStyle('#6F9CAF'),
        progressStyle: 'background: #6F9CAF;',
        summaryStyle: 'border-color: #6F9CAF;'
    },
    {
        key: 'C+',
        label: 'C+',
        min: 900,
        max: 1049,
        color: '#5795AF',
        badgeStyle: solidStyle('#5795AF'),
        progressStyle: 'background: #5795AF;',
        summaryStyle: 'border-color: #5795AF;'
    },
    {
        key: 'B',
        label: 'B',
        min: 1050,
        max: 1199,
        color: '#0284C7',
        badgeStyle: solidStyle('#0284C7'),
        progressStyle: 'background: #0284C7;',
        summaryStyle: 'border-color: #0284C7;'
    },
    {
        key: 'B+',
        label: 'B+',
        min: 1200,
        max: 1349,
        color: '#1D4ED8',
        badgeStyle: solidStyle('#1D4ED8'),
        progressStyle: 'background: #1D4ED8;',
        summaryStyle: 'border-color: #1D4ED8;'
    },
    {
        key: 'A',
        label: 'A',
        min: 1350,
        max: 1499,
        color: '#6D28D9',
        badgeStyle: solidStyle('#6D28D9'),
        progressStyle: 'background: #6D28D9;',
        summaryStyle: 'border-color: #6D28D9;'
    },
    {
        key: 'A+',
        label: 'A+',
        min: 1500,
        max: 1699,
        color: '#A855F7',
        badgeStyle: solidStyle('#A855F7'),
        progressStyle: 'background: #A855F7;',
        summaryStyle: 'border-color: #A855F7;'
    },
    {
        key: 'S',
        label: 'S',
        min: 1700,
        max: 1799,
        color: '#D94663',
        badgeStyle: solidStyle('#D94663'),
        progressStyle: 'background: #D94663;',
        summaryStyle: 'border-color: #D94663;'
    },
    {
        key: 'S+',
        label: 'S+',
        min: 1800,
        max: 1899,
        color: '#F04444',
        badgeStyle: solidStyle('#F04444'),
        progressStyle: 'background: #F04444;',
        summaryStyle: 'border-color: #F04444;'
    },
    {
        key: 'SS',
        label: 'SS',
        min: 1900,
        max: 1999,
        color: '#F5222D',
        badgeStyle: solidStyle('#F5222D'),
        progressStyle: 'background: #F5222D;',
        summaryStyle: 'border-color: #F5222D;'
    },
    {
        key: 'SS+',
        label: 'SS+',
        min: 2000,
        max: 2099,
        color: '#FF1F2D',
        badgeStyle: 'background: linear-gradient(135deg, #F5222D, #FF1F2D); color: #ffffff;',
        progressStyle: 'background: linear-gradient(90deg, #F5222D, #FF1F2D);',
        summaryStyle: 'border-color: #FF1F2D; box-shadow: 0 0 0 1px rgba(255, 31, 45, 0.22);'
    },
    {
        key: 'SSS',
        label: 'SSS',
        min: 2100,
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
    if (value === null || value === undefined || value === '') {
        return null;
    }

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
            player.pvp_platformer_rating,
            player.ratings?.platformer?.pvpRating,
            player.ratings?.platformer?.pvp_rating,
            player.platformerRating?.pvpRating,
            player.platformerRating?.pvp_rating,
            player.platformer_rating?.pvpRating,
            player.platformer_rating?.pvp_rating
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

    const rating = firstFinite([
        player.pvpRating,
        player.pvp_rating,
        player.ratings?.classic?.pvpRating,
        player.ratings?.classic?.pvp_rating,
        player.rating?.pvpRating,
        player.rating?.pvp_rating
    ]);

    return rating === null ? null : Math.round(rating);
}

export function getPvpRatingDeviationForMode(player: any, mode: PvpMode = 'classic') {
    if (!player) {
        return null;
    }

    if (mode === 'platformer') {
        const platformerDeviation = firstFinite([
            player.pvpPlatformerRatingDeviation,
            player.pvp_platformer_rating_deviation,
            player.ratings?.platformer?.pvpRatingDeviation,
            player.ratings?.platformer?.pvp_rating_deviation,
            player.platformerRating?.pvpRatingDeviation,
            player.platformerRating?.pvp_rating_deviation,
            player.platformer_rating?.pvpRatingDeviation,
            player.platformer_rating?.pvp_rating_deviation
        ]);

        if (platformerDeviation !== null) {
            return platformerDeviation;
        }

        return hasModeNormalizedRating(player, mode)
            ? firstFinite([player.pvpRatingDeviation, player.pvp_rating_deviation])
            : null;
    }

    return firstFinite([
        player.pvpRatingDeviation,
        player.pvp_rating_deviation,
        player.ratings?.classic?.pvpRatingDeviation,
        player.ratings?.classic?.pvp_rating_deviation,
        player.rating?.pvpRatingDeviation,
        player.rating?.pvp_rating_deviation
    ]);
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
