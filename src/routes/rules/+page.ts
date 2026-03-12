import type { PageLoad } from './$types';
import * as sdk from '$lib/client/sdk';

export const load: PageLoad = async ({ fetch }) => {
	const rules = await sdk.getRules({ fetch });

	return {
		rules
	};
};
