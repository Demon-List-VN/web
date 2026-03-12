import { error } from '@sveltejs/kit';
import type { GdBrowserLevel, PointercrateLevel } from '$lib/client/apiTypes';
import * as sdk from '$lib/client/sdk';

export async function load({ params, url, fetch }) {
	const { id } = params;

	if (url.searchParams.get('list') == 'other') {
		const gdbrowserLevel = await sdk.getLevelFromGD(id, { fetch });

		if (!('demonList' in gdbrowserLevel)) {
			return {
				gdbrowser: gdbrowserLevel,
				pointercrate: {
					video: 'https://www.youtube.com/watch?v=XIMLoLxmTDw',
					requirement: -1
				}
			};
		}

		const pointercrateLevel = (await (
			await fetch(`https://pointercrate.com/api/v2/demons/listed?name=${gdbrowserLevel.name}`)
		).json()) as PointercrateLevel[];

		return {
			gdbrowser: gdbrowserLevel,
			pointercrate: pointercrateLevel[0]
		};
	}

	try {
		return {
			level: await sdk.getLevel(id, { fetch })
		};
	} catch {
		throw error(404, 'Level does not exist');
	}
}
