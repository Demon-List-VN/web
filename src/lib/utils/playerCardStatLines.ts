import type { PlayerRankedListSummary } from '$lib/types/playerRankedList';

export const PLAYER_CARD_DEFAULT_STAT_LINES = ['dl', 'pl', 'fl', 'cl'] as const;
export const PLAYER_CARD_STAT_LINE_COUNT = PLAYER_CARD_DEFAULT_STAT_LINES.length;

export type PlayerCardStatLineOption = {
	value: string;
	label: string;
};

export function normalizePlayerCardStatLines(value: unknown) {
	return PLAYER_CARD_DEFAULT_STAT_LINES.map((defaultValue, index) => {
		const configuredValue = Array.isArray(value) ? value[index] : null;

		return typeof configuredValue === 'string' && configuredValue.trim().length
			? configuredValue.trim()
			: defaultValue;
	});
}

export function buildPlayerCardStatLineOptions(
	listSummaries: PlayerRankedListSummary[],
	legacyLabels: Record<(typeof PLAYER_CARD_DEFAULT_STAT_LINES)[number], string>
) {
	const options: PlayerCardStatLineOption[] = PLAYER_CARD_DEFAULT_STAT_LINES.map((value) => ({
		value,
		label: legacyLabels[value]
	}));
	const seen = new Set(options.map((option) => option.value));

	for (const summary of listSummaries) {
		const value = summary.identifier || summary.slug || String(summary.id);

		if (seen.has(value)) {
			continue;
		}

		options.push({
			value,
			label: summary.title
		});
		seen.add(value);
	}

	return options;
}