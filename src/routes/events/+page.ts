import type { ApiListResponse } from '$lib/client/apiTypes';
import * as sdk from '$lib/client/sdk';
export async function load({ params, url, fetch }) {
	const events = await sdk.get<ApiListResponse>(`/events`, { fetch });

	return { events };
}
