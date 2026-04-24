import type { LayoutServerLoad } from './$types';

import { resolveLocale, resolveLocaleFromCountry } from '../i18n';

const LOCALE_PREFIX_RE = /^\/(en|vi)(?=\/|$)/;

export const load: LayoutServerLoad = async ({ cookies, request, url }) => {
	const urlLocale = url.pathname.match(LOCALE_PREFIX_RE)?.[1] ?? null;
	const cookieLocale = cookies.get('locale');
	const countryCode = request.headers.get('cf-ipcountry');
	const acceptLanguage = request.headers.get('accept-language');
	const inferredLocale = cookieLocale ? null : resolveLocaleFromCountry(countryCode);

	return {
		initialLocale: resolveLocale(urlLocale ?? cookieLocale ?? inferredLocale ?? acceptLanguage)
	};
};