import supabase from '$lib/client/supabase';
import { writable } from 'svelte/store';

interface Rating {
    progress: number;
    rating: number;
}

interface userType {
    data: any;
    ratings: Rating[];
    token: () => Promise<string | undefined>;
    loggedIn: boolean;
    checked: boolean;
    syncRole: () => Promise<void>;
    refresh: () => Promise<void>;
}

interface CachedUserData {
    data: any;
    ratings: Rating[];
    userId: string;
    timestamp: number;
}

const CACHE_KEY = 'dlvn_user_cache';

async function fetchWithTimeout(
    input: RequestInfo | URL,
    init: RequestInit = {},
    timeoutMs = 10000
) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
        return await fetch(input, {
            ...init,
            signal: controller.signal
        });
    } finally {
        clearTimeout(timeoutId);
    }
}

function isCurrentPlayer(value: unknown): value is { uid: string | number; } {
    return Boolean(
        value
            && typeof value === 'object'
            && 'uid' in value
            && (typeof (value as { uid?: unknown; }).uid === 'string'
                || typeof (value as { uid?: unknown; }).uid === 'number')
            && String((value as { uid: string | number; }).uid)
                .trim()
    );
}

function markLoggedOut() {
    userData.data = undefined;
    userData.ratings = [];
    userData.loggedIn = false;
    userData.checked = true;
    clearCachedUserData();
    user.set(userData);
}

function loadCachedUserData(): CachedUserData | null {
    if (typeof window === 'undefined') {
        return null;
    }

    try {
        const cached = localStorage.getItem(CACHE_KEY);

        if (!cached) {
            return null;
        }

        const cachedData: CachedUserData = JSON.parse(cached);

        return cachedData;
    } catch (e) {
        console.error('Failed to load cached user data:', e);

        return null;
    }
}

function saveCachedUserData(userId: string, data: any, ratings: Rating[]) {
    if (typeof window === 'undefined') {
        return;
    }

    try {
        const cacheData: CachedUserData = {
            data,
            ratings,
            userId,
            timestamp: Date.now()
        };
        localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
    } catch (e) {
        console.error('Failed to save user data to cache:', e);
    }
}

function clearCachedUserData() {
    if (typeof window === 'undefined') {
        return;
    }

    try {
        localStorage.removeItem(CACHE_KEY);
    } catch (e) {
        console.error('Failed to clear cached user data:', e);
    }
}

async function fetchCurrentPlayer() {
    const response = await fetchWithTimeout(
        `${import.meta.env.VITE_API_URL}/auth/me`,
        {
            headers: {
                Authorization: `Bearer ${await userData.token()}`
            }
        },
        15000
    );

    if (!response.ok) {
        throw new Error(`Failed to fetch current user: ${response.status}`);
    }

    const player = await response.json();

    if (!isCurrentPlayer(player)) {
        throw new Error('Current user profile is missing or invalid');
    }

    return player;
}

async function fetchCurrentPlayerRatings(userId: string) {
    const response = await fetchWithTimeout(
        `${import.meta.env.VITE_API_URL}/players/${userId}/records?ratingOnly=true`,
        {},
        7000
    );

    if (!response.ok) {
        throw new Error(`Failed to fetch current user ratings: ${response.status}`);
    }

    const ratings = await response.json();

    return Array.isArray(ratings) ? ratings : [];
}

async function addNewUser() {
    const { error } = await supabase.auth.getSession();

    if (error) {
        throw new Error(error.message);
    }

    const response = await fetchWithTimeout(
        `${import.meta.env.VITE_API_URL}/players`,
        {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${await userData.token()}`,
                'Content-Type': 'application/json'
            }
        },
        10000
    );

    if (!response.ok && response.status !== 409) {
        throw new Error(`Failed to create current user profile: ${response.status}`);
    }
}

async function loadRemoteUser(userId: string) {
    const player = await fetchCurrentPlayer();
    let ratings: Rating[] = [];

    try {
        ratings = await fetchCurrentPlayerRatings(userId);
    } catch (err) {
        console.warn('Failed to load current user ratings:', err);
    }

    userData.data = player;
    userData.ratings = ratings;
    userData.loggedIn = true;
    userData.checked = true;
    saveCachedUserData(userId, userData.data, userData.ratings);
    user.set(userData);
}

const userData: userType = {
    data: undefined,
    ratings: [],
    token: async () => {
        const { data, error } = await supabase.auth.getSession();

        if (error) {
            throw new Error(error.message);
        }

        return data?.session?.access_token;
    },
    loggedIn: false,
    checked: false,
    syncRole: async () => {
        if (!userData.loggedIn) {
            return;
        }

        await fetch(`${import.meta.env.VITE_API_URL}/players/syncRole`, {
            method: 'PATCH',
            headers: {
                Authorization: 'Bearer ' + (await userData.token())
            }
        });
    },
    refresh: async () => {
        const { data, error } = await supabase.auth.getUser();

        if (error || !data.user) {
            markLoggedOut();

            return;
        }

        const userId = data.user.id;
        const cachedData = loadCachedUserData();

        if (
            cachedData
            && cachedData.userId === userId
            && isCurrentPlayer(cachedData.data)
        ) {
            userData.data = cachedData.data;
            userData.ratings = Array.isArray(cachedData.ratings)
                ? cachedData.ratings
                : [];
            userData.loggedIn = true;
            userData.checked = true;
            user.set(userData);
        }

        try {
            await loadRemoteUser(userId);
        } catch (err) {
            console.warn('Failed to load current user; trying profile creation:', err);
            clearCachedUserData();

            try {
                await addNewUser();
                await loadRemoteUser(userId);
            } catch (retryErr) {
                console.error('Failed to recover current user profile:', retryErr);
                markLoggedOut();
            }
        }
    }
};

export const user = writable(userData);

async function upd() {
    await userData.refresh();
    await userData.syncRole();
}

upd();
