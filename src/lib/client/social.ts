export type SocialStatus =
	| 'self'
	| 'friend'
	| 'outgoing_pending'
	| 'incoming_pending'
	| 'blocked_by_me'
	| 'blocked_me'
	| 'none';

export type SocialPlayer = {
	uid: string;
	name: string;
	socialStatus?: SocialStatus;
	avatarVersion?: number;
	isAvatarGif?: boolean;
	supporterUntil?: string | null;
	rating?: number | null;
	overallRank?: number | null;
	clan?: number | null;
	clans?: Record<string, unknown> | null;
	[key: string]: unknown;
};

export type SocialConversation = {
	id: number | string;
	participantOneUid?: string;
	participantTwoUid?: string;
	pendingForUid?: string | null;
	conversationStatus?: 'active' | 'pending_incoming' | 'pending_outgoing' | string;
	otherPlayer?: SocialPlayer | null;
	participants?: SocialPlayer[];
	latestMessage?: SocialMessage | null;
	lastMessageAt?: string | null;
	[key: string]: unknown;
};

export type SocialMessage = {
	id: number | string;
	conversationId: number | string;
	senderUid: string;
	content: string;
	createdAt: string;
	[key: string]: unknown;
};

type SocialRequestOptions = Omit<RequestInit, 'body'> & {
	token?: string | null;
	body?: BodyInit | Record<string, unknown> | null;
};

async function socialRequest<T>(path: string, options: SocialRequestOptions = {}): Promise<T> {
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
		headers,
		body
	});

	if (!response.ok) {
		let message = `Social request failed with ${response.status}`;

		try {
			const payload = await response.json();
			message = payload?.error || payload?.message || message;
		} catch {
			try {
				message = (await response.text()) || message;
			} catch {
				// Keep the status fallback.
			}
		}

		throw new Error(message);
	}

	if (response.status === 204) {
		return null as T;
	}

	return response.json();
}

export async function getSocialFriends(token?: string | null) {
	return socialRequest<SocialPlayer[]>('/social/friends', { token });
}

export async function searchSocialPlayers(token: string | null | undefined, query: string) {
	const params = new URLSearchParams({ q: query });
	const payload = await socialRequest<{ players?: SocialPlayer[] }>(`/social/friends/search?${params}`, {
		token
	});
	return Array.isArray(payload?.players) ? payload.players : [];
}

export async function getSocialStatus(token: string | null | undefined, uid: string) {
	const payload = await socialRequest<{ status: SocialStatus }>(
		`/social/players/${encodeURIComponent(uid)}/status`,
		{ token }
	);
	return payload.status;
}

export async function sendFriendRequest(token: string | null | undefined, toUid: string) {
	return socialRequest('/social/friend-requests', {
		method: 'POST',
		token,
		body: { toUid }
	});
}

export async function getSocialConversations(token?: string | null) {
	return socialRequest<SocialConversation[]>('/social/conversations', { token });
}

export async function createSocialConversation(
	token: string | null | undefined,
	participantUid: string,
	initialMessage?: string
) {
	return socialRequest<SocialConversation>('/social/conversations', {
		method: 'POST',
		token,
		body: { participantUid, initialMessage }
	});
}

export async function getSocialMessages(
	token: string | null | undefined,
	conversationId: number | string
) {
	return socialRequest<SocialMessage[]>(`/social/conversations/${conversationId}/messages`, { token });
}

export async function sendSocialMessage(
	token: string | null | undefined,
	conversationId: number | string,
	content: string
) {
	return socialRequest<SocialMessage>(`/social/conversations/${conversationId}/messages`, {
		method: 'POST',
		token,
		body: { content }
	});
}

export async function blockSocialPlayer(token: string | null | undefined, blockedUid: string) {
	return socialRequest('/social/blocks', {
		method: 'POST',
		token,
		body: { blockedUid }
	});
}
