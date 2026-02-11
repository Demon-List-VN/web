import { redirect } from '@sveltejs/kit';
import { getPlayerData } from './getPlayerData.js';
import { isActive } from '$lib/client/isSupporterActive.js';
import { error } from '@sveltejs/kit';

export async function load({ params, url, fetch }) {
	const { uid } = params;
	const player: any = await (await fetch(`${import.meta.env.VITE_API_URL}/players/${uid}`)).json();

	if (isActive(player.supporterUntil)) {
		throw redirect(307, `/@${player.name}`);
	}
	
	return await getPlayerData(player, fetch);
}
