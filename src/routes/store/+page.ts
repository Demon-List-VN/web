import type { PageLoad } from './$types';

export async function load({ params, url, fetch }: Parameters<PageLoad>[0]) {
    const data: any =
        await (await fetch(`${import.meta.env.VITE_API_URL}/store/products`))
            .json();

    return {
        data: data,
        featured: data.filter((item: any) => item.featured === true),
    };
}
