export type PvpDifficulty = 'easy' | 'medium' | 'hard';

export type PvpMatchStatus =
	| 'pending'
	| 'in_progress'
	| 'waiting_result'
	| 'completed'
	| 'cancelled'
	| 'disputed'
	| string;

export type PvpInviteStatus =
	| 'pending'
	| 'accepted'
	| 'declined'
	| 'expired'
	| 'cancelled'
	| string;
export type PvpQueueStatus = 'idle' | 'searching' | 'matched' | 'cancelled' | 'expired' | string;

export type PvpPlayer = {
	uid?: string;
	id?: string;
	name?: string | null;
	pvpRating?: number | null;
	pvp_rating?: number | null;
	pvpRatedMatchCount?: number | null;
	pvp_rated_match_count?: number | null;
	pvpStartingRating?: number | null;
	pvpRatingInitializedAt?: string | null;
	anonymous?: boolean;
	isAnonymous?: boolean;
	avatarVersion?: number;
	isAvatarGif?: boolean;
	supporterUntil?: string | null;
	clan?: number | null;
	clans?: Record<string, unknown> | null;
	[key: string]: unknown;
};

export type PvpLevel = {
	id?: number;
	levelId?: number;
	name?: string | null;
	creator?: string | null;
	author?: string | null;
	difficulty?: string | null;
	rating?: number | null;
	listPosition?: number | null;
	videoID?: string | null;
	minProgress?: number | null;
	[key: string]: unknown;
};

export type PvpResult = {
	uid?: string;
	userId?: string;
	playerId?: string;
	progress?: number | null;
	bestProgress?: number | null;
	timeReachedMs?: number | null;
	timeReachedProgress?: number | null;
	time_reached_progress?: number | null;
	submittedAt?: string | null;
	submitted_at?: string | null;
	player?: PvpPlayer | null;
	players?: PvpPlayer | null;
	anonymous?: boolean;
	isAnonymous?: boolean;
	is_anonymous?: boolean;
	[key: string]: unknown;
};

export type PvpParticipant = {
	uid?: string;
	userId?: string;
	playerId?: string;
	player?: PvpPlayer | null;
	players?: PvpPlayer | null;
	anonymous?: boolean;
	isAnonymous?: boolean;
	is_anonymous?: boolean;
	result?: PvpResult | null;
	progress?: number | null;
	bestProgress?: number | null;
	timeReachedMs?: number | null;
	timeReachedProgress?: number | null;
	acceptedAt?: string | null;
	accepted_at?: string | null;
	pvpRatingBefore?: number | null;
	pvp_rating_before?: number | null;
	pvpRatingAfter?: number | null;
	pvp_rating_after?: number | null;
	pvpRatingDiff?: number | null;
	pvp_rating_diff?: number | null;
	pvpRating?: number | null;
	pvp_rating?: number | null;
	pvpRatedMatchCount?: number | null;
	pvp_rated_match_count?: number | null;
	[key: string]: unknown;
};

export type PvpMatch = {
	id?: number | string;
	matchId?: number | string;
	status?: PvpMatchStatus;
	difficulty?: PvpDifficulty | string;
	levelId?: number;
	winnerUid?: string | null;
	winner?: string | PvpPlayer | null;
	winnerId?: string | null;
	resultReason?: string | null;
	reason?: string | null;
	ranked?: boolean;
	isRanked?: boolean;
	levelRating?: number | null;
	level_rating?: number | null;
	ratingTarget?: number | null;
	rating_target?: number | null;
	ratingOffset?: number | null;
	rating_offset?: number | null;
	ratingAppliedAt?: string | null;
	rating_applied_at?: string | null;
	startedAt?: string | null;
	startsAt?: string | null;
	started_at?: string | null;
	acceptanceExpiresAt?: string | null;
	acceptance_expires_at?: string | null;
	endAt?: string | null;
	endsAt?: string | null;
	endedAt?: string | null;
	created_at?: string;
	level?: PvpLevel | null;
	levels?: PvpLevel | null;
	selectedLevel?: PvpLevel | null;
	participants?: PvpParticipant[];
	results?: PvpResult[];
	[key: string]: unknown;
};

export type PvpMatchMessage = {
	id?: number | string;
	matchId?: number | string;
	senderUid?: string | null;
	type?: 'user' | 'system' | string;
	content?: string;
	metadata?: Record<string, unknown> | null;
	created_at?: string;
	sender?: PvpPlayer | null;
	player?: PvpPlayer | null;
	senderAnonymous?: boolean;
	sender_anonymous?: boolean;
	[key: string]: unknown;
};

