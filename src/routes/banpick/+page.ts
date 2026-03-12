import type { ApiListResponse, ApiObject } from '$lib/client/apiTypes';
import * as sdk from '$lib/client/sdk';
export async function load({ params, url, fetch }) {
    const uidA = url.searchParams.get("a");
    const uidB = url.searchParams.get("b");
    const levelIDs: number[] = JSON.parse(url.searchParams.get("levels")!);
    const levels: ApiObject[] = [];

    const players: ApiListResponse =
        await (await sdk.fetch(`/players/batch`, {
            fetch,
            method: "POST",
            body: JSON.stringify({
                batch: [uidA, uidB],
            }),
            headers: {
                "Content-Type": "application/json",
            },
        }))
            .json();

    for (const i of levelIDs) {
        levels.push(
            await sdk.get<ApiObject>(`/levels/${i}?fromGD=1`, { fetch }),
        );
    }

    return {
        players: players,
        levels: levels
    }
}
