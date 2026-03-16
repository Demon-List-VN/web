<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { user } from '$lib/client';
	import { createEventDispatcher } from 'svelte';
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Skeleton } from '$lib/components/ui/skeleton/index.js';
	import Sun from 'lucide-svelte/icons/sun';
	import Calendar from 'lucide-svelte/icons/calendar';
	import Zap from 'lucide-svelte/icons/zap';
	import Check from 'lucide-svelte/icons/check';
	import Lock from 'lucide-svelte/icons/lock';
	import { DIFFICULTY_COLORS, DIFFICULTY_NAMES } from '$lib/battlepass/constants';
	import Gift from 'lucide-svelte/icons/gift';
	import Tv from 'lucide-svelte/icons/tv-2';

	export let primaryColor: string = '#8b5cf6';

	let loading = true;
	let dailyWeeklyData: { daily: any; weekly: any } = { daily: null, weekly: null };
	let mounted = false;
	let checkinStatus: { claimed: boolean; xp: number } | null = null;
	let adLoading = false;
	const defaultLevel = {
		id: 0,
		levelId: 0,
		name: $_('battlepass.no_daily_level'),
		difficulty: '',
		progress: 0,
		completed: false,
		claimed: false,
		xp: 0
	};

	$: dailyLevel = dailyWeeklyData.daily
		? {
				id: dailyWeeklyData.daily.id,
				levelId: dailyWeeklyData.daily.levelID,
				name: dailyWeeklyData.daily.levels?.name,
				difficulty: dailyWeeklyData.daily.levels?.difficulty,
				progress: dailyWeeklyData.daily.progress,
				completed: dailyWeeklyData.daily.progress >= 100,
				claimed: dailyWeeklyData.daily.completionClaimed,
				xp: dailyWeeklyData.daily.xp
			}
		: defaultLevel;

	$: weeklyDemon = dailyWeeklyData.weekly
		? {
				id: dailyWeeklyData.weekly.id,
				levelId: dailyWeeklyData.weekly.levelID,
				name: dailyWeeklyData.weekly.levels?.name,
				difficulty: dailyWeeklyData.weekly.levels?.difficulty,
				progress: dailyWeeklyData.weekly.progress,
				completed: dailyWeeklyData.weekly.progress >= 100,
				claimed: dailyWeeklyData.weekly.completionClaimed,
				xp: dailyWeeklyData.weekly.xp
			}
		: defaultLevel;

	const dispatch = createEventDispatcher<{
		xpClaimed: { xp: number; levelId: number };
	}>();

	function getDifficultyColor(difficulty: string): string {
		return DIFFICULTY_COLORS[difficulty?.toLowerCase()] || '#6b7280';
	}

	function getDifficultyName(difficulty: string): string {
		return DIFFICULTY_NAMES[difficulty?.toLowerCase()] || difficulty || 'Unknown';
	}

	async function fetchDailyWeeklyProgress() {
		try {
			const headers: Record<string, string> = {};
			if ($user.loggedIn) {
				headers['Authorization'] = `Bearer ${await $user.token()}`;
			}

			const res = await fetch(`${import.meta.env.VITE_API_URL}/battlepass/daily-weekly`, {
				headers
			});

			if (res.ok) {
				dailyWeeklyData = await res.json();
			}
		} catch (e) {
			console.error('Failed to fetch daily/weekly progress:', e);
		}
	}

	async function claimDailyWeeklyReward(levelId: number) {
		if (!$user.loggedIn) return;

		try {
			const res = await fetch(
				`${import.meta.env.VITE_API_URL}/battlepass/level/${levelId}/claim/completion`,
				{
					method: 'POST',
					headers: {
						Authorization: `Bearer ${await $user.token()}`
					}
				}
			);

			if (res.ok) {
				const result = await res.json();
				toast.success($_('battlepass.xp_claimed', { values: { xp: result.xp } }));
				await fetchDailyWeeklyProgress();
				dispatch('xpClaimed', { xp: result.xp, levelId });
			} else {
				const errorData = await res.json();
				toast.error(errorData.message || $_('battlepass.claim_failed'));
			}
		} catch (e) {
			toast.error($_('battlepass.claim_failed'));
		}
	}

	async function fetchCheckinStatus() {
		if (!$user.loggedIn) return;
		try {
			const res = await fetch(`${import.meta.env.VITE_API_URL}/ads/rewards/daily-checkin`, {
				headers: { Authorization: `Bearer ${await $user.token()}` }
			});
			if (res.ok) checkinStatus = await res.json();
		} catch (e) {
			console.error('Failed to fetch checkin status:', e);
		}
	}

	function watchRewardedAd() {
		if (adLoading || checkinStatus?.claimed) return;
		adLoading = true;

		const googletag = (window as any).googletag;
		if (!googletag) {
			adLoading = false;
			toast.error('Ads not available');
			return;
		}

		googletag.cmd.push(() => {
			// ✅ Destroy the static slot first to avoid duplicate unit conflict with SRA
			const existingSlots = googletag.pubads().getSlots();
			const staticSlot = existingSlots.find(
				(s: any) => s.getAdUnitPath() === '/23344439882/pass-daily-checkin'
			);
			if (staticSlot) googletag.destroySlots([staticSlot]);

			const slot = googletag.defineOutOfPageSlot(
				'/23344439882/pass-daily-checkin',
				googletag.enums.OutOfPageFormat.REWARDED
			);

			if (!slot) {
				// @ts-ignore
				restoreStaticSlot();
				adLoading = false;
				toast.error('Rewarded ad not supported or blocked');
				return;
			}

			slot.addService(googletag.pubads());
			slot.setTargeting('user_id', $user.data?.uid);

			// ✅ Restores the original static 1x1 slot from <head> after rewarded ad is done
			const restoreStaticSlot = () => {
				googletag
					.defineSlot('/23344439882/pass-daily-checkin', [1, 1], 'div-gpt-ad-1773647417565-0')
					?.addService(googletag.pubads());
			};

			const cleanup = () => {
				googletag.pubads().removeEventListener('rewardedSlotReady', onReady);
				googletag.pubads().removeEventListener('rewardedSlotGranted', onGranted);
				googletag.pubads().removeEventListener('rewardedSlotClosed', onClosed);
			};

			const onReady = (e: any) => {
				e.makeRewardedVisible();
			};

			const onGranted = async () => {
				cleanup();
				googletag.destroySlots([slot]);
				restoreStaticSlot();
				const xp = checkinStatus?.xp ?? 25;
				checkinStatus = { claimed: true, xp };
				toast.success($_('battlepass.xp_claimed', { values: { xp } }));
				dispatch('xpClaimed', { xp, levelId: 0 });
				adLoading = false;
			};

			const onClosed = () => {
				cleanup();
				googletag.destroySlots([slot]);
				restoreStaticSlot();
				adLoading = false;
			};

			googletag.pubads().addEventListener('rewardedSlotReady', onReady);
			googletag.pubads().addEventListener('rewardedSlotGranted', onGranted);
			googletag.pubads().addEventListener('rewardedSlotClosed', onClosed);

			googletag.display(slot);
		});
	}

	async function loadData() {
		loading = true;
		await Promise.all([fetchDailyWeeklyProgress(), fetchCheckinStatus()]);
		loading = false;
	}

	onMount(() => {
		mounted = true;
		loadData();

		const unsubscribe = user.subscribe(async (value) => {
			if (!mounted) return;

			if (value.loggedIn) {
				await Promise.all([fetchDailyWeeklyProgress(), fetchCheckinStatus()]);
			} else {
				dailyWeeklyData = { daily: null, weekly: null };
				checkinStatus = null;
			}
		});

		return () => {
			mounted = false;
			unsubscribe();
		};
	});
