import type { PageLoad } from './$types';

export async function load({ params, url, fetch }: Parameters<PageLoad>[0]) {
    const { id } = params;
    const event: any =
        await (await fetch(`${import.meta.env.VITE_API_URL}/events/${id}`))
            .json();
    event.data.players =
        await (await fetch(`${import.meta.env.VITE_API_URL}/players/batch`, {
            method: "POST",
            body: JSON.stringify({
                batch: event.data.players,
            }),
            headers: {
                "Content-Type": "application/json",
            },
        }))
            .json();

    const mp = new Map();

    for (const i of event.data.players) {
        mp.set(i.uid, i);
    }

    for (let i = 0; i < event.data.bracket.length; i++) {
        event.data.bracket[i] = mp.get(event.data.bracket[i]);
    }

    return event;
}
