import type { PlayerRankedListSummary } from '$lib/types/playerRankedList';

export const PLAYER_CARD_STAT_LINE_COUNT = 4;

export type PlayerCardStatLineOption = {
	value: number;
	label: string;
};

export function normalizePlayerCardStatLines(value: unknown): number[] {
	if (!Array.isArray(value)) {
		return [];
	}

	const result: number[] = [];
	const seen = new Set<number>();

	for (const entry of value) {
		const listId =
			typeof entry === 'number'
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
	const filtered = configured.filter((id) => summaryIds.has(id));

	if (filtered.length) {
		return filtered;
	}

	return listSummaries.slice(0, PLAYER_CARD_STAT_LINE_COUNT).map((summary) => summary.id);
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
