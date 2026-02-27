export async function load({ fetch }) {
	try {
		const intervalMs = 30 * 24 * 60 * 60 * 1000; // 30 days
		const [topBuyers, progress] = await Promise.all([
			(await fetch(`${import.meta.env.VITE_API_URL}/buyers/top?interval=${intervalMs}`)).json(),
			(await fetch(`${import.meta.env.VITE_API_URL}/buyers/progress?interval=${intervalMs}`)).json()
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
