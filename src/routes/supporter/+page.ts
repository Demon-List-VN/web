import * as sdk from '$lib/client/sdk';
export async function load({ fetch }) {
	try {
		const intervalMs = 30 * 24 * 60 * 60 * 1000; // 30 days
		const [topBuyers, progress] = await Promise.all([
			sdk.getTopBuyers(intervalMs, { fetch }),
			sdk.getBuyerProgress(intervalMs, { fetch })
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
