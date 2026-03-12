import * as sdk from '$lib/client/sdk';
export async function load({ params, url, fetch }) {
    const data = await sdk.getStoreProducts({ fetch });

    return {
        data: data,
        featured: data.filter((item) => item.featured === true),
    };
}
