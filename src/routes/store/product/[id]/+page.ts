import type { StoreProduct } from '$lib/client/apiTypes';
import * as sdk from '$lib/client/sdk';
export async function load({ params, url, fetch }) {
    const { id } = params
    const data = await sdk.get<StoreProduct>(`/store/product/${id}`, { fetch })

    return data
};
