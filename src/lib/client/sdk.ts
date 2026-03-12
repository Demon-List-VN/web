import { browser } from '$app/environment';
import supabase from '$lib/client/supabase';

type FetchLike = typeof globalThis.fetch;

interface ApiRequestInit extends RequestInit {
	fetch?: FetchLike;
}

export function url(path: string) {
	if (/^https?:\/\//.test(path)) {
		return path;
	}

	return `${import.meta.env.VITE_API_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

async function withAuthorization(headers?: HeadersInit) {
	const nextHeaders = new Headers(headers);

	if (nextHeaders.has('Authorization') || !browser) {
		return nextHeaders;
	}

	try {
		const { data, error } = await supabase.auth.getSession();

		if (error) {
			throw error;
		}

		const token = data.session?.access_token;

		if (token) {
			nextHeaders.set('Authorization', `Bearer ${token}`);
		}
	} catch (error) {
		console.error('Failed to get session token for API request:', error);
	}

	return nextHeaders;
}

export async function fetch(path: string, init: ApiRequestInit = {}) {
	const { fetch: fetchImpl = globalThis.fetch, headers, ...rest } = init;

	return fetchImpl(url(path), {
		...rest,
		headers: await withAuthorization(headers)
	});
}

export async function get<T>(path: string, init: Omit<ApiRequestInit, 'method' | 'body'> = {}) {
	return (await fetch(path, { ...init, method: 'GET' })).json() as Promise<T>;
}
