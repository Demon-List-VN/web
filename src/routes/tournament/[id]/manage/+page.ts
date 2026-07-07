import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';

export async function load({ params, fetch }: Parameters<PageLoad>[0]) {
    const res = await fetch(`${import.meta.env.VITE_API_URL}/tournaments/${params.id}`);

    if (!res.ok) {
        const payload = await res.json()
            .catch(() => null);
        const message = payload?.error || 'Tournament not found';

        if (res.status === 404 || res.status === 403) {
            return {
                tournament: null,
                id: params.id,
                error: null,
                requiresAuthRecovery: true
            };
        }

        throw error(res.status, message);
    }

    return {
        tournament: await res.json(),
        id: params.id,
        error: null,
        requiresAuthRecovery: false
    };
}