export type PvpInvite = {
	id?: number | string;
	inviteId?: number | string;
	status?: PvpInviteStatus;
	difficulty?: PvpDifficulty | string;
	inviterUid?: string;
	inviteeUid?: string;
	from?: string;
	to?: string;
	matchId?: number | string | null;
	expiresAt?: string | null;
	expires_at?: string | null;
	created_at?: string;
	inviter?: PvpPlayer | null;
	invitee?: PvpPlayer | null;
	fromPlayer?: PvpPlayer | null;
	toPlayer?: PvpPlayer | null;
	inviterAnonymous?: boolean;
	inviteeAnonymous?: boolean;
	match?: PvpMatch | null;
	[key: string]: unknown;
};

export type PvpMatchmakingRequest = {
	id?: number | string;
	status?: PvpQueueStatus;
	difficulty?: PvpDifficulty | string;
	uid?: string;
	userId?: string;
	anonymous?: boolean;
	matchId?: number | string | null;
	match?: PvpMatch | null;
	pvpRating?: number | null;
	searchStartedAt?: string | null;
	search_started_at?: string | null;
	currentSearchRange?: number | null;
	current_search_range?: number | null;
	expiresAt?: string | null;
	expires_at?: string | null;
	created_at?: string;
	updated_at?: string;
	[key: string]: unknown;
};

export type PvpRatingState = {
	pvpRating?: number | null;
	pvpRatedMatchCount?: number | null;
	pvpStartingRating?: number | null;
	pvpRatingInitializedAt?: string | null;
	pvpRatingInitialized?: boolean;
	[key: string]: unknown;
};

export type PvpMe = {
	rating?: PvpRatingState | null;
	pvpRating?: number | null;
	pvpRatedMatchCount?: number | null;
	pvpRatingInitialized?: boolean;
	activeMatch: PvpMatch | null;
	matchmaking: PvpMatchmakingRequest | null;
	incomingInvites: PvpInvite[];
	outgoingInvites: PvpInvite[];
};

export const PVP_ACTIVE_MATCH_STATUSES = ['pending', 'in_progress', 'waiting_result'];
export const PVP_FINISHED_MATCH_STATUSES = ['completed', 'cancelled', 'disputed'];
export const PVP_DIFFICULTIES: PvpDifficulty[] = ['easy', 'medium', 'hard'];
export const PVP_PROVISIONAL_MATCHES = 5;

type PvpRequestInit = Omit<RequestInit, 'body'> & {
	token?: string | null;
	body?: BodyInit | Record<string, unknown> | null;
};

async function pvpRequest<T>(path: string, options: PvpRequestInit = {}): Promise<T> {
	const headers = new Headers(options.headers);
	const body =
		options.body && typeof options.body === 'object' && !(options.body instanceof FormData)
			? JSON.stringify(options.body)
			: options.body;

	if (body && typeof body === 'string' && !headers.has('Content-Type')) {
		headers.set('Content-Type', 'application/json');
	}

	if (options.token) {
		headers.set('Authorization', `Bearer ${options.token}`);
	}

	const response = await fetch(`${import.meta.env.VITE_API_URL}${path}`, {
		...options,
		body,
		headers
	});

	if (!response.ok) {
		let message = `PvP request failed with ${response.status}`;

		try {
			const payload = await response.json();
			message = payload?.error || payload?.message || message;
		} catch {
			try {
				message = (await response.text()) || message;
			} catch {
				// Keep the status-based fallback.
			}
		}

		throw new Error(message);
	}

	if (response.status === 204) {
		return null as T;
	}

	return response.json();
}

export function normalizePvpMe(payload: any): PvpMe {
	return {
		rating: payload?.rating ?? null,
		pvpRating: payload?.pvpRating ?? payload?.pvp_rating ?? payload?.rating?.pvpRating ?? null,
		pvpRatedMatchCount:
			payload?.pvpRatedMatchCount ??
			payload?.pvp_rated_match_count ??
			payload?.rating?.pvpRatedMatchCount ??
			null,
		pvpRatingInitialized:
			payload?.pvpRatingInitialized ??
			payload?.pvp_rating_initialized ??
			payload?.rating?.pvpRatingInitialized ??
			false,
		activeMatch:
			payload?.activeMatch ??
			payload?.active_match ??
			payload?.currentMatch ??
			payload?.current_match ??
			payload?.match ??
			null,
		matchmaking:
			payload?.matchmaking ??
			payload?.matchmakingRequest ??
			payload?.matchmaking_request ??
			payload?.queue ??
			null,
		incomingInvites:
			payload?.incomingInvites ??
			payload?.incoming_invites ??
			payload?.receivedInvites ??
			payload?.received_invites ??
			[],
		outgoingInvites:
			payload?.outgoingInvites ??
			payload?.outgoing_invites ??
			payload?.sentInvites ??
			payload?.sent_invites ??
			[]
	};
}

