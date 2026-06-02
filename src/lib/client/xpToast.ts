import { user } from '$lib/client/user';
import PvpXpToast from '$lib/components/pvp/PvpXpToast.svelte';
import type { PvpXpAward } from '$lib/client/pvp';
import { toast } from 'svelte-sonner';

function syncUserXpFromAward(award: PvpXpAward) {
    const newXp = Number(award?.newXp);

    if (!Number.isFinite(newXp)) {
        return;
    }

    user.update((current) => ({
        ...current,
        data: current.data
            ? {
                ...current.data,
                exp: Math.max(0, Math.trunc(newXp)),
                extraExp: 0
            }
            : current.data
    }));
}

export function showXpAwardToast(award: PvpXpAward | null | undefined) {
    if (!award || Number(award.diff) <= 0) {
        return;
    }

    syncUserXpFromAward(award);
    toast.custom(PvpXpToast, {
        componentProps: { award },
        duration: Number.POSITIVE_INFINITY,
        position: 'top-center',
        unstyled: true
    });
}
