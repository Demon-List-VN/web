import type { ApiListResponse, ApiObject } from '$lib/client/apiTypes';
import * as sdk from '$lib/client/sdk';
export async function load({ params, url, fetch }) {
	const uidA = url.searchParams.get('a');
	const uidB = url.searchParams.get('b');
	const levelIDs: number[] = JSON.parse(url.searchParams.get('levels')!);
	const levels: ApiObject[] = [];

	const players: ApiListResponse = await sdk.postPlayersBatch(
		[uidA, uidB].filter((uid): uid is string => Boolean(uid)),
		{ fetch }
	);

	for (const i of levelIDs) {
		levels.push(await sdk.getLevelFromGD(i, { fetch }));
	}

	return {
		players: players,
		levels: levels
	};
}