export function normalizePvpMatches(payload: any): PvpMatch[] {
	if (Array.isArray(payload)) return payload;
	if (Array.isArray(payload?.matches)) return payload.matches;
	if (Array.isArray(payload?.data)) return payload.data;
	if (Array.isArray(payload?.items)) return payload.items;
	return [];
}

export async function getPvpMe(token?: string | null) {
	return normalizePvpMe(await pvpRequest('/pvp/me', { token }));
}

export async function startPvpMatchmaking(
	token: string | null | undefined,
	anonymous = false
) {
	return pvpRequest<PvpMatchmakingRequest | PvpMe>('/pvp/matchmaking', {
		method: 'POST',
		token,
		body: { anonymous }
	});
}

export async function checkPvpMatchmaking(token?: string | null) {
	return pvpRequest<PvpMatchmakingRequest | PvpMe>('/pvp/matchmaking/check', {
		method: 'POST',
		token
	});
}

export async function cancelPvpMatchmaking(token?: string | null) {
	return pvpRequest<PvpMatchmakingRequest | null>('/pvp/matchmaking', {
		method: 'DELETE',
		token
	});
}

export async function sendPvpInvite(
	token: string | null | undefined,
	payload: { inviteeUid: string; anonymous?: boolean }
) {
	return pvpRequest<PvpInvite>('/pvp/invites', {
		method: 'POST',
		token,
		body: payload
	});
}

export async function startPvpRating(
	token: string | null | undefined,
	startingRating: 800 | 1500 | 2500
) {
	return pvpRequest<PvpRatingState>('/pvp/rating/start', {
		method: 'POST',
		token,
		body: { startingRating }
	});
}

export async function acceptPvpInvite(
	token: string | null | undefined,
	id: number | string,
	anonymous = false
) {
	return pvpRequest<PvpInvite | PvpMatch>(`/pvp/invites/${id}/accept`, {
		method: 'POST',
		token,
		body: { anonymous }
	});
}

export async function declinePvpInvite(token: string | null | undefined, id: number | string) {
	return pvpRequest<PvpInvite>(`/pvp/invites/${id}/decline`, {
		method: 'POST',
		token
	});
}

export async function getPvpInvite(token: string | null | undefined, id: number | string) {
	return pvpRequest<PvpInvite | null>(`/pvp/invites/${id}`, { token });
}

export async function getPvpMatches(token?: string | null) {
	return normalizePvpMatches(await pvpRequest('/pvp/matches', { token }));
}

export async function getPublicPvpMatchesForPlayer(uid: string, limit = 25) {
	const params = new URLSearchParams({ limit: String(limit) });
	return normalizePvpMatches(
		await pvpRequest(`/pvp/players/${encodeURIComponent(uid)}/matches?${params}`)
	);
}

export async function getPvpMatch(token: string | null | undefined, id: number | string) {
	return pvpRequest<PvpMatch>(`/pvp/matches/${id}`, { token });
}

export async function acceptPvpMatch(token: string | null | undefined, id: number | string) {
	return pvpRequest<PvpMatch>(`/pvp/matches/${id}/accept`, {
		method: 'POST',
		token
	});
}

export async function resignPvpMatch(token: string | null | undefined, id: number | string) {
	return pvpRequest<PvpMatch>(`/pvp/matches/${id}/resign`, {
		method: 'POST',
		token
	});
}

export async function getPvpMatchMessages(
	token: string | null | undefined,
	id: number | string,
	options: { afterId?: number | string | null; limit?: number | string | null } = {}
) {
	const params = new URLSearchParams();
	if (options.afterId !== undefined && options.afterId !== null && options.afterId !== '') {
		params.set('afterId', String(options.afterId));
	}
	if (options.limit !== undefined && options.limit !== null && options.limit !== '') {
		params.set('limit', String(options.limit));
	}
	const query = params.toString();
	const payload = await pvpRequest<
		PvpMatchMessage[] | { messages?: PvpMatchMessage[]; data?: PvpMatchMessage[] }
	>(`/pvp/matches/${id}/messages${query ? `?${query}` : ''}`, { token });

	if (Array.isArray(payload)) return payload;
	if (Array.isArray(payload?.messages)) return payload.messages;
	if (Array.isArray(payload?.data)) return payload.data;
	return [];
}

