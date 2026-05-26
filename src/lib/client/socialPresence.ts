import { browser } from '$app/environment';
import supabase from '$lib/client/supabase';
import { get, writable } from 'svelte/store';

export type SocialPresencePlatform = 'web';

export type SocialPresencePayload = {
    uid: string;
    platform: SocialPresencePlatform;
    updatedAt: string;
    clientVersion?: string;
};

export type AggregatedSocialPresence = {
    online: boolean;
    platforms: SocialPresencePlatform[];
};

const CHANNEL_PREFIX = 'social-presence';
const ownVisible = writable(true);
const ownUid = writable('');
let ownChannel: ReturnType<typeof supabase.channel> | null = null;
let ownPresenceKey = '';

export const socialPresenceVisible = {
    subscribe: ownVisible.subscribe,
    set(value: boolean) {
        if (get(ownVisible) === value) {
            return;
        }

        ownVisible.set(value);
        void republishOwnPresence();
    }
};

export const ownSocialPresenceUid = {
    subscribe: ownUid.subscribe,
    set(value: string) {
        if (get(ownUid) === value) {
            return;
        }

        ownUid.set(value);
        void republishOwnPresence();
    }
};

function channelName(uid: string) {
    return `${CHANNEL_PREFIX}:${uid}`;
}

function aggregatePresenceState(state: Record<string, SocialPresencePayload[]>) {
    const platforms = new Set<SocialPresencePlatform>();

    for (const presences of Object.values(state || {})) {
        for (const presence of presences || []) {
            if (presence?.platform === 'web') {
                platforms.add(presence.platform);
            }
        }
    }

    return {
        online: platforms.size > 0,
        platforms: [...platforms].sort() as SocialPresencePlatform[]
    };
}

async function stopOwnPresence() {
    if (ownChannel) {
        const channel = ownChannel;
        ownChannel = null;
        await supabase.removeChannel(channel);
    }
}

async function republishOwnPresence() {
    if (!browser) {
        return;
    }

    const uid = get(ownUid);
    const visible = get(ownVisible);
    const nextKey = visible && uid ? uid : '';

    if (!nextKey) {
        ownPresenceKey = '';
        await stopOwnPresence();

        return;
    }

    if (ownChannel && ownPresenceKey === nextKey) {
        await ownChannel.track({
            uid,
            platform: 'web',
            updatedAt: new Date()
                .toISOString()
        } satisfies SocialPresencePayload);

        return;
    }

    await stopOwnPresence();
    ownPresenceKey = nextKey;
    ownChannel = supabase.channel(channelName(uid), {
        config: {
            presence: {
                key: `web:${uid}:${crypto.randomUUID?.() ?? Date.now()}`
            }
        }
    });

    ownChannel.subscribe(async (status) => {
        if (status !== 'SUBSCRIBED' || !ownChannel) {
            return;
        }

        await ownChannel.track({
            uid,
            platform: 'web',
            updatedAt: new Date()
                .toISOString()
        } satisfies SocialPresencePayload);
    });
}

export function subscribeToSocialPresence(
    uids: string[],
    callback: (presence: Record<string, AggregatedSocialPresence>) => void
) {
    const uniqueUids = [...new Set(uids.filter(Boolean))];
    const channels: ReturnType<typeof supabase.channel>[] = [];
    const stateByUid: Record<string, AggregatedSocialPresence> = {};

    for (const uid of uniqueUids) {
        const channel = supabase.channel(channelName(uid));
        channel.on('presence', { event: 'sync' }, () => {
            stateByUid[uid] = aggregatePresenceState(
                channel.presenceState() as Record<string, SocialPresencePayload[]>
            );
            callback({ ...stateByUid });
        });
        channel.subscribe();
        channels.push(channel);
    }

    return () => Promise.all(channels.map((channel) => supabase.removeChannel(channel)));
}

export function socialPresenceLabel(
    presence: AggregatedSocialPresence | null | undefined,
    text: (en: string, vi: string) => string
) {
    if (!presence?.online) {
        return text('Offline', 'Ngoại tuyến');
    }

    return text('Online', 'Online');
}
