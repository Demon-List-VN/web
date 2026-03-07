import { error } from '@sveltejs/kit';

export async function load({ params, url, fetch }) {
	const { id } = params;

	if (url.searchParams.get('list') == 'other') {
		const gdbrowserLevel: any = await (await fetch(`${import.meta.env.VITE_API_URL}/levels/${id}?fromGD=1`)).json();

		if (!('demonList' in gdbrowserLevel)) {
			return {
				gdbrowser: gdbrowserLevel,
				pointercrate: {
					video: 'https://www.youtube.com/watch?v=XIMLoLxmTDw',
					requirement: -1
				}
			};
		}

		const pointercrateLevel: any = await (
			await fetch(`https://pointercrate.com/api/v2/demons/listed?name=${gdbrowserLevel.name}`)
		).json();

		return {
			gdbrowser: gdbrowserLevel,
			pointercrate: pointercrateLevel[0]
		};
	}

	try {
		return {
			level: (await (await fetch(`${import.meta.env.VITE_API_URL}/levels/${id}`)).json()) as any
		};
	} catch {
		throw error(404, 'Level does not exist');
	}
}
