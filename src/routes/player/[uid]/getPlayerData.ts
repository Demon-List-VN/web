import type { ApiFetch, ApiListResponse, PlayerSummary } from '$lib/client/apiTypes';
import * as sdk from '$lib/client/sdk';
export async function getPlayerData(player: PlayerSummary, fetch: ApiFetch) {
	const records = await sdk.get<ApiListResponse>(
		`/players/${player.uid}/records?sortBy=pt&end=500&isChecked=true&ascending=false`,
		{ fetch }
	);
	const events = await sdk.get<ApiListResponse>(`/players/${player.uid}/events`, { fetch });

	return {
		player: player,
		records: records,
		events: events
	};
}
