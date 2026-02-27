<script context="module" lang="ts">
	let courseCache: { authKey: string; data: any; fetchedAt: number } | null = null;
	let courseInFlight: Promise<any> | null = null;
	const COURSE_CACHE_TTL = 15000;
</script>

<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { onMount } from 'svelte';
	import { user } from '$lib/client';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Skeleton } from '$lib/components/ui/skeleton/index.js';
	import Lock from 'lucide-svelte/icons/lock';
	import Check from 'lucide-svelte/icons/check';

	let loading = true;
	let mounted = false;
	let hasFetched = false;
	let lastAuthKey = '';
	let courseData: any = null;
	let levelDetails: Record<number, any> = {};
	let mapPackDetails: Record<number, any> = {};
	const COURSE_CLEAR_XP = 100;

	$: entries = courseData?.entries || [];
	$: visibleEntries = entries.filter((entry: any) => entry.completed || entry.unlocked);
	$: showUnknownRow = entries.some((entry: any) => !entry.unlocked) && visibleEntries.length < entries.length;

	function getLevelData(entry: any) {
		return entry?.levelData || levelDetails[Number(entry.refId)] || null;
	}

	function getMapPackData(entry: any) {
		return entry?.mapPackData || mapPackDetails[Number(entry.refId)] || null;
	}

	function getLevelName(entry: any) {
		const level = getLevelData(entry);
		return level?.name || 'Unknown level';
	}

	function getLevelCreator(entry: any) {
		const level = getLevelData(entry);
		return level?.creator || '';
	}

	function getMapPackLevelNames(entry: any) {
		const mapPack = getMapPackData(entry);
		const mapPackLevels = mapPack?.mapPackLevels || [];

		if (!Array.isArray(mapPackLevels) || mapPackLevels.length === 0) {
			return '';
		}

		return mapPackLevels
			.slice()
			.sort((a: any, b: any) => Number(a.order || 0) - Number(b.order || 0))
			.map((levelItem: any) => levelItem?.levels?.name)
			.filter((name: any) => !!name)
			.join(', ');
	}

	async function fetchBatchDetails(payload: any) {
		const entryList = payload?.entries || [];
		const visible = entryList.filter((entry: any) => entry.completed || entry.unlocked);

		const levelIds = [
			...new Set(
				visible
					.filter((entry: any) => entry.type === 'level' && !entry?.levelData)
					.map((entry: any) => Number(entry.refId))
					.filter((id: number) => Number.isFinite(id))
			)
		];

		const mapPackIds = [
			...new Set(
				visible
					.filter((entry: any) => entry.type === 'mappack' && !entry?.mapPackData)
					.map((entry: any) => Number(entry.refId))
					.filter((id: number) => Number.isFinite(id))
			)
		];

		const [levelsRes, mapPacksRes] = await Promise.all([
			levelIds.length > 0
				? fetch(`${import.meta.env.VITE_API_URL}/levels/batch`, {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ batch: levelIds })
					})
				: Promise.resolve(null),
			mapPackIds.length > 0
				? fetch(`${import.meta.env.VITE_API_URL}/mappacks/batch`, {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ batch: mapPackIds })
					})
				: Promise.resolve(null)
		]);

		const levelMap: Record<number, any> = {};
		const mapPackMap: Record<number, any> = {};

		if (levelsRes?.ok) {
			const rows = await levelsRes.json();
			(rows || []).forEach((level: any) => {
				levelMap[Number(level.id)] = level;
			});
		}

		if (mapPacksRes?.ok) {
			const rows = await mapPacksRes.json();
			(rows || []).forEach((mapPack: any) => {
				mapPackMap[Number(mapPack.id)] = mapPack;
			});
		}

		levelDetails = levelMap;
		mapPackDetails = mapPackMap;
	}

	async function fetchCourse(force = false) {
		loading = true;
		try {
			const token = $user.loggedIn ? await $user.token() : null;
			const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
			const authKey = token ? 'auth' : 'guest';
			const now = Date.now();

			if (!force && courseCache && courseCache.authKey === authKey && now - courseCache.fetchedAt < COURSE_CACHE_TTL) {
				courseData = courseCache.data;
				await fetchBatchDetails(courseData);
				return;
			}

			if (!force && courseInFlight) {
				const payload = await courseInFlight;
				courseData = payload;
				await fetchBatchDetails(payload);
				return;
			}

			courseInFlight = (async () => {
				const res = await fetch(`${import.meta.env.VITE_API_URL}/battlepass/course`, { headers });
				if (!res.ok) return null;
				return await res.json();
			})();

			const payload = await courseInFlight;
			courseInFlight = null;

			courseData = payload;
			courseCache = {
				authKey,
				data: payload,
				fetchedAt: now
			};

			if (payload) {
				await fetchBatchDetails(payload);
			} else {
				levelDetails = {};
				mapPackDetails = {};
			}
		} catch (e) {
			console.error('Failed to fetch course:', e);
			courseData = null;
			levelDetails = {};
			mapPackDetails = {};
			courseInFlight = null;
		} finally {
			loading = false;
		}
	}

	async function refreshCourse(force = false) {
		const authKey = $user.loggedIn ? 'auth' : 'guest';

		if (!force && hasFetched && authKey === lastAuthKey) {
			return;
		}

		lastAuthKey = authKey;
		hasFetched = true;
		await fetchCourse(force);
	}

	onMount(() => {
		mounted = true;
		refreshCourse();

		const unsub = user.subscribe(async () => {
			if (!mounted) return;
			await refreshCourse();
		});

		return () => {
			mounted = false;
			unsub();
		};
	});
