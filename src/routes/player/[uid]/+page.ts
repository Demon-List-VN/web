import { redirect } from '@sveltejs/kit';
import { getPlayerData } from './getPlayerData.js';
import { isActive } from '$lib/client/isSupporterActive.js';
import { error } from '@sveltejs/kit';
import type { PlayerSummary } from '$lib/client/apiTypes';
import * as sdk from '$lib/client/sdk';

export async function load({ params, url, fetch }) {
	const { uid } = params;
	const player = await sdk.get<PlayerSummary>(`/players/${uid}`, { fetch });

	if (isActive(player.supporterUntil ?? null)) {
		throw redirect(307, `/@${player.name}`);
	}

	return await getPlayerData(player, fetch);
}
