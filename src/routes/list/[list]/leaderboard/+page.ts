import { redirect } from '@sveltejs/kit';

export async function load({ params, url }) {
	const query = new URLSearchParams(url.searchParams);
	query.set('tab', 'leaderboard');

	if (!query.get('page')) {
		query.set('page', '1');
	}

	throw redirect(307, `/lists/${params.list}?${query.toString()}`);
}