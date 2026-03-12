import { error } from '@sveltejs/kit';
import type { ApiListResponse, ApiObject } from '$lib/client/apiTypes';
import * as sdk from '$lib/client/sdk';

export async function load({ params, fetch }) {
	const { id } = params;

	try {
		const [postRes, commentsRes] = await Promise.all([
			sdk.fetch(`/community/posts/${id}`, { fetch }),
			sdk.fetch(`/community/posts/${id}/comments`, { fetch })
		]);

		if (!postRes.ok) {
			throw error(404, 'Post not found');
		}

		const post = (await postRes.json()) as ApiObject;
		const comments = commentsRes.ok ? ((await commentsRes.json()) as ApiListResponse) : [];

		return { post, comments };
	} catch (e: unknown) {
		if (typeof e === 'object' && e !== null && 'status' in e && e.status === 404) throw e;
		throw error(404, 'Post not found');
	}
}
