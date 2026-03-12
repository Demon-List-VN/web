import type { PageLoad } from './$types';
import * as sdk from '$lib/client/sdk';

export const load: PageLoad = async ({ fetch }) => {
	try {
		const seasonRes = await sdk.fetchBattlepass({ fetch });

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
