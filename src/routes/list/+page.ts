import { redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';

function getLocalePrefix(pathname: string) {
	return pathname.match(/^\/(en|vi)(?=\/|$)/)?.[0] ?? '';
}

export async function load({ url }: Parameters<PageLoad>[0]) {
	throw redirect(307, `${getLocalePrefix(url.pathname)}/lists${url.search}`);
}