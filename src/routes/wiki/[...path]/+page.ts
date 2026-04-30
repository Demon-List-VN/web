import { redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';

export async function load({ fetch, params, url }: Parameters<PageLoad>[0]) {
	const parts: string[] = url.pathname.split('/');

	if(parts[0] === '') {
		parts.shift();
	}

	const locale = parts[0];
	const src = parts.slice(2).join('/');
	const page = Number(url.searchParams.get('page') || '1');
	const limit = 12;

	if (!src) {
		throw redirect(307, '/wiki');
	}

	const detail: any = await (
		await fetch(
			`${import.meta.env.VITE_API_URL}/wiki/files/${src}?locale=${locale}&offset=${(page - 1) * limit}&limit=${limit}&sortBy=path`
		)
	).json();

	return { locale, detail };
}
