import { browser } from '$app/environment';
import type {
	ApiListResponse,
	ApiObject,
	EventResponse,
	GdBrowserLevel,
	LeaderboardEntry,
	ListEntry,
	MapPackWrapper,
	PlayerSummary,
	ProvinceMap,
	Rating,
	Rule,
	StoreProduct,
	SupporterProgress,
	WikiDetail
} from '$lib/client/apiTypes';

type FetchLike = typeof globalThis.fetch;

interface ApiRequestInit extends RequestInit {
	fetch?: FetchLike;
}

type GetRequestInit = Omit<ApiRequestInit, 'method' | 'body'>;

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
		const { default: supabase } = await import('$lib/client/supabase');
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

async function request(path: string, init: ApiRequestInit = {}) {
	const { fetch: fetchImpl = globalThis.fetch, headers, ...rest } = init;

	return fetchImpl(url(path), {
		...rest,
		headers: await withAuthorization(headers)
	});
}

async function getJson<T>(path: string, init: GetRequestInit = {}) {
	return (await request(path, { ...init, method: 'GET' })).json() as Promise<T>;
}

export async function fetch(path: string, init: ApiRequestInit = {}) {
	return request(path, init);
}

export async function get<T>(path: string, init: GetRequestInit = {}) {
	return getJson<T>(path, init);
}

export async function createPlayer(init: ApiRequestInit = {}) {
	return request('/players', { ...init, method: 'POST' });
}

export async function syncPlayerRole(init: ApiRequestInit = {}) {
	return request('/players/syncRole', { ...init, method: 'PATCH' });
}

export async function getPlayer(uid: string, init: GetRequestInit = {}) {
	return getJson<PlayerSummary>(`/players/${uid}`, init);
}

export async function getPlayerByUsername(username: string, init: GetRequestInit = {}) {
	return getJson<PlayerSummary>(`/players/@${username}`, init);
}

export async function getCachedPlayer(uid: string, init: GetRequestInit = {}) {
	return getJson<PlayerSummary>(`/players/${uid}?cached=true`, init);
}

export async function getPlayerRatings(uid: string, init: GetRequestInit = {}) {
	return getJson<Rating[]>(`/players/${uid}/records?ratingOnly=true`, init);
}

export async function getPlayerProfileRecords(uid: string, init: GetRequestInit = {}) {
	return getJson<ApiListResponse>(
		`/players/${uid}/records?sortBy=pt&end=500&isChecked=true&ascending=false`,
		init
	);
}

export async function getPlayerEvents(uid: string, init: GetRequestInit = {}) {
	return getJson<ApiListResponse>(`/players/${uid}/events`, init);
}

export async function getPlayerSubmissions(uid: string, init: GetRequestInit = {}) {
	return getJson<ApiListResponse>(`/players/${uid}/submissions?end=500`, init);
}

export async function getUserLevelSubmissions(uid: string, init: GetRequestInit = {}) {
	return getJson<ApiListResponse>(`/level-submissions/user/${uid}`, init);
}

export async function getProvinces(init: GetRequestInit = {}) {
	return getJson<ProvinceMap>('/provinces', init);
}

export async function getList(
	list: string,
	params: Record<string, string>,
	init: GetRequestInit = {}
) {
	return getJson<ListEntry[]>(`/list/${list}?${new URLSearchParams(params).toString()}`, init);
}

export async function getLeaderboard(
	list: string,
	params: Record<string, string>,
	init: GetRequestInit = {}
) {
	return getJson<LeaderboardEntry[]>(
		`/leaderboard/${list}?${new URLSearchParams(params).toString()}`,
		init
	);
}

export async function getClan(id: string, init: GetRequestInit = {}) {
	return getJson<ApiObject>(`/clans/${id}`, init);
}

export async function getClans(params: Record<string, string>, init: GetRequestInit = {}) {
	return getJson<ApiListResponse>(`/clans?${new URLSearchParams(params).toString()}`, init);
}

export async function getCard(id: string, init: GetRequestInit = {}) {
	return getJson<ApiObject>(`/card/${id}`, init);
}

export async function getItem(id: string, init: GetRequestInit = {}) {
	return getJson<ApiObject>(`/item/${id}`, init);
}

export async function getWikiDetail(
	src: string,
	locale: string,
	offset: number,
	limit: number,
	init: GetRequestInit = {}
) {
	return getJson<WikiDetail>(
		`/wiki/files/${src}?locale=${locale}&offset=${offset}&limit=${limit}&sortBy=path`,
		init
	);
}

export async function getLevel(id: string | number, init: GetRequestInit = {}) {
	return getJson<ApiObject>(`/levels/${id}`, init);
}

export async function getLevelFromGD(id: string | number, init: GetRequestInit = {}) {
	return getJson<GdBrowserLevel>(`/levels/${id}?fromGD=1`, init);
}

export async function getEvents(init: GetRequestInit = {}) {
	return getJson<ApiListResponse>('/events', init);
}

export async function getEvent(id: string, init: GetRequestInit = {}) {
	return getJson<EventResponse>(`/events/${id}`, init);
}

export async function getEventProofs(accepted: boolean, init: GetRequestInit = {}) {
	return getJson<ApiListResponse>(`/events/proofs?accepted=${accepted}`, init);
}

export async function getNewLevels(init: GetRequestInit = {}) {
	return getJson<ApiListResponse>('/levels/new', init);
}

export async function getTopBuyers(intervalMs: number, init: GetRequestInit = {}) {
	return getJson<ApiListResponse>(`/buyers/top?interval=${intervalMs}`, init);
}

export async function getBuyerProgress(intervalMs: number, init: GetRequestInit = {}) {
	return getJson<SupporterProgress>(`/buyers/progress?interval=${intervalMs}`, init);
}

export async function getStoreProducts(init: GetRequestInit = {}) {
	return getJson<StoreProduct[]>('/store/products', init);
}

export async function getStoreProduct(id: string, init: GetRequestInit = {}) {
	return getJson<StoreProduct>(`/store/product/${id}`, init);
}

export async function fetchStoragePresign(path: string, init: GetRequestInit = {}) {
	return request(`/storage/presign?path=${path}`, { ...init, method: 'GET' });
}

export async function fetchBattlepass(init: GetRequestInit = {}) {
	return request('/battlepass', { ...init, method: 'GET' });
}

export async function fetchBattlepassMappack(id: number, init: GetRequestInit = {}) {
	return request(`/battlepass/mappack/${id}`, { ...init, method: 'GET' });
}

export async function fetchBattlepassMappacks(init: GetRequestInit = {}) {
	return request('/battlepass/mappacks', { ...init, method: 'GET' });
}

export async function getRules(init: GetRequestInit = {}) {
	return getJson<Rule[]>('/rules', init);
}

export async function getRecords(params: Record<string, string>, init: GetRequestInit = {}) {
	return getJson<ApiListResponse>(`/records?${new URLSearchParams(params).toString()}`, init);
}

export async function postPlayersBatch(batch: string[], init: ApiRequestInit = {}) {
	return (await request('/players/batch', {
		...init,
		method: 'POST',
		body: JSON.stringify({ batch }),
		headers: {
			'Content-Type': 'application/json',
			...(init.headers ?? {})
		}
	})).json() as Promise<PlayerSummary[]>;
}

export async function fetchCommunityPost(id: string, init: GetRequestInit = {}) {
	return request(`/community/posts/${id}`, { ...init, method: 'GET' });
}

export async function fetchCommunityPostComments(id: string, init: GetRequestInit = {}) {
	return request(`/community/posts/${id}/comments`, { ...init, method: 'GET' });
}
