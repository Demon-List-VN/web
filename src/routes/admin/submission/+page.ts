import * as sdk from '$lib/client/sdk';
export async function load({ params, fetch }) {
	const query = new URLSearchParams({
		end: '500',
		isChecked: 'false'
	});

	const res = await sdk.getRecords(Object.fromEntries(query), { fetch });

	return {
		data: res
	};
}
