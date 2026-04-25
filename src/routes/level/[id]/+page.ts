import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';

export async function load({ params, url, fetch }: Parameters<PageLoad>[0]) {
	const { id } = params;

	try {
		const levelRes = await fetch(`${import.meta.env.VITE_API_URL}/levels/${id}`);

		if (levelRes.ok) {
			let starredLists: any[] = [];

			try {
				const starredRes = await fetch(`${import.meta.env.VITE_API_URL}/lists/levels/${id}/starred`);
				if (starredRes.ok) {
					starredLists = await starredRes.json();
				}
			} catch {
				starredLists = [];
			}

			return {
				level: (await levelRes.json()) as any,
				starredLists
			};
		}

		const gdbrowserLevel: any = await (await fetch(`${import.meta.env.VITE_API_URL}/levels/${id}?fromGD=1`)).json();

		if (!('demonList' in gdbrowserLevel)) {
			return {
				gdbrowser: gdbrowserLevel,
				pointercrate: {
					video: 'https://www.youtube.com/watch?v=XIMLoLxmTDw',
					requirement: -1
				},
				starredLists: []
			};
		}

		const pointercrateLevel: any = await (
			await fetch(`https://pointercrate.com/api/v2/demons/listed?name=${gdbrowserLevel.name}`)
		).json();

		return {
			gdbrowser: gdbrowserLevel,
			pointercrate: pointercrateLevel[0],
			starredLists: []
		};
	} catch {
		throw error(404, 'Level does not exist');
	}
}
