import { redirect, type Handle } from '@sveltejs/kit';

import { DEFAULT_LOCALE, resolveLocale, resolveLocaleFromCountry } from './i18n';

const LOCALE_PREFIX_RE = /^\/(en|vi)(\/.*)?$/;

function shouldSkipLocaleHandling(pathname: string) {
	if (pathname.startsWith('/_app/')) return true;
	if (pathname.startsWith('/api/')) return true;

	const lastSegment = pathname.split('/').pop() ?? '';

	// Skip static file-like requests (favicon.png, sitemap.xml, __data.json, ...)
	if (lastSegment.includes('.')) return true;

	return false;
}

function buildLocalizedUrl(lang: string, pathWithoutPrefix: string, search: string) {
	const rest = pathWithoutPrefix === '/' ? '' : pathWithoutPrefix;
	return `/${lang}${rest}${search}`;
}

export const handle: Handle = async ({ event, resolve }) => {
	const { url, cookies, request } = event;
	const pathname = url.pathname;

	if (shouldSkipLocaleHandling(pathname)) {
		return resolve(event);
	}

	const cookieLocaleRaw = cookies.get('locale');
	const cookieLocale = cookieLocaleRaw ? resolveLocale(cookieLocaleRaw) : null;
	const match = pathname.match(LOCALE_PREFIX_RE);

	if (match) {
		return resolve(event);
	}

	// No /en or /vi prefix: choose a language and redirect.
	let targetLang: string;

	if (cookieLocale) {
		targetLang = cookieLocale;
	} else {
		const countryCode = request.headers.get('cf-ipcountry');
		const inferred = resolveLocaleFromCountry(countryCode);
		targetLang = inferred ?? DEFAULT_LOCALE;
	}

	throw redirect(307, buildLocalizedUrl(targetLang, pathname, url.search));
};
