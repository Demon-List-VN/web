import type { ApiListResponse, SupporterProgress } from '$lib/client/apiTypes';
import * as sdk from '$lib/client/sdk';
export async function load({ fetch }) {
	try {
		const intervalMs = 30 * 24 * 60 * 60 * 1000; // 30 days
		const [topBuyers, progress] = await Promise.all([
			sdk.get<ApiListResponse>(`/buyers/top?interval=${intervalMs}`, { fetch }),
			sdk.get<SupporterProgress>(`/buyers/progress?interval=${intervalMs}`, { fetch })
		]);
		
		return { topBuyers, progress };
	} catch (error) {
		console.error('Failed to fetch top buyers:', error);
		return {
			topBuyers: [],
			progress: {
				serverCostPercent: 0,
				minecraftServerPercent: 0
			}
		};
	}
}