</script>

<div class="mb-4 text-center">
	<h2 class="text-2xl font-bold">{$_('battlepass.course.title')}</h2>
	<p class="text-muted-foreground">{$_('battlepass.course.description')}</p>
</div>

{#if loading}
	<div class="grid gap-4">
		<Skeleton class="h-28 w-full" />
		<Skeleton class="h-28 w-full" />
		<Skeleton class="h-28 w-full" />
	</div>
{:else if !courseData}
	<div class="rounded-lg border p-6 text-center text-muted-foreground">{$_('battlepass.course.no_course')}</div>
{:else}
	<div class="flex flex-col gap-3">
		{#each visibleEntries as entry, index}
			<Card.Root class="border-2 {entry.completed ? 'border-green-500/40' : entry.unlocked ? 'border-primary/40' : 'border-border'}">
				<Card.Content class="flex items-center justify-between p-4">
					<div class="flex items-center gap-3">
						<div class="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-sm font-bold">
							{index + 1}
						</div>
						<div>
							<div class="font-semibold">
								{#if entry.type === 'level'}
									{getLevelName(entry)}
									{#if getLevelCreator(entry)}
										<span class="opacity-60 font-light"> by {getLevelCreator(entry)}</span>
									{/if}
								{:else}
									{getMapPackData(entry)?.name || 'Unknown map pack'}
								{/if}
							</div>
							<div class="text-xs text-muted-foreground">
								{#if entry.type === 'mappack'}
									{getMapPackLevelNames(entry) || '-'}
									 •
								{/if}
								{$_('battlepass.course.on_clear', { values: { xp: COURSE_CLEAR_XP } })}
								{#if entry.rewardItemId}
									 •
								{/if}
								{#if entry.rewardItemId}
									{$_('battlepass.course.bonus_item', { values: { itemId: entry.rewardItemId, quantity: entry.rewardQuantity } })}
								{/if}
							</div>
						</div>
					</div>
					<div class="flex items-center gap-2">
						{#if entry.completed}
							<div class="flex items-center gap-1 text-sm text-green-500">
								<Check class="h-4 w-4" />
								{$_('battlepass.course.completed', { values: { xp: COURSE_CLEAR_XP } })}
							</div>
						{:else if !entry.completed}
							<div class="text-sm text-yellow-500">{$_('battlepass.course.in_progress')}</div>
						{/if}
					</div>
				</Card.Content>
			</Card.Root>
		{/each}

		{#if showUnknownRow}
			<Card.Root class="border-2 border-border">
				<Card.Content class="flex items-center justify-between p-4">
					<div class="flex items-center gap-3">
						<div class="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-sm font-bold">?</div>
						<div>
							<div class="font-semibold">?</div>
							<div class="text-xs text-muted-foreground">{$_('battlepass.locked')}</div>
						</div>
					</div>
					<div class="flex items-center gap-1 text-sm text-muted-foreground">
						<Lock class="h-4 w-4" />
						{$_('battlepass.locked')}
					</div>
				</Card.Content>
			</Card.Root>
		{/if}
	</div>
{/if}
