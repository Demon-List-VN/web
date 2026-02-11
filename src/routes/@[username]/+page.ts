import { isActive } from '$lib/client/isSupporterActive.js';
import { redirect } from '@sveltejs/kit';
import { getPlayerData } from '../player/[uid]/getPlayerData.js';
import { error } from '@sveltejs/kit';

export async function load({ params, url, fetch }) {
	const { username } = params;
	const player: any = await (
		await fetch(`${import.meta.env.VITE_API_URL}/players/@${username}`)
	).json();

	if (!isActive(player.supporterUntil)) {
		throw error(404, {
			message: 'Not found'
		});
	}

	return await getPlayerData(player, fetch);
}
