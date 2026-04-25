import { redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';

type RedirectPageData = {
	levels: any[];
};

export const load: PageLoad<RedirectPageData> = async ({ params, url }) => {
	throw redirect(307, `/lists/${params.list}${url.search}`);

	return {
		levels: []
	};
};
