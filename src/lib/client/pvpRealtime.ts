import supabase from '$lib/client/supabase';

export type PvpRealtimeScope =
    | 'matchmaking'
    | 'incomingInvite'
    | 'outgoingInvite'
    | 'participant'
    | 'result'
    | 'match'
    | 'message'
    | 'banPick'
    | 'room'
    | 'roomMember'
    | 'roomInvite'
    | 'roomMessage';

export type PvpRealtimeEvent = {
    scope: PvpRealtimeScope;
    payload: any;
};

type RealtimePostgresChangeEvent = '*' | 'INSERT' | 'UPDATE' | 'DELETE';
type RealtimeCallback = (event: PvpRealtimeEvent) => void | Promise<void>;

function subscribeToTable(
    channelName: string,
    table: string,
    filter: string | null,
    scope: PvpRealtimeScope,
    callback: RealtimeCallback,
    events: RealtimePostgresChangeEvent | RealtimePostgresChangeEvent[] = '*'
) {
    const channel = supabase.channel(channelName);
    const eventList = Array.isArray(events) ? events : [events];

    for (const event of eventList) {
        const config: Record<string, string> = {
            event,
            schema: 'public',
            table
        };

        if (filter) {
            config.filter = filter;
        }

        channel.on('postgres_changes', config as any, (payload) => {
            callback({ scope, payload });
        });
    }

    channel.subscribe();

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
    if (!uid) {
        return () => Promise.resolve();
    }

    const channels = [
        subscribeToTable(
            `pvp-lobby-matchmaking-${uid}`,
            'pvpMatchmakingRequests',
            `uid=eq.${uid}`,
            'matchmaking',
            callback,
            ['INSERT', 'UPDATE']
        ),
        subscribeToTable(
            `pvp-lobby-incoming-invites-${uid}`,
            'pvpInvites',
            `inviteeUid=eq.${uid}`,
            'incomingInvite',
            callback,
            ['INSERT', 'UPDATE']
        ),
        subscribeToTable(
            `pvp-lobby-outgoing-invites-${uid}`,
            'pvpInvites',
            `inviterUid=eq.${uid}`,
            'outgoingInvite',
            callback,
            ['INSERT', 'UPDATE']
        ),
        subscribeToTable(
            `pvp-lobby-participants-${uid}`,
            'pvpMatchParticipants',
            `uid=eq.${uid}`,
            'participant',
            callback,
            ['INSERT', 'UPDATE']
        ),
        subscribeToTable(
            `pvp-lobby-room-members-${uid}`,
            'pvpRoomMembers',
            `uid=eq.${uid}`,
            'roomMember',
            callback,
            ['INSERT', 'UPDATE']
        ),
        subscribeToTable(
            `pvp-lobby-room-invites-${uid}`,
            'pvpRoomInvites',
            `inviteeUid=eq.${uid}`,
            'roomInvite',
            callback,
            ['INSERT', 'UPDATE']
        )
    ];

    return () => removeChannels(channels);
}

export function subscribeToPvpRoom(roomId: number | string, callback: RealtimeCallback) {
    if (roomId === null || roomId === undefined || roomId === '') {
        return () => Promise.resolve();
    }

    const id = String(roomId);
    const channels = [
        subscribeToTable(
            `pvp-room-${id}`,
            'pvpRooms',
            `id=eq.${id}`,
            'room',
            callback,
            'UPDATE'
        ),
        subscribeToTable(
            `pvp-room-members-${id}`,
            'pvpRoomMembers',
            `roomId=eq.${id}`,
            'roomMember',
            callback,
            ['INSERT', 'UPDATE']
        ),
        subscribeToTable(
            `pvp-room-invites-${id}`,
            'pvpRoomInvites',
            `roomId=eq.${id}`,
            'roomInvite',
            callback,
            ['INSERT', 'UPDATE']
        ),
        subscribeToTable(
            `pvp-room-messages-${id}`,
            'pvpRoomMessages',
            `roomId=eq.${id}`,
            'roomMessage',
            callback,
            'INSERT'
        ),
        subscribeToTable(
            `pvp-room-matches-${id}`,
            'pvpMatches',
            `roomId=eq.${id}`,
            'match',
            callback,
            ['INSERT', 'UPDATE']
        )
    ];

    return () => removeChannels(channels);
}

