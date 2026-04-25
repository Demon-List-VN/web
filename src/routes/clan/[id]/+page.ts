import type { PageLoad } from './$types';

export async function load({ params, url, fetch }: Parameters<PageLoad>[0]) {
    const { id } = params
    const clan: any = await (await fetch(`${import.meta.env.VITE_API_URL}/clans/${id}`)).json()

    return clan
};