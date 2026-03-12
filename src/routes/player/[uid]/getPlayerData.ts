import type { ApiFetch, ApiListResponse, PlayerSummary } from '$lib/client/apiTypes';
import * as sdk from '$lib/client/sdk';
export async function getPlayerData(player: PlayerSummary, fetch: ApiFetch) {
	const records = await sdk.getPlayerProfileRecords(player.uid, { fetch });
	const events = await sdk.getPlayerEvents(player.uid, { fetch });

	return {
		player: player,
		records: records,
		events: events
	};
}
