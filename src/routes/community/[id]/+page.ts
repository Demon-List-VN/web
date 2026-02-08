import { error } from '@sveltejs/kit';

export async function load({ params, fetch }) {
	const { id } = params;

	try {
		const [postRes, commentsRes] = await Promise.all([
			fetch(`${import.meta.env.VITE_API_URL}/community/posts/${id}`),
			fetch(`${import.meta.env.VITE_API_URL}/community/posts/${id}/comments`)
		]);

		if (!postRes.ok) {
			throw error(404, 'Post not found');
		}

		const post = await postRes.json();
		const comments = commentsRes.ok ? await commentsRes.json() : [];

		return { post, comments };
	} catch (e: any) {
		if (e?.status === 404) throw e;
		throw error(404, 'Post not found');
	}
}