export function subscribeToPvpMatches(uid: string, callback: RealtimeCallback) {
    if (!uid) {
        return () => Promise.resolve();
    }

    const channels = [
        subscribeToTable(
            `pvp-matches-participants-${uid}`,
            'pvpMatchParticipants',
            `uid=eq.${uid}`,
            'participant',
            callback,
            ['INSERT', 'UPDATE']
        )
    ];

    return () => removeChannels(channels);
}

export function subscribeToPvpMatchRows(
    matchIds: Array<number | string | null | undefined>,
    callback: RealtimeCallback,
    channelPrefix = 'pvp-match-rows'
) {
    const ids = [...new Set(matchIds.map((id) => String(id ?? ''))
        .filter(Boolean))];

    if (ids.length === 0) {
        return () => Promise.resolve();
    }

    const channels = ids.map((id) =>
        subscribeToTable(
            `${channelPrefix}-${id}`,
            'pvpMatches',
            `id=eq.${id}`,
            'match',
            callback,
            'UPDATE'
        )
    );

    return () => removeChannels(channels);
}

export function subscribeToPvpMatchActivity(
    matchIds: Array<number | string | null | undefined>,
    callback: RealtimeCallback,
    channelPrefix = 'pvp-match-activity'
) {
    const ids = [...new Set(matchIds.map((id) => String(id ?? ''))
        .filter(Boolean))];

    if (ids.length === 0) {
        return () => Promise.resolve();
    }

    const channels = ids.flatMap((id) => [
        subscribeToTable(
            `${channelPrefix}-match-${id}`,
            'pvpMatches',
            `id=eq.${id}`,
            'match',
            callback,
            'UPDATE'
        ),
        subscribeToTable(
            `${channelPrefix}-participants-${id}`,
            'pvpMatchParticipants',
            `matchId=eq.${id}`,
            'participant',
            callback,
            'UPDATE'
        ),
        subscribeToTable(
            `${channelPrefix}-results-${id}`,
            'pvpMatchResults',
            `matchId=eq.${id}`,
            'result',
            callback,
            ['INSERT', 'UPDATE']
        )
    ]);

    return () => removeChannels(channels);
}

export function subscribeToPvpMatchDetail(matchId: number | string, callback: RealtimeCallback) {
    if (matchId === null || matchId === undefined || matchId === '') {
        return () => Promise.resolve();
    }

    const channels = [
        subscribeToTable(
            `pvp-match-detail-${matchId}`,
            'pvpMatches',
            `id=eq.${matchId}`,
            'match',
            callback,
            'UPDATE'
        ),
        subscribeToTable(
            `pvp-match-detail-participants-${matchId}`,
            'pvpMatchParticipants',
            `matchId=eq.${matchId}`,
            'participant',
            callback,
            'UPDATE'
        ),
        subscribeToTable(
            `pvp-match-detail-results-${matchId}`,
            'pvpMatchResults',
            `matchId=eq.${matchId}`,
            'result',
            callback,
            ['INSERT', 'UPDATE']
        ),
        subscribeToTable(
            `pvp-match-detail-messages-${matchId}`,
            'pvpMatchMessages',
            `matchId=eq.${matchId}`,
            'message',
            callback,
            'INSERT'
        ),
        subscribeToTable(
            `pvp-match-detail-ban-pick-${matchId}`,
            'pvpMatchBanPicks',
            `matchId=eq.${matchId}`,
            'banPick',
            callback,
            'INSERT'
        )
    ];

    return () => removeChannels(channels);
}
