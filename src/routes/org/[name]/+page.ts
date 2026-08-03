import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';

export async function load({ params, fetch }: Parameters<PageLoad>[0]) {
    const response = await fetch(
        `${import.meta.env.VITE_API_URL}/organizations/${encodeURIComponent(params.name)}`
    );

    if (!response.ok) {
        throw error(404, 'Organization not found');
    }

    return { organization: await response.json() };
}
