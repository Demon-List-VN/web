import supabase from '$lib/client/supabase';

type PvpRealtimeScope =
	| 'matchmaking'
	| 'incomingInvite'
	| 'outgoingInvite'
	| 'participant'
	| 'result'
	| 'match';

export type PvpRealtimeEvent = {
	scope: PvpRealtimeScope;
	payload: any;
};

type RealtimeCallback = (event: PvpRealtimeEvent) => void | Promise<void>;

function subscribeToTable(
	channelName: string,
	table: string,
	filter: string | null,
	scope: PvpRealtimeScope,
	callback: RealtimeCallback
) {
	const channel = supabase.channel(channelName);
	const config: Record<string, string> = {
		event: '*',
		schema: 'public',
		table
	};

	if (filter) {
		config.filter = filter;
	}

	channel
		.on('postgres_changes', config as any, (payload) => {
			callback({ scope, payload });
		})
		.subscribe();

	return channel;
}

async function removeChannels(channels: ReturnType<typeof supabase.channel>[]) {
	await Promise.all(channels.map((channel) => supabase.removeChannel(channel)));
}

export function setPvpRealtimeAuth(token?: string | null) {
	if (token) {
		supabase.realtime.setAuth(token);
	}
}

export function subscribeToPvpLobby(uid: string, callback: RealtimeCallback) {
	if (!uid) return () => Promise.resolve();

	const channels = [
		subscribeToTable(
			`pvp-lobby-matchmaking-${uid}`,
			'pvpMatchmakingRequests',
			`uid=eq.${uid}`,
			'matchmaking',
			callback
		),
		subscribeToTable(
			`pvp-lobby-incoming-invites-${uid}`,
			'pvpInvites',
			`inviteeUid=eq.${uid}`,
			'incomingInvite',
			callback
		),
		subscribeToTable(
			`pvp-lobby-outgoing-invites-${uid}`,
			'pvpInvites',
			`inviterUid=eq.${uid}`,
			'outgoingInvite',
			callback
		),
		subscribeToTable(
			`pvp-lobby-participants-${uid}`,
			'pvpMatchParticipants',
			`uid=eq.${uid}`,
			'participant',
			callback
		),
		subscribeToTable(
			`pvp-lobby-results-${uid}`,
			'pvpMatchResults',
			`uid=eq.${uid}`,
			'result',
			callback
		)
	];

	return () => removeChannels(channels);
}

export function subscribeToPvpMatches(uid: string, callback: RealtimeCallback) {
	if (!uid) return () => Promise.resolve();

	const channels = [
		subscribeToTable(
			`pvp-matches-participants-${uid}`,
			'pvpMatchParticipants',
			`uid=eq.${uid}`,
			'participant',
			callback
		),
		subscribeToTable(
			`pvp-matches-results-${uid}`,
			'pvpMatchResults',
			`uid=eq.${uid}`,
			'result',
			callback
		)
	];

	return () => removeChannels(channels);
}

export function subscribeToPvpMatchDetail(matchId: number | string, callback: RealtimeCallback) {
	if (matchId === null || matchId === undefined || matchId === '') return () => Promise.resolve();

	const channels = [
		subscribeToTable(
			`pvp-match-detail-${matchId}`,
			'pvpMatches',
			`id=eq.${matchId}`,
			'match',
			callback
		),
		subscribeToTable(
			`pvp-match-detail-participants-${matchId}`,
			'pvpMatchParticipants',
			`matchId=eq.${matchId}`,
			'participant',
			callback
		),
		subscribeToTable(
			`pvp-match-detail-results-${matchId}`,
			'pvpMatchResults',
			`matchId=eq.${matchId}`,
			'result',
			callback
		)
	];

	return () => removeChannels(channels);
}

