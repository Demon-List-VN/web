<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { user } from '$lib/client';
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Skeleton } from '$lib/components/ui/skeleton/index.js';
	import Target from 'lucide-svelte/icons/target';
	import Sparkles from 'lucide-svelte/icons/sparkles';
	import Check from 'lucide-svelte/icons/check';
	import Lock from 'lucide-svelte/icons/lock';
	import RefreshCw from 'lucide-svelte/icons/refresh-cw';

	export let primaryColor: string = '#8b5cf6';
	export let seasonId: number | null = null;

	let missions: any[] = [];
	let missionStatus: Record<number, { completed: boolean; claimed: boolean }> = {};
	let loading = true;
	let mounted = false;
	let lastSeasonId: number | null = null;

	async function fetchMissions() {
		if (!seasonId) return;

		try {
			const res = await fetch(`${import.meta.env.VITE_API_URL}/battlepass/season/${seasonId}/missions`);
			if (res.ok) {
				missions = await res.json();
			}
		} catch (e) {
			console.error('Failed to fetch missions:', e);
		}
	}

	async function fetchMissionStatus() {
		if (!$user.loggedIn) return;

		try {
			const res = await fetch(`${import.meta.env.VITE_API_URL}/battlepass/missions`, {
				headers: {
					Authorization: `Bearer ${await $user.token()}`
				}
			});

			if (res.ok) {
				const statusData = await res.json();
				statusData.forEach((m: any) => {
					missionStatus[m.id] = { completed: m.completed, claimed: m.claimed };
				});
				missionStatus = missionStatus; // Trigger reactivity
			}
		} catch (e) {
			console.error('Failed to fetch mission status:', e);
		}
	}

	async function claimMission(missionId: number) {
		try {
			const res = await fetch(
				`${import.meta.env.VITE_API_URL}/battlepass/mission/${missionId}/claim`,
				{
					method: 'POST',
					headers: {
						Authorization: `Bearer ${await $user.token()}`
					}
				}
			);

			if (res.ok) {
				toast.success($_('battlepass.mission_claimed'));
				missionStatus[missionId] = { ...missionStatus[missionId], claimed: true };
				missionStatus = missionStatus; // Trigger reactivity
			} else {
				const error = await res.text();
				toast.error(error || $_('battlepass.claim_failed'));
			}
		} catch (e) {
			toast.error($_('battlepass.claim_failed'));
		}
	}

	async function loadData() {
		loading = true;
		await fetchMissions();
		if ($user.loggedIn) {
			await fetchMissionStatus();
		}
		loading = false;
	}

	onMount(() => {
		mounted = true;
		lastSeasonId = seasonId;
		loadData();

		const unsubscribe = user.subscribe(async (value) => {
			if (!mounted) return;

			if (value.loggedIn && missions.length > 0) {
				await fetchMissionStatus();
			} else if (!value.loggedIn) {
				missionStatus = {};
			}
		});

		return () => {
			mounted = false;
			unsubscribe();
		};
	});

	$: if (mounted && seasonId && seasonId !== lastSeasonId) {
		lastSeasonId = seasonId;
		loadData();
	}
</script>

<div class="mb-4 text-center">
	<h2 class="text-2xl font-bold">{$_('battlepass.missions')}</h2>
	<p class="text-muted-foreground">{$_('battlepass.missions_desc')}</p>
</div>

{#if loading}
	<div class="flex flex-col gap-4">
		<Skeleton class="h-24 w-full" />
		<Skeleton class="h-24 w-full" />
		<Skeleton class="h-24 w-full" />
	</div>
{:else}
	<div class="flex flex-col gap-4">
		{#each missions as mission}
			{@const status = missionStatus[mission.id]}
			{@const isCompleted = status?.completed ?? mission.completed}
			{@const isClaimed = status?.claimed ?? mission.claimed}

			<Card.Root
				class="overflow-hidden border-2 transition-all {isCompleted && !isClaimed
					? 'border-green-500/50 bg-green-500/5'
					: isClaimed
						? 'border-muted opacity-60'
						: 'border-muted'}"
			>
				<Card.Content class="flex items-center gap-4 p-4">
					<div
						class="flex h-14 w-14 items-center justify-center rounded-xl {isCompleted
							? 'bg-green-500/20'
							: 'bg-muted'}"
					>
						{#if isClaimed}
							<Check class="h-7 w-7 text-green-400" />
						{:else if isCompleted}
							<Sparkles class="h-7 w-7 text-green-400" />
						{:else}
							<Target class="h-7 w-7 text-muted-foreground" />
						{/if}
					</div>
					<div class="flex-1">
						<div class="flex items-center gap-2">
							<h4 class="font-bold {isClaimed ? 'line-through' : ''}">{mission.title}</h4>
							{#if mission.refreshType && mission.refreshType !== 'none'}
								<span class="flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium {mission.refreshType === 'daily' ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'}">
									<RefreshCw class="h-3 w-3" />
									{mission.refreshType === 'daily' ? $_('battlepass.daily') : $_('battlepass.weekly')}
								</span>
							{/if}
						</div>
						<p class="text-sm text-muted-foreground">{mission.description}</p>
					</div>
					<div class="flex items-center gap-4">
						<div class="text-right">
							<span class="font-bold" style="color: {primaryColor}">+{mission.xp} XP</span>
							{#if mission.battlePassMissionRewards?.length}
								<div class="mt-1 flex justify-end gap-1">
									{#each mission.battlePassMissionRewards.slice(0, 3) as reward}
										<div class="h-6 w-6 rounded bg-muted">
											{#if reward.itemId}
												<img
													class="h-full w-full object-contain"
													src={`https://cdn.demonlistvn.com/items/${reward.itemId}.webp`}
													alt="Reward"
												/>
											{/if}
										</div>
									{/each}
								</div>
							{/if}
						</div>
						{#if $user.loggedIn}
							{#if isClaimed}
								<Button variant="outline" disabled class="w-24">
									<Check class="mr-1 h-4 w-4" />
									{$_('battlepass.claimed')}
								</Button>
							{:else if isCompleted}
								<Button
									class="w-24 bg-green-500 hover:bg-green-600"
									on:click={() => claimMission(mission.id)}
								>
									{$_('battlepass.claim')}
								</Button>
							{:else}
								<Button variant="outline" disabled class="w-24">
									<Lock class="mr-1 h-4 w-4" />
									{$_('battlepass.locked')}
								</Button>
							{/if}
						{/if}
					</div>
				</Card.Content>
			</Card.Root>
		{:else}
			<div class="flex flex-col items-center gap-2 py-12 text-muted-foreground">
				<Target class="h-12 w-12" />
				<p>{$_('battlepass.no_missions')}</p>
			</div>
		{/each}
	</div>
{/if}
