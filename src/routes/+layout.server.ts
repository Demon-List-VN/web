import type { LayoutServerLoad } from './$types';

import { resolveLocale } from '../i18n';

export const load: LayoutServerLoad = async ({ cookies, request }) => {
	const cookieLocale = cookies.get('locale');
	const acceptLanguage = request.headers.get('accept-language');

	return {
		initialLocale: resolveLocale(cookieLocale ?? acceptLanguage)
	};
};