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
