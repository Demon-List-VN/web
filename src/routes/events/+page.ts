import type { PageLoad } from './$types';

export async function load({ params, url, fetch }: Parameters<PageLoad>[0]) {
	const events: any = await (await fetch(`${import.meta.env.VITE_API_URL}/events`)).json();

	return { events };
}
