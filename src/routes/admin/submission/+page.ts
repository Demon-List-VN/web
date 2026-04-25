import type { PageLoad } from './$types';

export async function load({ params, fetch }: Parameters<PageLoad>[0]) {
    const query = new URLSearchParams({
        end: '500',
        isChecked: 'false',
    })

    const res: any[] = await (await fetch(`${import.meta.env.VITE_API_URL}/records?${query.toString()}`)).json()

    return {
        data: res
    }
};