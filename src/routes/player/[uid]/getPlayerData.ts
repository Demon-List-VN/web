import type { PlayerListRecordsResponse, PlayerRankedListSummary } from '$lib/types/playerRankedList';
import { resolvePlayerRankedListSelection } from '$lib/types/playerRankedList';

export async function getPlayerData(player: any, fetch: any, url: URL) {
	const [listSummaries, events] = await Promise.all([
		(
			await fetch(`${import.meta.env.VITE_API_URL}/players/${player.uid}/lists`)
		).json() as Promise<PlayerRankedListSummary[]>,
		(
			await fetch(`${import.meta.env.VITE_API_URL}/players/${player.uid}/events`)
		).json() as Promise<any[]>
	]);

	const selectedList = resolvePlayerRankedListSelection(listSummaries, url.searchParams.get('list'));
	const selectedListRecords: PlayerListRecordsResponse = selectedList
		? await (
				await fetch(
					`${import.meta.env.VITE_API_URL}/lists/${selectedList.id}/records?uid=${player.uid}&end=5000`
				)
			).json()
		: {
				list: null,
				data: [],
				total: 0,
				lastRefreshedAt: null
			};

	return {
		player,
		listSummaries,
		selectedList,
		selectedListRecords,
		events
	};
}
