import { redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params, url }) => {
	const query = new URLSearchParams(url.searchParams);
	query.set('tab', 'leaderboard');

	if (!query.get('page')) {
		query.set('page', '1');
	}

	throw redirect(307, `/lists/${params.id}?${query.toString()}`);
};