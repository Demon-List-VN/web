import type { PageLoad } from './$types';
import type { Rule } from '$lib/client/apiTypes';
import * as sdk from '$lib/client/sdk';

export const load: PageLoad = async ({ fetch }) => {
	const rules = await sdk.get<Rule[]>(`/rules`, { fetch });
	
	return {
		rules
	};
};
