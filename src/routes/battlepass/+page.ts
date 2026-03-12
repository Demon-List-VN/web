import type { PageLoad } from './$types';
import type { ApiObject } from '$lib/client/apiTypes';
import * as sdk from '$lib/client/sdk';

export const load: PageLoad = async ({ fetch }) => {
	try {
		const seasonRes = await sdk.fetch(`/battlepass`, { fetch });

		if (!seasonRes.ok) {
			return {
				season: null
			};
		}

		const season = (await seasonRes.json()) as ApiObject;

		return {
			season
		};
	} catch (e) {
		return {
			season: null
		};
	}
};
