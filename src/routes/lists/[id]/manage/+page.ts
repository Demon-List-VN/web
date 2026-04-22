import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params, fetch, url }) => {
	try {
		const query = new URLSearchParams();
		if (url.searchParams.get('itemSort') === 'created_at') {
			query.set('itemSort', 'created_at');
		}

		const res = await fetch(
			`${import.meta.env.VITE_API_URL}/lists/${params.id}${query.size ? `?${query.toString()}` : ''}`
		);

		if (!res.ok) {
			const payload = await res.json().catch(() => null);
			const error = payload?.error || 'Failed to load list';

			if (error === 'This list is private') {
				return { list: null, error: null, requiresAuthRecovery: true };
			}

			return { list: null, error, requiresAuthRecovery: false };
		}

		const list = await res.json();
		return { list, error: null, requiresAuthRecovery: false };
	} catch {
		return { list: null, error: 'Failed to load list', requiresAuthRecovery: false };
	}
};
