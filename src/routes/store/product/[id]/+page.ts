import type { PageLoad } from './$types';

export async function load({ params, url, fetch }: Parameters<PageLoad>[0]) {
    const { id } = params
    const data: any = await (await fetch(`${import.meta.env.VITE_API_URL}/store/product/${id}`)).json()

    return data
};