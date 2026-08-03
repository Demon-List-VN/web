import type { PageLoad } from './$types';

export async function load({ fetch }: Parameters<PageLoad>[0]) {
    const response = await fetch(
        `${import.meta.env.VITE_API_URL}/organizations?start=0&end=99`
    );

    return {
        organizations: response.ok ? (await response.json()).data || [] : []
    };
}
