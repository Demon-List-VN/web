import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params, fetch }) => {
	try {
		const query = new URLSearchParams({
			submitGate: '1',
			cacheBust: String(Date.now())
		});
		const res = await fetch(`${import.meta.env.VITE_API_URL}/lists/${params.id}?${query.toString()}`, {
			cache: 'no-store'
		});

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
