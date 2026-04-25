import type { PageLoad } from './$types';

export async function load({ params, fetch }: Parameters<PageLoad>[0]) {
	const res = await fetch(`${import.meta.env.VITE_API_URL}/record-card/${params.id}`);
	if (!res.ok) {
		return { notFound: true };
	}
	const data = await res.json();
	return { ...data, id: params.id };
}
