import type { PageLoad } from './$types';

const PAGE_SIZE = 12;

function getPublicTab(url: URL): 'custom' | 'official' {
	return url.searchParams.get('tab') === 'custom' ? 'custom' : 'official';
}

export const load: PageLoad = async ({ url, fetch }) => {
	const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
	const search = url.searchParams.get('search') || '';
	const tab = getPublicTab(url);
	const offset = (page - 1) * PAGE_SIZE;

	try {
		const params = new URLSearchParams({
			limit: String(PAGE_SIZE),
			offset: String(offset),
			kind: tab
		});

		if (search) {
			params.set('search', search);
		}

		const res = await fetch(`${import.meta.env.VITE_API_URL}/lists?${params.toString()}`);

		if (!res.ok) {
			return { lists: [], total: 0, page, pageSize: PAGE_SIZE, search, tab };
		}

		const payload = await res.json();

		return {
			lists: payload.data ?? [],
			total: payload.total ?? 0,
			page,
			pageSize: PAGE_SIZE,
			search,
			tab
		};
	} catch {
		return { lists: [], total: 0, page, pageSize: PAGE_SIZE, search, tab };
	}
};
