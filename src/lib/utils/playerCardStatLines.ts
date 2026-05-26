import type { PlayerRankedListSummary } from '$lib/types/playerRankedList';

export const PLAYER_CARD_STAT_LINE_COUNT = 4;
export const PLAYER_CARD_SHOW_ELO_STAT_KEY = 'showEloStat';
export const PLAYER_CARD_SHOW_PVP_ELO_STAT_KEY = 'showPvpEloStat';
export const DEFAULT_PLAYER_CARD_STAT_LINE_SLUGS = ['dl', 'pl', 'cl', 'fl'] as const;

export type PlayerCardStatLineOption = {
    value: number;
    label: string;
};

export type DefaultPlayerCardStatLineSlug = (typeof DEFAULT_PLAYER_CARD_STAT_LINE_SLUGS)[number];

function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

export function shouldShowPlayerCardEloStat(overviewData: unknown): boolean {
    return !isRecord(overviewData) || overviewData[PLAYER_CARD_SHOW_ELO_STAT_KEY] !== false;
}

export function shouldShowPlayerCardPvpEloStat(overviewData: unknown): boolean {
    return !isRecord(overviewData) || overviewData[PLAYER_CARD_SHOW_PVP_ELO_STAT_KEY] !== false;
}

export function setPlayerCardEloStatVisibility(
    overviewData: unknown,
    showEloStat: boolean
): Record<string, unknown> {
    const nextOverviewData = isRecord(overviewData) ? { ...overviewData } : {};

    if (showEloStat) {
        delete nextOverviewData[PLAYER_CARD_SHOW_ELO_STAT_KEY];
    } else {
        nextOverviewData[PLAYER_CARD_SHOW_ELO_STAT_KEY] = false;
    }

    return nextOverviewData;
}

export function setPlayerCardPvpEloStatVisibility(
    overviewData: unknown,
    showPvpEloStat: boolean
): Record<string, unknown> {
    const nextOverviewData = isRecord(overviewData) ? { ...overviewData } : {};

    if (showPvpEloStat) {
        delete nextOverviewData[PLAYER_CARD_SHOW_PVP_ELO_STAT_KEY];
    } else {
        nextOverviewData[PLAYER_CARD_SHOW_PVP_ELO_STAT_KEY] = false;
    }

    return nextOverviewData;
}

export function normalizePlayerCardStatLines(value: unknown): number[] {
    if (!Array.isArray(value)) {
        return [];
    }

    const result: number[] = [];
    const seen = new Set<number>();

    for (const entry of value) {
        const listId = typeof entry === 'number'
            ? entry
            : typeof entry === 'string' && entry.trim().length && Number.isFinite(Number(entry))
                ? Number(entry)
                : null;

        if (listId === null || !Number.isFinite(listId) || seen.has(listId)) {
            continue;
        }

        result.push(listId);
        seen.add(listId);

        if (result.length >= PLAYER_CARD_STAT_LINE_COUNT) {
            break;
        }
    }

    return result;
}

export function resolvePlayerCardStatLineIds(
    configured: number[],
    listSummaries: PlayerRankedListSummary[]
): number[] {
    const summaryIds = new Set(listSummaries.map((summary) => summary.id));

    return configured.filter((id) => summaryIds.has(id));
}

export function buildPlayerCardStatLineOptions(
    listSummaries: PlayerRankedListSummary[]
): PlayerCardStatLineOption[] {
    const options: PlayerCardStatLineOption[] = [];
    const seen = new Set<number>();

    for (const summary of listSummaries) {
        if (seen.has(summary.id)) {
            continue;
        }

        options.push({
            value: summary.id,
            label: summary.title
        });
        seen.add(summary.id);
    }

    return options;
}
