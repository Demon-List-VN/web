import type { PlayerListRecordsResponse, PlayerRankedListSummary } from '$lib/types/playerRankedList';
import { resolvePlayerRankedListSelection } from '$lib/types/playerRankedList';

function normalizePlayerListRecordsResponse(
	value: unknown,
	fallback: PlayerListRecordsResponse
): PlayerListRecordsResponse {
	if (!value || typeof value !== 'object') {
		return fallback;
	}

	const response = value as Partial<PlayerListRecordsResponse>;

	return {
		list: response.list ?? fallback.list,
		data: Array.isArray(response.data) ? response.data : fallback.data,
		total: typeof response.total === 'number' ? response.total : fallback.total,
		lastRefreshedAt:
			typeof response.lastRefreshedAt === 'string' || response.lastRefreshedAt === null
				? response.lastRefreshedAt
				: fallback.lastRefreshedAt
	};
}

export async function getPlayerData(player: any, fetch: any, url: URL) {
	const emptyRecordsResponse: PlayerListRecordsResponse = {
		list: null,
		data: [],
		total: 0,
		lastRefreshedAt: null
	};

	const [listSummaries, events] = await Promise.all([
		(
			await fetch(`${import.meta.env.VITE_API_URL}/players/${player.uid}/lists`)
		).json() as Promise<PlayerRankedListSummary[]>,
		(
			await fetch(`${import.meta.env.VITE_API_URL}/players/${player.uid}/events`)
		).json() as Promise<any[]>
	]);

	const selectedList = resolvePlayerRankedListSelection(listSummaries, url.searchParams.get('list'));
	const listRecordResponses = await Promise.all(
		listSummaries.map(async (listSummary) => {
			let response = emptyRecordsResponse;

			try {
				const rawResponse = await (
					await fetch(
						`${import.meta.env.VITE_API_URL}/lists/${listSummary.id}/records?uid=${player.uid}&end=5000`
					)
				).json();
				response = normalizePlayerListRecordsResponse(rawResponse, emptyRecordsResponse);
			} catch {
				response = emptyRecordsResponse;
			}

			return {
				listSummary,
				response
			};
		})
	);

	const selectedListRecords: PlayerListRecordsResponse = selectedList
		? listRecordResponses.find(({ listSummary }) => listSummary.id === selectedList.id)?.response || emptyRecordsResponse
		: emptyRecordsResponse;

	const allListRecordData = listRecordResponses
		.flatMap(({ listSummary, response }) =>
			response.data.map((record) => ({
				...record,
				rankedList: {
					id: listSummary.id,
					identifier: listSummary.identifier,
					title: listSummary.title,
					isPlatformer: listSummary.isPlatformer
				}
			}))
		)
		.sort((left, right) => {
			const createdAtDiff = new Date(right.createdAt ?? 0).getTime() - new Date(left.createdAt ?? 0).getTime();

			if (createdAtDiff !== 0) {
				return createdAtDiff;
			}

			const timestampDiff = (right.timestamp ?? 0) - (left.timestamp ?? 0);

			if (timestampDiff !== 0) {
				return timestampDiff;
			}

			return right.point - left.point;
		});

	const allListRecords: PlayerListRecordsResponse = {
		list: null,
		data: allListRecordData,
		total: allListRecordData.length,
		lastRefreshedAt: listRecordResponses.reduce<string | null>((latest, { response }) => {
			if (!response.lastRefreshedAt) {
				return latest;
			}

			if (!latest || response.lastRefreshedAt > latest) {
				return response.lastRefreshedAt;
			}

			return latest;
		}, null)
	};

	return {
		player,
		listSummaries,
		selectedList,
		selectedListRecords,
		allListRecords,
		events
	};
}
