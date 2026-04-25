import type { PageLoad } from './$types';

export async function load({ fetch }: Parameters<PageLoad>[0]) {
    const recordsQuery = new URLSearchParams({
        end: '500',
        isChecked: 'false'
    });
    const listsQuery = new URLSearchParams({
        limit: '100'
    });

    const [recordsResponse, listsResponse] = await Promise.all([
        fetch(`${import.meta.env.VITE_API_URL}/records?${recordsQuery.toString()}`),
        fetch(`${import.meta.env.VITE_API_URL}/lists?${listsQuery.toString()}`)
    ]);

    const records: any[] = recordsResponse.ok ? await recordsResponse.json() : [];
    const listsPayload = listsResponse.ok ? await listsResponse.json() : { data: [] };

    return {
        data: records,
        lists: Array.isArray(listsPayload) ? listsPayload : listsPayload.data || []
    };
}