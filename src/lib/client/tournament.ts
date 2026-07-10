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

export async function getTournamentContestLevels(tournament: any) {
    if (!['ongoing', 'finished'].includes(tournament.status)) {
        return [];
    }

    const contestLevels = tournament.contestLevels
        ?? await tournamentFetch(`/${tournament.id}/levels`);

    if (!contestLevels?.length) {
        return [];
    }

    const response = await fetch(`${API}/levels/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            batch: contestLevels.map((level: any) => Number(level.levelId))
        })
    });

    if (!response.ok) {
        throw new Error('Failed to load level details');
    }

    const details = await response.json();
    const detailById = new Map(
        (details ?? []).map((level: any) => [Number(level.id), level])
    );

    return contestLevels.map((level: any) => ({
        ...(detailById.get(Number(level.levelId)) ?? {}),
        ...level
    }));
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

export type StatusTone = 'live' | 'open' | 'soon' | 'done' | 'cancelled' | 'draft';

export interface StatusMeta {
    labelKey: string;
    tone: StatusTone;
    /** Literal Tailwind classes for a status pill (kept literal so JIT picks them up). */
    badgeClass: string;
    /** Literal Tailwind class for a status dot. */
    dotClass: string;
}

export function statusMeta(status: TournamentStatus): StatusMeta {
    const labelKey = statusLabelKey(status);

    switch (status) {
        case 'ongoing':
            return {
                labelKey,
                tone: 'live',
                badgeClass: 'border-transparent bg-green-500/15 text-green-500',
                dotClass: 'bg-green-500'
            };
        case 'registration_open':
            return {
                labelKey,
                tone: 'open',
                badgeClass: 'border-transparent bg-blue-500/15 text-blue-400',
                dotClass: 'bg-blue-500'
            };
        case 'registration_closed':
        case 'ready':
            return {
                labelKey,
                tone: 'soon',
                badgeClass: 'border-transparent bg-amber-500/15 text-amber-400',
                dotClass: 'bg-amber-500'
            };
        case 'finished':
            return {
                labelKey,
                tone: 'done',
                badgeClass: 'border-transparent bg-zinc-500/15 text-zinc-300',
                dotClass: 'bg-zinc-400'
            };
        case 'cancelled':
            return {
                labelKey,
                tone: 'cancelled',
                badgeClass: 'border-transparent bg-red-500/15 text-red-400',
                dotClass: 'bg-red-500'
            };
        case 'draft':
        default:
            return {
                labelKey,
                tone: 'draft',
                badgeClass: 'border-transparent bg-muted text-muted-foreground',
                dotClass: 'bg-muted-foreground'
            };
    }
}

/** High-level lifecycle stages shown in the timeline (draft folds into registration). */
export const LIFECYCLE_STAGES = ['registration', 'closed', 'ready', 'ongoing'] as const;

export function lifecycleStageKey(stage: (typeof LIFECYCLE_STAGES)[number]) {
    return `tournament.lifecycle_stage.${stage}`;
}

/** Index of the active lifecycle stage; -1 when cancelled. */
export function stageIndex(status: TournamentStatus): number {
    switch (status) {
        case 'draft':
        case 'registration_open':
            return 0;
        case 'registration_closed':
            return 1;
        case 'ready':
            return 2;
        case 'ongoing':
            return 3;
        case 'finished':
            return 4;
        case 'cancelled':
            return -1;
        default:
            return 0;
    }
}

export interface Milestone {
    labelKey: string;
    at: Date;
}

function futureDate(value: unknown): Date | null {
    if (!value) {
        return null;
    }

    const date = new Date(String(value));

    return Number.isNaN(date.getTime()) ? null : date;
}

/** The next scheduled transition the viewer is waiting on, or null. */
export function nextMilestone(tournament: any): Milestone | null {
    const now = Date.now();
    const opens = futureDate(tournament.registrationOpensAt);
    const closes = futureDate(tournament.registrationClosesAt);
    const starts = futureDate(tournament.startsAt);
    const future = (date: Date | null) => (date && date.getTime() > now ? date : null);

    switch (tournament.status) {
        case 'draft': {
            const at = future(opens) ?? future(closes) ?? future(starts);

            if (!at) {
                return null;
            }

            return {
                labelKey:
                    at === opens
                        ? 'tournament.milestone.registration_opens'
                        : at === closes
                            ? 'tournament.milestone.registration_closes'
                            : 'tournament.milestone.starts',
                at
            };
        }

        case 'registration_open': {
            const at = future(closes) ?? future(starts);

            if (!at) {
                return null;
            }

            return {
                labelKey:
                    at === closes
                        ? 'tournament.milestone.registration_closes'
                        : 'tournament.milestone.starts',
                at
            };
        }

        case 'registration_closed':
        case 'ready': {
            const at = future(starts);

            return at ? { labelKey: 'tournament.milestone.starts', at } : null;
        }

        default:
            return null;
    }
}

export interface TournamentGroup {
    key: string;
    labelKey: string;
    items: any[];
}

/** Buckets tournaments by lifecycle status, dropping empty groups. */
export function groupTournaments(list: any[]): TournamentGroup[] {
    const live: any[] = [];
    const open: any[] = [];
    const upcoming: any[] = [];
    const finished: any[] = [];
    const cancelled: any[] = [];

    for (const tournament of list ?? []) {
        switch (tournament.status) {
            case 'ongoing':
                live.push(tournament);
                break;
            case 'registration_open':
                open.push(tournament);
                break;
            case 'finished':
                finished.push(tournament);
                break;
            case 'cancelled':
                cancelled.push(tournament);
                break;
            default:
                upcoming.push(tournament);
        }
    }

    return [
        { key: 'live', labelKey: 'tournament.list.group.live', items: live },
        { key: 'registration', labelKey: 'tournament.list.group.registration', items: open },
        { key: 'upcoming', labelKey: 'tournament.list.group.upcoming', items: upcoming },
        { key: 'finished', labelKey: 'tournament.list.group.finished', items: finished },
        { key: 'cancelled', labelKey: 'tournament.list.group.cancelled', items: cancelled }
    ].filter((group) => group.items.length > 0);
}
