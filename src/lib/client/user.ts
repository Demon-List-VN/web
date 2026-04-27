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

async function fetchCurrentPlayer() {
	const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/me`, {
		headers: {
			Authorization: `Bearer ${await userData.token()}`
		}
	});

	if (!response.ok) {
		throw new Error(`Failed to fetch current user: ${response.status}`);
	}

	return response.json();
}

async function addNewUser() {
	const { error } = await supabase.auth.getSession();

	if (error) {
		throw new Error(error.message);
	}

	await fetch(`${import.meta.env.VITE_API_URL}/players`, {
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

		await fetch(`${import.meta.env.VITE_API_URL}/players/syncRole`, {
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
			fetchCurrentPlayer()
				.then((res) => {
					userData.data = res;
				}),
			fetch(`${import.meta.env.VITE_API_URL}/players/${userId}/records?ratingOnly=true`)
				.then((res) => res.json())
				.then((res: any) => {
					userData.ratings = res;
				})
		])
			.then(() => {
				userData.loggedIn = true;
				userData.checked = true;
				saveCachedUserData(userId, userData.data, userData.ratings);
				user.set(userData);
			})
			.catch((_err) => {
				addNewUser().then(() => {
					Promise.all([
						fetchCurrentPlayer()
							.then((res) => {
								userData.data = res;
							}),
						fetch(`${import.meta.env.VITE_API_URL}/players/${userId}/records?ratingOnly=true`)
							.then((res) => res.json())
							.then((res: any) => {
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
