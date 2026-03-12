import type { ApiFetch, LeaderboardEntry } from '$lib/client/apiTypes';
import * as sdk from '$lib/client/sdk';
async function getTotalPage(fetch: ApiFetch, list: string) {
    const prop = (list == 'dl' ? 'overallRank' : `${list}rank`);
    
    const query = {
        start: '0',
        end: '0',
        sortBy: prop,
        ascending: 'false'
    };

    const res = await sdk.getLeaderboard(list, query, { fetch });

    return res[0][prop];
}

async function getLeaderboard(fetch: ApiFetch, list: string, page: number) {
    const query = {
        start: String((page - 1) * 50),
        end: String(page * 50 - 1),
        sortBy: list == 'dl' ? 'overallRank' : `${list}rank`,
        ascending: 'true'
    };

    const res = await sdk.getLeaderboard(list, query, { fetch });

    return res
}

export async function load({ params, url, fetch }) {
    const page = parseInt(url.searchParams.get('page') || '1')

    return {
        count: await getTotalPage(fetch, params.list),
        leaderboard: await getLeaderboard(fetch, params.list, page)
    };
};
