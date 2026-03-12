import type { ApiObject } from '$lib/client/apiTypes';
import * as sdk from '$lib/client/sdk';
export async function load({ params, url, fetch }) {
    const { id } = params
    const clan = await sdk.get<ApiObject>(`/clans/${id}`, { fetch })

    return clan
};
