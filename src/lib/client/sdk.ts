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

interface ApiEndpoint<T = unknown> {
	request(init?: ApiRequestInit): Promise<Response>;
	get(init?: GetRequestInit): Promise<T>;
}

type PathParam = unknown;
type QueryParam = unknown;

function pathValue(value: PathParam) {
	return String(value);
}

function queryValue(value: QueryParam) {
	return value instanceof URLSearchParams ? value.toString() : String(value);
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

function endpoint<T = unknown>(path: string): ApiEndpoint<T> {
	return {
		request: (init: ApiRequestInit = {}) => request(path, init),
		get: (init: GetRequestInit = {}) => getJson<T>(path, init)
	};
}

export const homepage = endpoint('/homepage');

export const refreshData = endpoint('/refresh');

export const notifications = {
	root: endpoint('/notifications'),
	byUser: (uid: PathParam) => endpoint(`/notifications/${pathValue(uid)}`)
};

export const apiKeys = {
	root: endpoint('/APIKey'),
	byKey: (key: PathParam) => endpoint(`/APIKey/${pathValue(key)}`)
};

export const authLinks = {
	discord: endpoint('/auth/link/discord'),
	pointercrate: endpoint('/auth/link/pointercrate')
};

export const search = {
	byValue: (value: PathParam) => endpoint(`/search/${pathValue(value)}`)
};

export const players = {
	root: endpoint('/players'),
	list: (query: QueryParam) => endpoint(`/players?${queryValue(query)}`),
	byId: (uid: PathParam) =>
		Object.assign(endpoint(`/players/${pathValue(uid)}`), {
			records: endpoint(`/players/${pathValue(uid)}/records`),
			convictions: endpoint(`/players/${pathValue(uid)}/convictions`),
			medals: endpoint(`/players/${pathValue(uid)}/medals`),
			cards: endpoint(`/players/${pathValue(uid)}/cards`),
			heatmap: (year: PathParam) =>
				endpoint(`/players/${pathValue(uid)}/heatmap/${pathValue(year)}`)
		})
};

export const inventory = {
	root: endpoint('/inventory'),
	item15: endpoint('/inventory?itemId=15'),
	consumeItem15: endpoint('/inventory/item/15/consume'),
	byId: (inventoryId: PathParam) =>
		Object.assign(endpoint(`/inventory/${pathValue(inventoryId)}`), {
			consume: endpoint(`/inventory/${pathValue(inventoryId)}/consume`)
		})
};

export const items = {
	byId: (itemId: PathParam) => endpoint(`/item/${pathValue(itemId)}`),
	search: (query: QueryParam) => endpoint(`/item/search?q=${queryValue(query)}`)
};

export const levels = {
	root: endpoint('/levels'),
	batch: endpoint('/levels/batch'),
	tags: Object.assign(endpoint('/levels/tags'), {
		byId: (tagId: PathParam) => endpoint(`/levels/tags/${pathValue(tagId)}`)
	}),
	byId: (levelId: PathParam) =>
		Object.assign(endpoint(`/levels/${pathValue(levelId)}`), {
			fromGD: endpoint(`/levels/${pathValue(levelId)}?fromGD=1`),
			records: (end: PathParam = 500) =>
				endpoint(`/levels/${pathValue(levelId)}/records?end=${pathValue(end)}`),
			deathCount: endpoint(`/levels/${pathValue(levelId)}/deathCount`),
			tags: endpoint(`/levels/${pathValue(levelId)}/tags`),
			variants: endpoint(`/levels/${pathValue(levelId)}/variants`)
		})
};

export const lists = {
	byName: (list: PathParam, query: QueryParam) =>
		endpoint(`/list/${pathValue(list)}?${queryValue(query)}`)
};

export const recordsApi = {
	root: endpoint('/records'),
	retrieveLimit: endpoint('/records/retrieve-limit'),
	retrieve: endpoint('/records/retrieve'),
	byUserAndLevel: (uid: PathParam, levelId: PathParam) =>
		Object.assign(endpoint(`/records/${pathValue(uid)}/${pathValue(levelId)}`), {
			boost: endpoint(`/records/${pathValue(uid)}/${pathValue(levelId)}/boost`)
		})
};

export const deathCounts = {
	byUserAndLevel: (uid: PathParam, levelId: PathParam) =>
		endpoint(`/deathCount/${pathValue(uid)}/${pathValue(levelId)}`)
};

export const coupon = {
	byCode: (code: PathParam) => endpoint(`/coupon/${pathValue(code)}`)
};

export const clans = {
	root: endpoint('/clans'),
	list: (query: QueryParam) => endpoint(`/clans?${queryValue(query)}`),
	invitations: endpoint('/clans/invitations'),
	leave: endpoint('/clans/leave'),
	invite: (uid: PathParam) => endpoint(`/clans/invite/${pathValue(uid)}`),
	byId: (clanId: PathParam) =>
		Object.assign(endpoint(`/clans/${pathValue(clanId)}`), {
			invitations: endpoint(`/clans/${pathValue(clanId)}/invitations`),
			join: endpoint(`/clans/${pathValue(clanId)}/join`),
			invite: endpoint(`/clans/${pathValue(clanId)}/invite`),
			kick: (uid: PathParam) => endpoint(`/clans/${pathValue(clanId)}/kick/${pathValue(uid)}`),
			invitation: (uid: PathParam) =>
				endpoint(`/clans/${pathValue(clanId)}/invitation/${pathValue(uid)}`)
		})
};

export const community = {
	tags: Object.assign(endpoint('/community/tags'), {
		byId: (tagId: PathParam) => endpoint(`/community/tags/${pathValue(tagId)}`)
	}),
	posts: {
		list: (query: QueryParam) => endpoint(`/community/posts?${queryValue(query)}`),
		views: endpoint('/community/posts/views')
	},
	levels: {
		byId: (levelId: PathParam) => ({
			posts: {
				limit: (limit: PathParam) =>
					endpoint(`/community/levels/${pathValue(levelId)}/posts?limit=${pathValue(limit)}`)
			}
		})
	},
	my: {
		records: endpoint('/community/my/records')
	},
	admin: {
		posts: {
			list: (query: QueryParam) => endpoint(`/community/admin/posts?${queryValue(query)}`),
			byId: (postId: PathParam) => endpoint(`/community/admin/posts/${pathValue(postId)}`)
		},
		reports: {
			list: (query: QueryParam) => endpoint(`/community/admin/reports?${queryValue(query)}`)
		},
		comments: {
			byId: (commentId: PathParam) => endpoint(`/community/admin/comments/${pathValue(commentId)}`)
		}
	}
};

export const eventsApi = {
	root: endpoint('/events'),
	list: (query: QueryParam) => endpoint(`/events?${queryValue(query)}`),
	ongoing: endpoint('/events/ongoing'),
	proofs: endpoint('/events/proofs'),
	submission: endpoint('/events/submission'),
	quest: {
		byId: (questId: PathParam) => ({
			check: endpoint(`/events/quest/${pathValue(questId)}/check`),
			claim: endpoint(`/events/quest/${pathValue(questId)}/claim`)
		})
	},
	byId: (eventId: PathParam) =>
		Object.assign(endpoint(`/events/${pathValue(eventId)}`), {
			levels: endpoint(`/events/${pathValue(eventId)}/levels`),
			leaderboard: endpoint(`/events/${pathValue(eventId)}/leaderboard`),
			calc: endpoint(`/events/${pathValue(eventId)}/calc`),
			submissions: endpoint(`/events/${pathValue(eventId)}/submissions`),
			submit: endpoint(`/events/${pathValue(eventId)}/submit`),
			submission: (levelId: PathParam) =>
				endpoint(`/events/${pathValue(eventId)}/submission/${pathValue(levelId)}`),
			level: (levelId: PathParam) =>
				endpoint(`/events/${pathValue(eventId)}/level/${pathValue(levelId)}`),
			proofs: Object.assign(endpoint(`/events/${pathValue(eventId)}/proofs?accepted=all`), {
				byUid: (uid: PathParam) =>
					endpoint(`/events/${pathValue(eventId)}/proofs/${pathValue(uid)}`)
			}),
			quest: Object.assign(endpoint(`/events/${pathValue(eventId)}/quest`), {
				byId: (questId: PathParam) =>
					Object.assign(endpoint(`/events/${pathValue(eventId)}/quest/${pathValue(questId)}`), {
						reward: (rewardId: PathParam) =>
							endpoint(
								`/events/${pathValue(eventId)}/quest/${pathValue(questId)}/reward/${pathValue(rewardId)}`
							),
						rewardRoot: endpoint(`/events/${pathValue(eventId)}/quest/${pathValue(questId)}/reward`)
					})
			})
		})
};

export const wiki = {
	latest: (query: QueryParam) => endpoint(`/wiki/latest?${queryValue(query)}`)
};

export const battlepassApi = {
	root: endpoint('/battlepass'),
	progress: endpoint('/battlepass/progress'),
	courses: endpoint('/battlepass/courses'),
	course: Object.assign(endpoint('/battlepass/course'), {
		byId: (courseId: PathParam) =>
			Object.assign(endpoint(`/battlepass/course/${pathValue(courseId)}`), {
				entries: endpoint(`/battlepass/course/${pathValue(courseId)}/entries`)
			}),
		entry: (entryId: PathParam) => endpoint(`/battlepass/course/entry/${pathValue(entryId)}`)
	}),
	dailyWeekly: endpoint('/battlepass/daily-weekly'),
	levels: endpoint('/battlepass/levels'),
	missions: endpoint('/battlepass/missions'),
	mission: (missionId: PathParam) =>
		Object.assign(endpoint(`/battlepass/mission/${pathValue(missionId)}`), {
			reward: (rewardId: PathParam) =>
				endpoint(`/battlepass/mission/${pathValue(missionId)}/reward/${pathValue(rewardId)}`)
		}),
	rewards: Object.assign(endpoint('/battlepass/rewards'), {
		claimable: endpoint('/battlepass/rewards/claimable'),
		byId: (rewardId: PathParam) => endpoint(`/battlepass/reward/${pathValue(rewardId)}`)
	}),
	mappacks: Object.assign(endpoint('/battlepass/mappacks'), {
		nextLocked: endpoint('/battlepass/mappacks/next-locked'),
		byId: (mappackId: PathParam) => endpoint(`/battlepass/mappack/${pathValue(mappackId)}`)
	}),
	level: (levelId: PathParam) => endpoint(`/battlepass/level/${pathValue(levelId)}`),
	season: (seasonId: PathParam) => ({
		archive: endpoint(`/battlepass/season/${pathValue(seasonId)}/archive`),
		missions: endpoint(`/battlepass/season/${pathValue(seasonId)}/missions`),
		mappacks: endpoint(`/battlepass/season/${pathValue(seasonId)}/mappacks`),
		rewards: endpoint(`/battlepass/season/${pathValue(seasonId)}/rewards`)
	})
};

export const mappacks = {
	root: endpoint('/mappacks'),
	batch: endpoint('/mappacks/batch'),
	byId: (mappackId: PathParam) => endpoint(`/mappacks/${pathValue(mappackId)}`)
};

export const orders = {
	root: endpoint('/orders'),
	byId: (orderId: PathParam) => endpoint(`/orders/${pathValue(orderId)}`),
	merchant: {
		root: endpoint('/merchant/orders'),
		byId: (orderId: PathParam) => ({
			tracking: endpoint(`/merchant/order/${pathValue(orderId)}/tracking`)
		})
	}
};

export const payment = {
	link: endpoint('/payment/getPaymentLink'),
	linkWithDuration: (days: PathParam) => endpoint(`/payment/getPaymentLink/5/${pathValue(days)}`)
};

export const cards = {
	byId: (cardId: PathParam) => ({
		content: endpoint(`/card/${pathValue(cardId)}/content`),
		link: endpoint(`/card/${pathValue(cardId)}/link`)
	})
};

export const submissions = {
	verdict: endpoint('/submitVerdict'),
	byId: (submissionId: PathParam) => endpoint(`/submission?id=${pathValue(submissionId)}`),
	levelSubmissions: endpoint('/level-submissions')
};

export const provinceData = endpoint('/provinces');

export function mergeAccounts(uidA: PathParam, uidB: PathParam) {
	return endpoint(`/mergeAccount/${pathValue(uidA)}/${pathValue(uidB)}`);
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
	return (
		await request('/players/batch', {
			...init,
			method: 'POST',
			body: JSON.stringify({ batch }),
			headers: {
				'Content-Type': 'application/json',
				...(init.headers ?? {})
			}
		})
	).json() as Promise<PlayerSummary[]>;
}

export async function fetchCommunityPost(id: string, init: GetRequestInit = {}) {
	return request(`/community/posts/${id}`, { ...init, method: 'GET' });
}

export async function fetchCommunityPostComments(id: string, init: GetRequestInit = {}) {
	return request(`/community/posts/${id}/comments`, { ...init, method: 'GET' });
}
