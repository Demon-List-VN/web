import type { PageLoad } from './$types';

export async function load({ fetch, url }: Parameters<PageLoad>[0]) {
	const interval = url.searchParams.get('interval') || '30';
	
	let intervalMs: number;
	if (interval === '7') intervalMs = 7 * 24 * 60 * 60 * 1000;
	else if (interval === '14') intervalMs = 14 * 24 * 60 * 60 * 1000;
	else intervalMs = 30 * 24 * 60 * 60 * 1000; // default to 30 days
	
	const buyers: any = await (await fetch(`${import.meta.env.VITE_API_URL}/buyers/top?interval=${intervalMs}`)).json();

	return { buyers, interval };
}
