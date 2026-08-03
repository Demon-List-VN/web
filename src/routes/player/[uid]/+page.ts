import { redirect } from '@sveltejs/kit';
import { getPlayerData } from './getPlayerData.js';
import { isActive } from '$lib/client/isSupporterActive.js';
import type { PageLoad } from './$types';

export async function load({ params, url, fetch }: Parameters<PageLoad>[0]) {
    const { uid } = params;
    const player: any = await (await fetch(`${import.meta.env.VITE_API_URL}/players/${uid}`))
        .json();

    if (player.isOrganization && player.name) {
        throw redirect(307, `/org/${encodeURIComponent(player.name)}`);
    }

    if (isActive(player.supporterUntil)) {
        throw redirect(307, `/@${player.name}`);
    }

    return await getPlayerData(player, fetch, url);
}
