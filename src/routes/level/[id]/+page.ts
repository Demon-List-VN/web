import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';

export async function load({ params, url, fetch }: Parameters<PageLoad>[0]) {
    const { id } = params;

    try {
        const levelRes = await fetch(`${import.meta.env.VITE_API_URL}/levels/${id}`);

        if (levelRes.ok) {
            let starredLists: any[] = [];
            let recordLists: any[] = [];

            try {
                const [starredRes, recordListsRes] = await Promise.all([
                    fetch(`${import.meta.env.VITE_API_URL}/lists/levels/${id}/starred`),
                    fetch(`${import.meta.env.VITE_API_URL}/lists/levels/${id}/eligible`)
                ]);

                if (starredRes.ok) {
                    starredLists = await starredRes.json();
                }

                if (recordListsRes.ok) {
                    recordLists = (await recordListsRes.json())
                        .filter((list: any) => list.id > 0 && list.nonGlobalRecordsEnabled);
                }
            } catch {
                starredLists = [];
                recordLists = [];
            }

            return {
                level: (await levelRes.json()) as any,
                starredLists,
                recordLists
            };
        }

        const gdbrowserLevel: any =
            await (await fetch(`${import.meta.env.VITE_API_URL}/levels/${id}?fromGD=1`)).json();

        if (!('demonList' in gdbrowserLevel)) {
            return {
                gdbrowser: gdbrowserLevel,
                pointercrate: {
                    video: 'https://www.youtube.com/watch?v=XIMLoLxmTDw',
                    requirement: -1
                },
                starredLists: [],
                recordLists: []
            };
        }

        const pointercrateLevel: any = await (
            await fetch(`https://pointercrate.com/api/v2/demons/listed?name=${gdbrowserLevel.name}`)
        ).json();

        return {
            gdbrowser: gdbrowserLevel,
            pointercrate: pointercrateLevel[0],
            starredLists: [],
            recordLists: []
        };
    } catch {
        throw error(404, 'Level does not exist');
    }
}
