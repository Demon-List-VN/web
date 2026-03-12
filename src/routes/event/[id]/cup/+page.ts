import * as sdk from '$lib/client/sdk';
export async function load({ params, url, fetch }) {
	const { id } = params;
	const event = await sdk.getEvent(id, { fetch });
	const playerBatch = event.data.players.map((player) =>
		typeof player === 'string' ? player : player.uid
	);
	event.data.players = await sdk.postPlayersBatch(playerBatch, { fetch });

	const mp = new Map();

	for (const i of event.data.players) {
		mp.set(i.uid, i);
	}

	for (let i = 0; i < event.data.bracket.length; i++) {
		event.data.bracket[i] = mp.get(event.data.bracket[i]);
	}

	return event;
}
