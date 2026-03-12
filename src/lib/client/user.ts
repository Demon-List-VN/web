import supabase from '$lib/client/supabase';
import type { PlayerSummary } from '$lib/client/apiTypes';
import { writable } from 'svelte/store';
import * as sdk from '$lib/client/sdk';

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
	if (typeof window === 'undefined') return;

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
	if (typeof window === 'undefined') return;

	try {
		localStorage.removeItem(CACHE_KEY);
	} catch (e) {
		console.error('Failed to clear cached user data:', e);
	}
}

async function addNewUser() {
	const { error } = await supabase.auth.getSession();

	if (error) {
		throw new Error(error.message);
	}

	await sdk.fetch(`/players`, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${await userData.token()}`,
			'Content-Type': 'application/json'
		}
	});
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

		await sdk.fetch(`/players/syncRole`, {
			method: 'PATCH',
			headers: {
				Authorization: 'Bearer ' + (await userData.token())
			}
		});
	},
	refresh: async () => {
		const { data, error } = await supabase.auth.getUser();

		if (error) {
			userData.checked = true;
			clearCachedUserData();
			user.set(userData);
			return;
		}

		const userId = data.user.id;
		const cachedData = loadCachedUserData();

		if (cachedData && cachedData.userId === userId) {
			userData.data = cachedData.data;
			userData.ratings = cachedData.ratings;
			userData.loggedIn = true;
			userData.checked = true;
			user.set(userData);
		}

		const tmp = Promise.all([
			sdk.get<PlayerSummary>(`/players/${userId}?cached=true`).then((res) => {
				userData.data = res;
			}),
			sdk.get<Rating[]>(`/players/${userId}/records?ratingOnly=true`).then((res) => {
				userData.ratings = res;
			})
		])
			.then(() => {
				userData.loggedIn = true;
				userData.checked = true;
				saveCachedUserData(userId, userData.data, userData.ratings);
				user.set(userData);
			})
			.catch((err) => {
				addNewUser().then(() => {
					Promise.all([
						sdk.get<PlayerSummary>(`/players/${userId}?cached=true`).then((res) => {
							userData.data = res;
						}),
						sdk.get<Rating[]>(`/players/${userId}/records?ratingOnly=true`).then((res) => {
							userData.ratings = res;
						})
					]).then(() => {
						userData.loggedIn = true;
						userData.checked = true;
						saveCachedUserData(userId, userData.data, userData.ratings);
						user.set(userData);
					});
				});
			});

		await tmp;
	}
};

export const user = writable(userData);

async function upd() {
	await userData.refresh();
	await userData.syncRole();
}

upd();
