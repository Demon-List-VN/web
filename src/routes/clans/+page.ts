import * as sdk from '$lib/client/sdk';
const PAGE_SIZE = 24;

export async function load({ params, url, fetch }) {
	const clan = await sdk.getClans(
		{
			start: '0',
			end: String(PAGE_SIZE - 1),
			sortBy: 'boostedUntil',
			ascending: 'false'
		},
		{ fetch }
	);

	return {
		data: clan,
		pageSize: PAGE_SIZE
	};
}
