import { user } from '$lib/client/user';
import { get } from 'svelte/store';

const API = import.meta.env.VITE_API_URL;

export type TournamentFormat = 'single_elimination' | 'contest';
export type TournamentVisibility = 'public' | 'unlisted' | 'private';
export type TournamentStatus =
    | 'draft'
    | 'registration_open'
    | 'registration_closed'
    | 'ready'
    | 'ongoing'
    | 'finished'
    | 'cancelled';

export const SINGLE_ELIM_SIZES = [4, 8, 16, 32];

async function authHeaders(): Promise<Record<string, string>> {
    const token = await get(user)
        .token();

    return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function tournamentFetch(path: string, init: RequestInit = {}) {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(await authHeaders()),
        ...(init.headers as Record<string, string> | undefined ?? {})
    };
    const res = await fetch(`${API}/tournaments${path}`, { ...init, headers });
    const text = await res.text();
    const json = text ? JSON.parse(text) : null;

    if (!res.ok) {
        throw new Error(json?.error || 'Request failed');
    }

    return json;
}

export function rarityColor(rarity: number | null | undefined) {
    switch (rarity) {
        case 1:
            return '#3b82f6';
        case 2:
            return '#a855f7';
        case 3:
            return '#ec4899';
        case 4:
            return '#dc2626';
        default:
            return '#9ca3af';
    }
}

export function formatLabelKey(format: TournamentFormat) {
    return format === 'contest'
        ? 'tournament.format.contest'
        : 'tournament.format.single_elimination';
}

export function statusLabelKey(status: TournamentStatus) {
    return `tournament.status.${status}`;
}

export function eloRangeText(minElo: number | null, maxElo: number | null) {
    if (minElo == null && maxElo == null) {
        return null;
    }

    if (minElo != null && maxElo != null) {
        return `${minElo} - ${maxElo}`;
    }

    if (minElo != null) {
        return `≥ ${minElo}`;
    }

    return `≤ ${maxElo}`;
}
