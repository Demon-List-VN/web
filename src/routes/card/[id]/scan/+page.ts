import type { ApiObject } from '$lib/client/apiTypes';
import * as sdk from '$lib/client/sdk';
export async function load({ params, url, fetch }) {
    const { id } = params
    const data = await sdk.getCard(id, { fetch })

    return data
};
