export type CustomListRankBadge = {
	name: string;
	shorthand: string;
	color: string;
	minRating: number | null;
	minTop: number | null;
};

export type PlayerLinkRankBadge = {
	label: string;
	name: string;
	color: string;
};

export function createEmptyCustomListRankBadge(): CustomListRankBadge {
	return {
		name: '',
		shorthand: '',
		color: '#64748b',
		minRating: null,
		minTop: null
	};
}

function toFiniteNumber(value: unknown) {
	return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function toPositiveInteger(value: unknown) {
	return typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : null;
}

export function normalizeCustomListRankBadges(value: unknown): CustomListRankBadge[] {
	if (!Array.isArray(value)) {
		return [];
	}

	const normalized: CustomListRankBadge[] = [];

	for (const entry of value) {
		if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
			continue;
		}

		const name = typeof entry.name === 'string' ? entry.name.trim() : '';
		const shorthand = typeof entry.shorthand === 'string' ? entry.shorthand.trim() : name;
		const color = typeof entry.color === 'string' ? entry.color.trim() : '';
		const minRating = toFiniteNumber(entry.minRating);
		const minTop = toPositiveInteger(entry.minTop);

		if (!name || !color || (minRating == null && minTop == null)) {
			continue;
		}

		normalized.push({
			name,
			shorthand: shorthand || name,
			color,
			minRating,
			minTop
		});
	}

	return normalized;
}

export function resolveCustomListRankBadge(
	player: { rank?: number | null; score?: number | null } | null | undefined,
	rankBadges: CustomListRankBadge[] | null | undefined
): PlayerLinkRankBadge | null {
	if (!player || !rankBadges?.length) {
		return null;
	}

	const playerRank = typeof player.rank === 'number' ? player.rank : null;
	const playerScore = typeof player.score === 'number' ? player.score : null;

	for (const rankBadge of rankBadges) {
		const meetsRating =
			rankBadge.minRating == null || (playerScore != null && playerScore >= rankBadge.minRating);
		const meetsTop = rankBadge.minTop == null || (playerRank != null && playerRank <= rankBadge.minTop);

		if (meetsRating && meetsTop) {
			return {
				label: rankBadge.shorthand || rankBadge.name,
				name: rankBadge.name,
				color: rankBadge.color
			};
		}
	}

	return null;
}