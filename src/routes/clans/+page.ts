import type { PageLoad } from './$types';

const PAGE_SIZE = 24;

export async function load({ params, url, fetch }: Parameters<PageLoad>[0]) {
    const clan: any = await (await fetch(`${import.meta.env.VITE_API_URL}/clans?start=0&end=${PAGE_SIZE - 1}&sortBy=boostedUntil&ascending=false`)).json()

    return {
        data: clan,
        pageSize: PAGE_SIZE
    }
};