import { redirect, type Handle } from '@sveltejs/kit';

import { DEFAULT_LOCALE, resolveLocale, resolveLocaleFromCountry } from './i18n';

const LOCALE_PREFIX_RE = /^\/(en|vi)(\/.*)?$/;
const PVP_PATH_RE = /^(\/(?:en|vi))?\/pvp(\/matches(?:\/.*)?)?\/?$/;

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

function getPvpRedirectPath(pathname: string, fallbackLang: string) {
	const match = pathname.match(PVP_PATH_RE);
	if (!match) return null;

	const localePrefix = match[1] ?? `/${fallbackLang}`;
	const matchPath = match[2] ?? '';

	return `${localePrefix}${matchPath ? `/versus${matchPath}` : '/versus'}`;
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
	const countryCode = request.headers.get('cf-ipcountry');
	const inferredLocale = resolveLocaleFromCountry(countryCode);
	const fallbackLocale = cookieLocale ?? inferredLocale ?? DEFAULT_LOCALE;
	const pvpRedirectPath = getPvpRedirectPath(pathname, fallbackLocale);

	if (pvpRedirectPath) {
		throw redirect(301, `${pvpRedirectPath}${url.search}`);
	}

	if (match) {
		return resolve(event);
	}

	// No /en or /vi prefix: choose a language and redirect.
	const targetLang = fallbackLocale;

	throw redirect(307, buildLocalizedUrl(targetLang, pathname, url.search));
};