export async function sendPvpMatchMessage(
	token: string | null | undefined,
	id: number | string,
	content: string
) {
	return pvpRequest<PvpMatchMessage>(`/pvp/matches/${id}/messages`, {
		method: 'POST',
		token,
		body: { content }
	});
}

export function getPvpMatchId(match: PvpMatch | null | undefined) {
	return match?.id ?? match?.matchId ?? null;
}

export function getPvpInviteId(invite: PvpInvite | null | undefined) {
	return invite?.id ?? invite?.inviteId ?? null;
}

export function getPvpStatus(value: { status?: string } | null | undefined, fallback = 'pending') {
	return String(value?.status || fallback).toLowerCase();
}

export function isActivePvpMatch(match: PvpMatch | null | undefined) {
	return PVP_ACTIVE_MATCH_STATUSES.includes(getPvpStatus(match));
}

export function isFinishedPvpMatch(match: PvpMatch | null | undefined) {
	return PVP_FINISHED_MATCH_STATUSES.includes(getPvpStatus(match, ''));
}

export function getPvpLevel(match: PvpMatch | null | undefined): PvpLevel | null {
	return (
		match?.level ?? match?.levels ?? match?.selectedLevel ?? (match?.matchLevel as PvpLevel) ?? null
	);
}

export function getPvpParticipants(match: PvpMatch | null | undefined): PvpParticipant[] {
	if (!match) return [];
	if (Array.isArray(match.participants)) return match.participants;
	if (Array.isArray(match.players)) {
		return match.players.map((player: any) => ({ uid: player?.uid, player }));
	}

	const candidates = [
		match.playerA,
		match.playerB,
		match.player1,
		match.player2,
		match.host,
		match.opponent
	].filter(Boolean);

	return candidates.map((player: any) => ({ uid: player?.uid, player }));
}

export function getPvpParticipantUid(participant: PvpParticipant | PvpResult | null | undefined) {
	return participant?.uid ?? participant?.userId ?? participant?.playerId ?? null;
}

export function getPvpParticipantPlayer(
	participant: PvpParticipant | PvpResult | null | undefined
) {
	if (getPvpParticipantIsAnonymous(participant)) return null;
	return participant?.player ?? participant?.players ?? null;
}

export function getPvpParticipantIsAnonymous(
	participant: PvpParticipant | PvpResult | null | undefined
) {
	return Boolean(
		participant?.anonymous ??
			(participant as PvpParticipant | undefined)?.isAnonymous ??
			(participant as PvpParticipant | undefined)?.is_anonymous ??
			participant?.player?.anonymous ??
			participant?.player?.isAnonymous
	);
}

export function getPvpMessageSenderIsAnonymous(message: PvpMatchMessage | null | undefined) {
	return Boolean(message?.senderAnonymous ?? message?.sender_anonymous);
}

export function getPvpOpponent(
	match: PvpMatch | null | undefined,
	currentUid: string | null | undefined
) {
	const participants = getPvpParticipants(match);
	return (
		participants.find((participant) => getPvpParticipantUid(participant) !== currentUid) ??
		participants[0] ??
		null
	);
}

export function getPvpSelfParticipant(
	match: PvpMatch | null | undefined,
	currentUid: string | null | undefined
) {
	return (
		getPvpParticipants(match).find(
			(participant) => getPvpParticipantUid(participant) === currentUid
		) ?? null
	);
}

export function getPvpProgress(participant: PvpParticipant | PvpResult | null | undefined) {
	const result = (participant as PvpParticipant | undefined)?.result;
	const value =
		participant?.progress ??
		participant?.bestProgress ??
		result?.progress ??
		result?.bestProgress ??
		0;
	return Number.isFinite(Number(value)) ? Number(value) : 0;
}

export function getPvpTimeReachedMs(participant: PvpParticipant | PvpResult | null | undefined) {
	const result = (participant as PvpParticipant | undefined)?.result;
	const value =
		participant?.timeReachedMs ??
		participant?.timeReachedProgress ??
		result?.timeReachedMs ??
		result?.timeReachedProgress ??
		result?.time_reached_progress ??
		null;
	return Number.isFinite(Number(value)) ? Number(value) : null;
}

export function getPvpWinnerUid(match: PvpMatch | null | undefined) {
	if (!match) return null;
	if (typeof match.winner === 'string') return match.winner;
	if (match.winner && typeof match.winner === 'object')
		return match.winner.uid ?? match.winner.id ?? null;
	return match.winnerUid ?? match.winnerId ?? null;
}

