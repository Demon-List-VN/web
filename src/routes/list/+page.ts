import { redirect } from '@sveltejs/kit';

export async function load({ url }) {
	throw redirect(307, `/lists${url.search}`);
}