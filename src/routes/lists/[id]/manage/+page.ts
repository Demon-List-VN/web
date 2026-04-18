import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params, fetch }) => {
	try {
		const res = await fetch(`${import.meta.env.VITE_API_URL}/lists/${params.id}`);

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
