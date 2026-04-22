import type { LayoutServerLoad } from './$types';

import { resolveLocale, resolveLocaleFromCountry } from '../i18n';

export const load: LayoutServerLoad = async ({ cookies, request }) => {
	const cookieLocale = cookies.get('locale');
	const countryCode = request.headers.get('cf-ipcountry');
	const acceptLanguage = request.headers.get('accept-language');
	const inferredLocale = cookieLocale ? null : resolveLocaleFromCountry(countryCode);

	return {
		initialLocale: resolveLocale(cookieLocale ?? inferredLocale ?? acceptLanguage)
	};
};