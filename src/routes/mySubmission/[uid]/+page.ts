import type { ApiListResponse } from '$lib/client/apiTypes';
import * as sdk from '$lib/client/sdk';
export async function load({ params, fetch }) {
	const [records, levelSubmissions] = await Promise.all([
		sdk.getPlayerSubmissions(params.uid, { fetch }),
		sdk.getUserLevelSubmissions(params.uid, { fetch })
	]);

	return {
		records,
		levelSubmissions
	};
}
