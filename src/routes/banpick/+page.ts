import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';

const LEVEL_COUNT = 6;

function parseLevelIDs(value: string | null): number[] {
    if (!value) {
        throw error(400, 'Missing levels query parameter');
    }

    let parsed: unknown;

    try {
        parsed = JSON.parse(value);
    } catch {
        // Support links where URL-encoded brackets lost their percent signs and a
        // period was used as a separator, e.g. "[5B123,456.789,...]".
        const normalized = value
            .trim()
            .replace(/^\[?5B(?=\d)/i, '[')
            .replace(/(\d)\.(?=\d)/g, '$1,')
            .replace(/5D$/i, ']');

        try {
            parsed = JSON.parse(normalized);
        } catch {
            throw error(400, 'Invalid levels query parameter');
        }
    }

    if (
        !Array.isArray(parsed)
        || parsed.length !== LEVEL_COUNT
        || !parsed.every((id) => Number.isSafeInteger(id) && id > 0)
    ) {
        throw error(400, `The levels query parameter must contain ${LEVEL_COUNT} positive integers`);
    }

    return parsed;
}

export async function load({ url, fetch }: Parameters<PageLoad>[0]) {
    const uidA = url.searchParams.get('a');
    const uidB = url.searchParams.get('b');
    const levelIDs = parseLevelIDs(url.searchParams.get('levels'));
    const levels = [];

    const players: any[] = await (await fetch(`${import.meta.env.VITE_API_URL}/players/batch`, {
        method: 'POST',
        body: JSON.stringify({
            batch: [uidA, uidB]
        }),
        headers: {
            'Content-Type': 'application/json'
        }
    }))
        .json();

    for (const i of levelIDs) {
        levels.push(
            await (await fetch(`${import.meta.env.VITE_API_URL}/levels/${i}?fromGD=1`))
                .json() as any
        );
    }

    return {
        players: players,
        levels: levels
    };
}
