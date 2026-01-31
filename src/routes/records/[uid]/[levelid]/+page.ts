import { error } from '@sveltejs/kit';

export async function load({ params, fetch }) {
	const { uid, levelid } = params;

	try {
		const [recordRes, deathCountRes] = await Promise.all([
			fetch(`${import.meta.env.VITE_API_URL}/records/${uid}/${levelid}`),
			fetch(`${import.meta.env.VITE_API_URL}/deathCount/${uid}/${levelid}`)
		]);

		if (!recordRes.ok) {
			throw error(recordRes.status, 'Record not found');
		}

		const record = await recordRes.json();

		let deathCount: number[] = [];
		try {
			const deathCountData = await deathCountRes.json();
			deathCount = deathCountData.count || Array(100).fill(0);
		} catch {
			deathCount = Array(100).fill(0);
		}

		if (!record || record.error) {
			throw error(404, 'Record not found');
		}

		return {
			record,
			deathCount
		};
	} catch (e: any) {
		if (e.status) {
			throw e;
		}
		throw error(500, 'Failed to load record');
	}
}
