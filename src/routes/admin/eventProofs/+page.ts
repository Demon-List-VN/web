import type { ApiListResponse } from '$lib/client/apiTypes';
import * as sdk from '$lib/client/sdk';
export async function load({ params, url, fetch }) {
    const proofs = await sdk.get<ApiListResponse>(`/events/proofs?accepted=false`, { fetch })

    return {
        data: proofs
    }
}
