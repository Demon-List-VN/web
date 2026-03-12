import * as sdk from '$lib/client/sdk';
export async function upload(path: string, data: any, token: string) {
	const url = await (
		await sdk.fetch(`/storage/presign?path=${path}`, {
			method: 'GET',
			headers: {
				Authorization: 'Bearer ' + token
			}
		})
	).text();

	await fetch(url, {
		method: 'PUT',
		headers: {
			'Content-Type': 'text/plain'
		},
		body: data
	});
}
