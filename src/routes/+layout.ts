import { waitLocale } from 'svelte-i18n';
import type { LayoutLoad } from './$types';

import { setAppLocale } from '../i18n';

export const load: LayoutLoad = async ({ data }) => {
	// Set the locale synchronously before the first render on both the server
	// and client so SSR markup matches the hydrated markup (prevents the
	// layout "jumping" when the locale swaps after mount).
	setAppLocale(data.initialLocale);
	await waitLocale();

	return { ...data };
};
