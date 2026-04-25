import { redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';

type RedirectPageData = {
	levels: any[];
};

function getLocalePrefix(pathname: string) {
	return pathname.match(/^\/(en|vi)(?=\/|$)/)?.[0] ?? '';
}

export const load: PageLoad<RedirectPageData> = async ({ params, url }) => {
	throw redirect(307, `${getLocalePrefix(url.pathname)}/lists/${params.list}${url.search}`);

	return {
		levels: []
	};
};
