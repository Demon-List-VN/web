import type { WikiDetail } from '$lib/client/apiTypes';
import * as sdk from '$lib/client/sdk';
export async function load({ fetch, params, url }) {
	const { path } = params;
	const parts: string[] = path.split('/');
	const locale = parts[0];
	const src = parts.slice(1).join('/');
	const page = Number(url.searchParams.get('page') || '1');
	const limit = 12;

	const detail = await sdk.get<WikiDetail>(
		`/wiki/files/${src}?locale=${locale}&offset=${(page - 1) * limit}&limit=${limit}&sortBy=path`,
		{ fetch }
	);

	return { locale, detail };
}
