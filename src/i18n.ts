import { addMessages, init, locale } from 'svelte-i18n';

import en from './public/locales/en.json';
import vi from './public/locales/vi.json';

export const DEFAULT_LOCALE = 'en';

addMessages('en', en);
addMessages('vi', vi);

init({
	fallbackLocale: DEFAULT_LOCALE,
	initialLocale: DEFAULT_LOCALE
});

export function resolveLocale(candidate?: string | null) {
	if (!candidate) {
		return DEFAULT_LOCALE;
	}

	const normalized = candidate.toLowerCase();

	if (normalized.startsWith('en')) {
		return 'en';
	}

	if (normalized.startsWith('vi')) {
		return 'vi';
	}

	return DEFAULT_LOCALE;
}

export function resolveLocaleFromCountry(candidate?: string | null) {
	if (!candidate) {
		return null;
	}

	return candidate.toUpperCase() === 'VN' ? 'vi' : 'en';
}

export function setAppLocale(candidate?: string | null) {
	const nextLocale = resolveLocale(candidate);
	locale.set(nextLocale);
	return nextLocale;
}
