import type { ApiListResponse } from '$lib/client/apiTypes';
import * as sdk from '$lib/client/sdk';
export async function load({ params, fetch }) {
    const res = await sdk.get<ApiListResponse>(`/levels/new`, { fetch })

    return {
        data: res
    }
};
