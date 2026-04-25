import type { PageLoad } from './$types';

export async function load({ params, fetch }: Parameters<PageLoad>[0]) {
    const res: any[] = await (await fetch(`${import.meta.env.VITE_API_URL}/levels/new`)).json()

    return {
        data: res
    }
};