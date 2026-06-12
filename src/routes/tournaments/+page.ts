import type { PageLoad } from './$types';

export async function load({ fetch }: Parameters<PageLoad>[0]) {
    const res = await fetch(`${import.meta.env.VITE_API_URL}/tournaments`);
    const data = await res.json();

    return { tournaments: data?.tournaments ?? [] };
}
