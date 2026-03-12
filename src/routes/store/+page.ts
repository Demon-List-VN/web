import type { StoreProduct } from '$lib/client/apiTypes';
import * as sdk from '$lib/client/sdk';
export async function load({ params, url, fetch }) {
    const data = await sdk.get<StoreProduct[]>(`/store/products`, { fetch });

    return {
        data: data,
        featured: data.filter((item) => item.featured === true),
    };
}
