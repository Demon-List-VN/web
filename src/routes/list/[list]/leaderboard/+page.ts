import { redirect } from '@sveltejs/kit';

export async function load({ params, url }) {
	throw redirect(307, `/lists/${params.list}/leaderboard${url.search}`);
}