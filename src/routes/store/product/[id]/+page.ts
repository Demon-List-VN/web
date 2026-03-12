import * as sdk from '$lib/client/sdk';
export async function load({ params, url, fetch }) {
    const { id } = params
    const data = await sdk.getStoreProduct(id, { fetch })

    return data
};
