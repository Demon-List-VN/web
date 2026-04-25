import type { PageLoad } from './$types';

export async function load({ params, url, fetch }: Parameters<PageLoad>[0]) {
    const uidA = url.searchParams.get("a");
    const uidB = url.searchParams.get("b");
    const levelIDs: number[] = JSON.parse(url.searchParams.get("levels")!);
    const levels = [];

    const players: any[] =
        await (await fetch(`${import.meta.env.VITE_API_URL}/players/batch`, {
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
            await (await fetch(`${import.meta.env.VITE_API_URL}/levels/${i}?fromGD=1`)).json() as any,
        );
    }

    return {
        players: players,
        levels: levels
    }
}
