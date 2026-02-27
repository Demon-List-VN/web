<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { onMount } from 'svelte';
	import { user } from '$lib/client';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Skeleton } from '$lib/components/ui/skeleton/index.js';
	import RewardButton from '$lib/components/RewardButton.svelte';
	import Lock from 'lucide-svelte/icons/lock';
	import Check from 'lucide-svelte/icons/check';

	let loading = true;
	let mounted = false;
	let hasFetched = false;
	let lastAuthKey = '';
	let courseData: any = null;
	let courseInFlight: Promise<any> | null = null;
	let levelDetails: Record<number, any> = {};
	let mapPackDetails: Record<number, any> = {};
	let levelProgressMap: Record<number, number> = {};
	let mapPackProgressMap: Record<number, number> = {};
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

	function getEntryProgressPercent(entry: any) {
		if (entry?.completed) return 100;

		if (entry?.type === 'level') {
			return Math.max(0, Math.min(100, Number(levelProgressMap[Number(entry.refId)] || 0)));
		}

		if (entry?.type === 'mappack') {
			return Math.max(0, Math.min(100, Number(mapPackProgressMap[Number(entry.refId)] || 0)));
		}

		return 0;
	}

	function getCourseReward(entry: any) {
		if (!entry?.rewardItemId) return null;
		return {
			itemId: entry.rewardItemId,
			quantity: Number(entry.rewardQuantity || 1),
			items: entry.rewardItemData || null
		};
	}

	async function fetchEntryProgress(payload: any) {
		if (!$user.loggedIn || !payload?.entries?.length) {
			levelProgressMap = {};
			mapPackProgressMap = {};
			return;
		}

		const visible = (payload.entries || []).filter((entry: any) => entry.completed || entry.unlocked);
		const levelIds = [...new Set(visible.filter((entry: any) => entry.type === 'level').map((entry: any) => Number(entry.refId)))];
		const mapPackIds = [...new Set(visible.filter((entry: any) => entry.type === 'mappack').map((entry: any) => Number(entry.refId)))];

		const token = await $user.token();
		const headers: HeadersInit = { Authorization: `Bearer ${token}` };

		const [levelRes, mapPackRes] = await Promise.all([
			levelIds.length > 0
				? fetch(`${import.meta.env.VITE_API_URL}/battlepass/levels/progress?ids=${levelIds.join(',')}`, { headers })
				: Promise.resolve(null),
			mapPackIds.length > 0
				? fetch(`${import.meta.env.VITE_API_URL}/battlepass/mappacks/progress?ids=${mapPackIds.join(',')}`, { headers })
				: Promise.resolve(null)
		]);

		const nextLevelProgressMap: Record<number, number> = {};
		const nextMapPackProgressMap: Record<number, number> = {};

		if (levelRes?.ok) {
			const rows = await levelRes.json();
			(rows || []).forEach((row: any) => {
				nextLevelProgressMap[Number(row.battlePassLevelId)] = Number(row.progress || 0);
			});
		}

		if (mapPackRes?.ok) {
			const rows = await mapPackRes.json();
			(rows || []).forEach((row: any) => {
				nextMapPackProgressMap[Number(row.battlePassMapPackId)] = Number(row.progress || 0);
			});
		}

		levelProgressMap = nextLevelProgressMap;
		mapPackProgressMap = nextMapPackProgressMap;
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

	async function fetchCourse() {
		loading = true;
		try {
			const token = $user.loggedIn ? await $user.token() : null;
			const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};

			if (courseInFlight) {
				const payload = await courseInFlight;
				courseData = payload;
				await fetchBatchDetails(payload);
				await fetchEntryProgress(payload);
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

			if (payload) {
				await fetchBatchDetails(payload);
				await fetchEntryProgress(payload);
			} else {
				levelDetails = {};
				mapPackDetails = {};
				levelProgressMap = {};
				mapPackProgressMap = {};
			}
		} catch (e) {
			console.error('Failed to fetch course:', e);
			courseData = null;
			levelDetails = {};
			mapPackDetails = {};
			levelProgressMap = {};
			mapPackProgressMap = {};
			courseInFlight = null;
		} finally {
			loading = false;
		}
	}

	async function refreshCourse() {
		const authKey = $user.loggedIn ? 'auth' : 'guest';

		if (hasFetched && authKey === lastAuthKey) {
			return;
		}

		lastAuthKey = authKey;
		hasFetched = true;
		await fetchCourse();
	}

	onMount(() => {
		mounted = true;

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
					<div class="flex items-center gap-3 min-w-0">
						<div class="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-sm font-bold">
							{index + 1}
						</div>
						<div class="min-w-0">
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
							</div>

							<div class="mt-2 flex items-center gap-2">
								<div class="h-2 w-32 overflow-hidden rounded-full bg-muted">
									<div
										class="h-full rounded-full bg-primary transition-all"
										style="width: {getEntryProgressPercent(entry)}%"
									/>
								</div>
								<span class="text-xs text-muted-foreground">{Math.round(getEntryProgressPercent(entry))}%</span>
							</div>
						</div>
					</div>
					<div class="flex items-center gap-2 shrink-0">
						{#if getCourseReward(entry)}
							<div class="scale-90 origin-right">
								<RewardButton
									reward={getCourseReward(entry)}
									isPremiumActivated={true}
									isPremiumTrack={false}
									isClaimable={true}
									isClaimed={false}
									isClaiming={false}
									editable={false}
								/>
							</div>
						{/if}

						{#if entry.completed}
							<div class="flex items-center gap-1 text-sm text-green-500">
								<Check class="h-4 w-4" />
								{$_('battlepass.course.completed', { values: { xp: COURSE_CLEAR_XP } })}
							</div>
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
