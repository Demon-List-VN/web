import { isActive } from '$lib/client/isSupporterActive.js';
import { redirect } from '@sveltejs/kit';
import { getPlayerData } from '../player/[uid]/getPlayerData.js';
import { error } from '@sveltejs/kit';
import type { PlayerSummary } from '$lib/client/apiTypes';
import * as sdk from '$lib/client/sdk';

export async function load({ params, url, fetch }) {
	const { username } = params;
	const player = await sdk.get<PlayerSummary>(`/players/@${username}`, { fetch });

	if (!isActive(player.supporterUntil ?? null)) {
		throw error(404, {
			message: 'Not found'
		});
	}

	return await getPlayerData(player, fetch);
}
