import type { CustomListRankBadge } from '$lib/utils/customListRank';

export type PlayerRankedListSummary = {
	id: number;
	slug: string | null;
	identifier: string;
	title: string;
	isOfficial: boolean;
	isVerified: boolean;
	mode: string;
	isPlatformer: boolean;
	rank: number;
	score: number;
	completedCount: number;
	lastRefreshedAt: string | null;
	rankBadges: CustomListRankBadge[];
};

export type PlayerListRecordEntry = {
	id: number | null;
	uid: string;
	levelId: number;
	point: number;
	no: number;
	createdAt?: string | null;
	progress: number;
	timestamp: number | null;
	acceptedManually: boolean;
	acceptedAuto: boolean;
	mobile?: boolean | null;
	refreshRate?: number | null;
	rankedList?: Pick<PlayerRankedListSummary, 'id' | 'identifier' | 'title' | 'isPlatformer'> | null;
	level: any;
	player: any;
	formulaScope: any;
};

export type PlayerListRecordsResponse = {
	list: any;
	data: PlayerListRecordEntry[];
	total: number;
	lastRefreshedAt: string | null;
};

export function resolvePlayerRankedListSelection(
	listSummaries: PlayerRankedListSummary[],
	requestedIdentifier: string | null | undefined
) {
	if (!listSummaries.length) {
		return null;
	}

	if (!requestedIdentifier) {
		return listSummaries[0];
	}

	return (
		listSummaries.find(
			(list) =>
				list.identifier === requestedIdentifier ||
				list.slug === requestedIdentifier ||
				String(list.id) === requestedIdentifier
		) || listSummaries[0]
	);
}

export function getPlayerRankedListScoreLabel(list: Pick<PlayerRankedListSummary, 'mode'> | null | undefined) {
	return list?.mode === 'top' ? 'Score' : 'Rating';
}
