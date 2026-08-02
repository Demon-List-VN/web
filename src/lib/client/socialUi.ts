import { writable } from 'svelte/store';
import type { SocialPlayer } from '$lib/client/social';

export type SocialCenterTab = 'friends' | 'conversations';

type SocialCenterRequest = {
    id: number;
    tab: SocialCenterTab;
    player: SocialPlayer | null;
};

let requestId = 0;

export const socialCenterRequest = writable<SocialCenterRequest>({
    id: requestId,
    tab: 'friends',
    player: null
});

export function openSocialCenter(
    tab: SocialCenterTab = 'friends',
    player: SocialPlayer | null = null
) {
    requestId += 1;
    socialCenterRequest.set({ id: requestId, tab, player });
}
