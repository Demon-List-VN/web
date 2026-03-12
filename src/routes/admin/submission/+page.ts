import type { ApiListResponse } from '$lib/client/apiTypes';
import * as sdk from '$lib/client/sdk';
export async function load({ params, fetch }) {
    const query = new URLSearchParams({
        end: '500',
        isChecked: 'false',
    })

    const res = await sdk.get<ApiListResponse>(`/records?${query.toString()}`, { fetch })

    return {
        data: res
    }
};
