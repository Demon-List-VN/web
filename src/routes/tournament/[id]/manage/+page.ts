import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';

export async function load({ params, fetch }: Parameters<PageLoad>[0]) {
    const res = await fetch(`${import.meta.env.VITE_API_URL}/tournaments/${params.id}`);

    if (!res.ok) {
        throw error(res.status, 'Tournament not found');
    }

    return { tournament: await res.json(), id: params.id };
}
