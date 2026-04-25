import type { PageLoad } from './$types';

export async function load({ fetch }: Parameters<PageLoad>[0]) {
    const res: any = await (await fetch(`${import.meta.env.VITE_API_URL}/provinces`)).json()

    return {
        provinces: {
            list: Object
                .keys(res)
                .map(key => res[key])
                .toSorted((a: any, b: any) => {
                    return a.name > b.name ? 1 : -1
                }),
            map: res
        }
    }
}