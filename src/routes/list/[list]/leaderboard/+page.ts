import { redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';

type RedirectPageData = {
	leaderboard: any[];
	count: number;
};

export const load: PageLoad<RedirectPageData> = async ({ params, url }) => {
	const query = new URLSearchParams(url.searchParams);
	query.set('tab', 'leaderboard');

	if (!query.get('page')) {
		query.set('page', '1');
	}

	throw redirect(307, `/lists/${params.list}?${query.toString()}`);

	return {
		leaderboard: [] as any[],
		count: 0
	};
};