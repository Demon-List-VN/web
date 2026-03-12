import type { ApiListResponse } from '$lib/client/apiTypes';
import * as sdk from '$lib/client/sdk';
export async function load({ params, fetch }) {
    const [records, levelSubmissions] = await Promise.all([
        sdk.get<ApiListResponse>(`/players/${params.uid}/submissions?end=500`, { fetch }),
        sdk.get<ApiListResponse>(`/level-submissions/user/${params.uid}`, { fetch })
    ])

    return {
        records,
        levelSubmissions
    }
};