</script>

<div class="mb-4 text-center">
	<h2 class="text-2xl font-bold">{$_('battlepass.daily_weekly')}</h2>
	<p class="text-muted-foreground">{$_('battlepass.daily_weekly_desc')}</p>
</div>

{#if loading}
	<div class="grid gap-6 md:grid-cols-2">
		<Skeleton class="h-64 w-full" />
		<Skeleton class="h-64 w-full" />
	</div>
	<Skeleton class="mt-6 h-32 w-full" />
{:else}
	<div class="grid gap-6 md:grid-cols-2">
		<!-- Daily Level Card -->
		<Card.Root
			class="overflow-hidden border-2 border-blue-500/30 bg-gradient-to-br from-blue-500/5 to-cyan-500/5"
		>
			<Card.Header>
				<div class="flex items-center gap-3">
					<div
						class="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500"
					>
						<Sun class="h-7 w-7 text-white" />
					</div>
					<div>
						<Card.Title class="text-xl">{$_('battlepass.daily_level')}</Card.Title>
						<p class="text-sm text-muted-foreground">{$_('battlepass.resets_daily')}</p>
					</div>
				</div>
			</Card.Header>
			<Card.Content>
				{#if dailyLevel.id === 0}
					<div
						class="flex flex-col items-center justify-center py-8 text-center text-muted-foreground"
					>
						<Sun class="mb-2 h-12 w-12 opacity-50" />
						<p>{$_('battlepass.no_daily_level')}</p>
					</div>
				{:else}
					<div class="flex flex-col gap-4">
						<div class="rounded-lg bg-muted/30 p-4">
							<div class="mb-2 flex items-center justify-between">
								<span class="font-medium">{dailyLevel.name}</span>
								<span class="text-sm text-muted-foreground">ID: {dailyLevel.levelId}</span>
							</div>
							<div
								class="flex items-center gap-2 text-sm"
								style="color: {getDifficultyColor(dailyLevel.difficulty)};"
							>
								<div
									class="h-3 w-3 rounded-full"
									style="background-color: {getDifficultyColor(dailyLevel.difficulty)};"
								></div>
								<span>{getDifficultyName(dailyLevel.difficulty)}</span>
							</div>
						</div>

						<div class="flex flex-col gap-2">
							<div class="flex justify-between text-sm">
								<span class="text-muted-foreground">{$_('battlepass.progress')}</span>
								<span>{dailyLevel.xp} XP</span>
							</div>
							<div class="h-3 overflow-hidden rounded-full bg-muted">
								<div
									class="h-full rounded-full bg-gradient-to-r from-blue-400 to-cyan-400 transition-all"
									style="width: {dailyLevel.progress}%"
								/>
							</div>
						</div>

						<!-- Completion Reward -->
						<div class="flex items-center justify-between rounded-lg bg-muted/20 p-3">
							<div class="flex flex-col">
								<span class="text-sm text-muted-foreground"
									>{$_('battlepass.completion_reward')}</span
								>
								<div class="flex items-center gap-1">
									<Zap class="h-4 w-4" style="color: {primaryColor}" />
									<span class="font-bold" style="color: {primaryColor}">+{dailyLevel.xp} XP</span>
								</div>
							</div>
							{#if $user.loggedIn}
								{#if dailyLevel.claimed}
									<Button variant="outline" disabled size="sm">
										<Check class="mr-1 h-4 w-4" />
										{$_('battlepass.claimed')}
									</Button>
								{:else if dailyLevel.completed}
									<Button
										size="sm"
										class="bg-green-500 hover:bg-green-600"
										on:click={() => claimDailyWeeklyReward(dailyLevel.id)}
									>
										{$_('battlepass.claim')}
									</Button>
								{:else}
									<Button variant="outline" disabled size="sm">
										<Lock class="mr-1 h-4 w-4" />
										{dailyLevel.progress}/100%
									</Button>
								{/if}
							{/if}
						</div>
					</div>
				{/if}
			</Card.Content>
		</Card.Root>

		<!-- Weekly Demon Card -->
		<Card.Root
			class="overflow-hidden border-2 border-purple-500/30 bg-gradient-to-br from-purple-500/5 to-pink-500/5"
		>
			<Card.Header>
				<div class="flex items-center gap-3">
					<div
						class="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-pink-500"
					>
						<Calendar class="h-7 w-7 text-white" />
					</div>
					<div>
						<Card.Title class="text-xl">{$_('battlepass.weekly_demon')}</Card.Title>
						<p class="text-sm text-muted-foreground">{$_('battlepass.resets_weekly')}</p>
					</div>
				</div>
			</Card.Header>
			<Card.Content>
				{#if weeklyDemon.id === 0}
					<div
						class="flex flex-col items-center justify-center py-8 text-center text-muted-foreground"
					>
						<Calendar class="mb-2 h-12 w-12 opacity-50" />
						<p>{$_('battlepass.no_weekly_level')}</p>
					</div>
				{:else}
					<div class="flex flex-col gap-4">
						<div class="rounded-lg bg-muted/30 p-4">
							<div class="mb-2 flex items-center justify-between">
								<span class="font-medium">{weeklyDemon.name}</span>
								<span class="text-sm text-muted-foreground">ID: {weeklyDemon.levelId}</span>
							</div>
							<div
								class="flex items-center gap-2 text-sm"
								style="color: {getDifficultyColor(weeklyDemon.difficulty)};"
							>
								<div
									class="h-3 w-3 rounded-full"
									style="background-color: {getDifficultyColor(weeklyDemon.difficulty)};"
								></div>
								<span>{getDifficultyName(weeklyDemon.difficulty)}</span>
							</div>
						</div>

						<div class="flex flex-col gap-2">
							<div class="flex justify-between text-sm">
								<span class="text-muted-foreground">{$_('battlepass.progress')}</span>
								<span>{weeklyDemon.xp} XP</span>
							</div>
							<div class="h-3 overflow-hidden rounded-full bg-muted">
								<div
									class="h-full rounded-full bg-gradient-to-r from-purple-400 to-pink-400 transition-all"
									style="width: {weeklyDemon.progress}%"
								/>
							</div>
						</div>

						<!-- Completion Reward -->
						<div class="flex items-center justify-between rounded-lg bg-muted/20 p-3">
							<div class="flex flex-col">
								<span class="text-sm text-muted-foreground"
									>{$_('battlepass.completion_reward')}</span
								>
								<div class="flex items-center gap-1">
									<Zap class="h-4 w-4" style="color: {primaryColor}" />
									<span class="font-bold" style="color: {primaryColor}">+{weeklyDemon.xp} XP</span>
								</div>
							</div>
							{#if $user.loggedIn}
								{#if weeklyDemon.claimed}
									<Button variant="outline" disabled size="sm">
										<Check class="mr-1 h-4 w-4" />
										{$_('battlepass.claimed')}
									</Button>
								{:else if weeklyDemon.completed}
									<Button
										size="sm"
										class="bg-green-500 hover:bg-green-600"
										on:click={() => claimDailyWeeklyReward(weeklyDemon.id)}
									>
										{$_('battlepass.claim')}
									</Button>
								{:else}
									<Button variant="outline" disabled size="sm">
										<Lock class="mr-1 h-4 w-4" />
										{weeklyDemon.progress}/100%
									</Button>
								{/if}
							{/if}
						</div>
					</div>
				{/if}
			</Card.Content>
		</Card.Root>
	</div>

	<!-- Daily Check-in via Ad -->
	{#if $user.loggedIn}
		<Card.Root
			class="mt-6 overflow-hidden border-2 border-yellow-500/30 bg-gradient-to-br from-yellow-500/5 to-orange-500/5"
		>
			<Card.Header>
				<div class="flex items-center gap-3">
					<div
						class="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-yellow-500 to-orange-500"
					>
						<Gift class="h-7 w-7 text-white" />
					</div>
					<div>
						<Card.Title class="text-xl">{$_('battlepass.daily_checkin')}</Card.Title>
						<p class="text-sm text-muted-foreground">{$_('battlepass.daily_checkin_desc')}</p>
					</div>
				</div>
			</Card.Header>
			<Card.Content>
				<div class="flex items-center justify-between rounded-lg bg-muted/20 p-3">
					<div class="flex flex-col">
						<span class="text-sm text-muted-foreground">{$_('battlepass.completion_reward')}</span>
						<div class="flex items-center gap-1">
							<Zap class="h-4 w-4" style="color: {primaryColor}" />
							<span class="font-bold" style="color: {primaryColor}">
								+{checkinStatus?.xp ?? 20} XP
							</span>
						</div>
					</div>
					{#if checkinStatus?.claimed}
						<Button variant="outline" disabled size="sm">
							<Check class="mr-1 h-4 w-4" />
							{$_('battlepass.claimed')}
						</Button>
					{:else}
						<Button
							size="sm"
							class="bg-yellow-500 text-white hover:bg-yellow-600"
							disabled={adLoading}
							on:click={watchRewardedAd}
						>
							<Tv class="mr-1 h-4 w-4" />
							{adLoading ? $_('battlepass.loading') : $_('battlepass.watch_ad')}
						</Button>
					{/if}
				</div>
			</Card.Content>
		</Card.Root>
	{/if}
{/if}
