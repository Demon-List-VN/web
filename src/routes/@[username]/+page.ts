import { isActive } from '$lib/client/isSupporterActive.js';
import { getPlayerData } from '../player/[uid]/getPlayerData.js';
import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';

export async function load({ params, url, fetch }: Parameters<PageLoad>[0]) {
	const { username } = params;
	const player: any = await (
		await fetch(`${import.meta.env.VITE_API_URL}/players/@${username}`)
	).json();

	if (!isActive(player.supporterUntil)) {
		throw error(404, {
			message: 'Not found'
		});
	}

	return await getPlayerData(player, fetch, url);
}
