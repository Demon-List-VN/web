import * as sdk from '$lib/client/sdk';
export async function load({ params, url, fetch }) {
	const events = await sdk.getEvents({ fetch });

	return { events };
}
