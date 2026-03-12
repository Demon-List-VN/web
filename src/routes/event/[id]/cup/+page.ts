import type { EventResponse, PlayerSummary } from '$lib/client/apiTypes';
import * as sdk from '$lib/client/sdk';
export async function load({ params, url, fetch }) {
    const { id } = params;
    const event = await sdk.get<EventResponse>(`/events/${id}`, { fetch });
    event.data.players =
        await (await sdk.fetch(`/players/batch`, {
            fetch,
            method: "POST",
            body: JSON.stringify({
                batch: event.data.players,
            }),
            headers: {
                "Content-Type": "application/json",
            },
        })).json() as PlayerSummary[];

    const mp = new Map();

    for (const i of event.data.players) {
        mp.set(i.uid, i);
    }

    for (let i = 0; i < event.data.bracket.length; i++) {
        event.data.bracket[i] = mp.get(event.data.bracket[i]);
    }

    return event;
}
