import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params, url, fetch }) => {
	const page = parseInt(url.searchParams.get('page') || '1');
	const query = new URLSearchParams({
		start: String((page - 1) * 50),
		end: String(page * 50 - 1)
	});

	try {
		const res = await fetch(`${import.meta.env.VITE_API_URL}/lists/${params.id}/leaderboard?${query.toString()}`);
		if (!res.ok) {
			const payload = await res.json().catch(() => null);
			return { list: null, leaderboard: [], count: 0, error: payload?.error || 'Failed to load leaderboard' };
		}

		const payload = await res.json();

		return {
			list: payload?.list ?? null,
			count: payload?.total ?? 0,
			leaderboard: payload?.data ?? [],
			error: null
		};
	} catch {
		return { list: null, leaderboard: [], count: 0, error: 'Failed to load leaderboard' };
	}
};