import type { PageLoad } from './$types';

export async function load({ params, fetch }: Parameters<PageLoad>[0]) {
    const { id } = params;
    const [clanResponse, activityResponse] = await Promise.all([
        fetch(`${import.meta.env.VITE_API_URL}/clans/${id}`),
        fetch(`${import.meta.env.VITE_API_URL}/clans/${id}/activity?limit=12`)
            .catch(() => null)
    ]);
    const clan: any = await clanResponse.json();
    const initialActivity = activityResponse?.ok
        ? await activityResponse.json()
        : null;

    return {
        ...clan,
        initialActivity
    };
}
