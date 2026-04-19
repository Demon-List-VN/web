import type { PageLoad } from './$types';

const LEVELS_PAGE_SIZE = 50;

export const load: PageLoad = async ({ params, fetch }) => {
	try {
		const query = new URLSearchParams({
			start: '0',
			end: String(LEVELS_PAGE_SIZE - 1)
		});
		const res = await fetch(`${import.meta.env.VITE_API_URL}/lists/${params.id}?${query.toString()}`);

		if (!res.ok) {
			const payload = await res.json().catch(() => null);
			return { list: null, error: payload?.error || 'Failed to load list' };
		}

		const list = await res.json();
		return { list, error: null };
	} catch {
		return { list: null, error: 'Failed to load list' };
	}
};