export function getPvpMatchStartMs(match: PvpMatch | null | undefined) {
	return getTimeMs(match?.startedAt ?? match?.startsAt ?? match?.started_at ?? match?.created_at);
}

export function getPvpMatchEndMs(match: PvpMatch | null | undefined) {
	const explicit = getTimeMs(match?.endAt ?? match?.endsAt ?? match?.endedAt);
	if (explicit) return explicit;

	const started = getPvpMatchStartMs(match);
	return started ? started + 15 * 60 * 1000 : null;
}

export function getPvpMatchAcceptanceExpiresMs(match: PvpMatch | null | undefined) {
	return getTimeMs(match?.acceptanceExpiresAt ?? match?.acceptance_expires_at);
}

export function getPvpInviteExpiresMs(
	invite: PvpInvite | PvpMatchmakingRequest | null | undefined
) {
	return getTimeMs(invite?.expiresAt ?? invite?.expires_at);
}

export function getPvpMatchedMatchId(value: PvpInvite | PvpMatchmakingRequest | null | undefined) {
	return value?.matchId ?? value?.match?.id ?? value?.match?.matchId ?? null;
}

export function getPvpResultReason(match: PvpMatch | null | undefined) {
	return match?.resultReason ?? match?.reason ?? null;
}

export function isPvpMatchRanked(match: PvpMatch | null | undefined) {
	return Boolean(match?.ranked ?? match?.isRanked);
}

export function getPvpLevelRating(match: PvpMatch | null | undefined) {
	const level = getPvpLevel(match);
	const value =
		match?.levelRating ??
		match?.level_rating ??
		level?.listRating ??
		level?.rating ??
		null;
	return getFinitePvpNumber(value);
}

export function getPvpParticipantRatingBefore(
	participant: PvpParticipant | null | undefined
) {
	const value = participant?.pvpRatingBefore ?? participant?.pvp_rating_before ?? null;
	return getFinitePvpNumber(value);
}

export function getPvpParticipantRatingAfter(
	participant: PvpParticipant | null | undefined
) {
	const value = participant?.pvpRatingAfter ?? participant?.pvp_rating_after ?? null;
	return getFinitePvpNumber(value);
}

export function getPvpParticipantRatingDiff(
	participant: PvpParticipant | null | undefined
) {
	const value = participant?.pvpRatingDiff ?? participant?.pvp_rating_diff ?? null;
	return getFinitePvpNumber(value);
}

export function getPvpVisibleParticipantRating(
	participant: PvpParticipant | null | undefined
) {
	const player = getPvpParticipantPlayer(participant);
	const value =
		getPvpParticipantRatingAfter(participant) ??
		getPvpParticipantRatingBefore(participant) ??
		participant?.pvpRating ??
		participant?.pvp_rating ??
		player?.pvpRating ??
		null;

	return getFinitePvpNumber(value);
}

export function getPvpVisibleParticipantRatedMatchCount(
	participant: PvpParticipant | null | undefined
) {
	const player = getPvpParticipantPlayer(participant);
	const value =
		participant?.pvpRatedMatchCount ??
		participant?.pvp_rated_match_count ??
		player?.pvpRatedMatchCount ??
		player?.pvp_rated_match_count ??
		null;

	return getFinitePvpNumber(value);
}

export function getPvpVisibleParticipantRatingLabel(
	participant: PvpParticipant | null | undefined
) {
	const rating = getPvpVisibleParticipantRating(participant);
	if (rating === null) return null;

	const roundedRating = Math.round(rating);
	const ratedMatchCount = getPvpVisibleParticipantRatedMatchCount(participant);

	return `${roundedRating}${ratedMatchCount !== null && ratedMatchCount < PVP_PROVISIONAL_MATCHES ? '?' : ''}`;
}

export function hasPvpParticipantAccepted(participant: PvpParticipant | null | undefined) {
	return Boolean(participant?.acceptedAt ?? participant?.accepted_at);
}

export function isPvpMatchConfirmedByBoth(match: PvpMatch | null | undefined) {
	if (!match) return false;

	const participants = getPvpParticipants(match);
	if (participants.length >= 2 && participants.every(hasPvpParticipantAccepted)) return true;

	return ['in_progress', 'waiting_result', 'completed', 'disputed'].includes(
		getPvpStatus(match, '')
	);
}

export function getTimeMs(value: unknown) {
	if (!value) return null;
	const ms = new Date(String(value)).getTime();
	return Number.isFinite(ms) ? ms : null;
}

function getFinitePvpNumber(value: unknown) {
	if (value === null || value === undefined || value === '') return null;

	const numberValue = Number(value);
	return Number.isFinite(numberValue) ? numberValue : null;
}
