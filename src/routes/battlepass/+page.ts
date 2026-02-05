import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch }) => {
	try {
		const seasonRes = await fetch(`${import.meta.env.VITE_API_URL}/battlepass`);

		if (!seasonRes.ok) {
			return {
				season: null
			};
		}

		const season = await seasonRes.json();

		return {
			season
		};
	} catch (e) {
		return {
			season: null
		};
	}
};
