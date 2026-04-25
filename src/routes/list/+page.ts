import { redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';

export async function load({ url }: Parameters<PageLoad>[0]) {
	throw redirect(307, `/lists${url.search}`);
}