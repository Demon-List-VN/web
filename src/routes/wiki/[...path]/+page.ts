import * as sdk from '$lib/client/sdk';
export async function load({ fetch, params, url }) {
	const { path } = params;
	const parts: string[] = path.split('/');
	const locale = parts[0];
	const src = parts.slice(1).join('/');
	const page = Number(url.searchParams.get('page') || '1');
	const limit = 12;

	const detail = await sdk.getWikiDetail(src, locale, (page - 1) * limit, limit, { fetch });

	return { locale, detail };
}
