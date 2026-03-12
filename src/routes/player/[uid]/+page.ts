import { redirect } from '@sveltejs/kit';
import { getPlayerData } from './getPlayerData.js';
import { isActive } from '$lib/client/isSupporterActive.js';
import { error } from '@sveltejs/kit';
import * as sdk from '$lib/client/sdk';

export async function load({ params, url, fetch }) {
	const { uid } = params;
	const player = await sdk.getPlayer(uid, { fetch });

	if (isActive(player.supporterUntil ?? null)) {
		throw redirect(307, `/@${player.name}`);
	}

	return await getPlayerData(player, fetch);
}
