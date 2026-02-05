<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { user } from '$lib/client';
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card/index.js';
	/* Removed dialog import; detail moved to dedicated page */
	import { Skeleton } from '$lib/components/ui/skeleton/index.js';
	import Map from 'lucide-svelte/icons/map';
	import Lock from 'lucide-svelte/icons/lock';
	import Check from 'lucide-svelte/icons/check';
	import { DIFFICULTY_COLORS, DIFFICULTY_NAMES } from '$lib/battlepass/constants';

	export let primaryColor: string = '#8b5cf6';

	let mapPacks: any[] = [];
	let loading = true;
	let mounted = false;

	// Generate CSS variable strings
	$: cssVars = (() => {
		const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(primaryColor);
		if (!result) return '';
		const rgb = {
			r: parseInt(result[1], 16),
			g: parseInt(result[2], 16),
			b: parseInt(result[3], 16)
		};
		return `--primary-color: ${rgb.r}, ${rgb.g}, ${rgb.b};`;
	})();

		// Navigate to dedicated map pack page
		function openMapPackPage(pack: any) {
			const id = pack?.id;
			if (!id) return;
			window.location.href = `/battlepass/mappacks/${id}`;
		}

	function getDifficultyColor(difficulty: string): string {
		return DIFFICULTY_COLORS[difficulty?.toLowerCase()] || '#6b7280';
	}

	function getDifficultyName(difficulty: string): string {
		return DIFFICULTY_NAMES[difficulty?.toLowerCase()] || difficulty || 'Unknown';
	}

	function getMapPackLevelProgress(battlePassMapPackId: number, levelID: number): number {
		return 0;
	}

	function isLevelCompleted(battlePassMapPackId: number, levelID: number): boolean {
		return false;
	}

	function isMapPackCompleted(pack: any): boolean {
		return (pack.progress?.progress ?? 0) >= 1;
	}

	function isMapPackClaimed(pack: any): boolean {
		return pack.progress?.claimed ?? false;
	}

	function getMapPackCompletionPercent(pack: any): number {
		return Math.round((pack.progress?.progress ?? 0));
	}

	async function fetchMapPacks() {
		try {
            const token = $user.loggedIn ? await $user.token() : null;
            const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};

			const res = await fetch(`${import.meta.env.VITE_API_URL}/battlepass/mappacks`, { headers });
			if (res.ok) {
				mapPacks = await res.json();
			}
		} catch (e) {
			console.error('Failed to fetch map packs:', e);
		}
	}

	async function claimMapPack(mapPackId: number) {
		try {
			const res = await fetch(
				`${import.meta.env.VITE_API_URL}/battlepass/mappack/${mapPackId}/claim`,
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
				await fetchMapPacks();
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
		await fetchMapPacks();
		loading = false;
	}

	onMount(() => {
		mounted = true;
		loadData();

		const unsubscribe = user.subscribe(async (value) => {
			if (!mounted) return;

			// Reload when login state changes to get/clear progress
            // Always fetch map packs to get updated progress data
            await fetchMapPacks();
		});

		return () => {
			mounted = false;
			unsubscribe();
		};
	});
</script>

<div class="mb-4 text-center">
	<h2 class="text-2xl font-bold">{$_('battlepass.map_packs')}</h2>
	<p class="text-muted-foreground">{$_('battlepass.map_packs_desc')}</p>
</div>

{#if loading}
	<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
		<Skeleton class="h-48 w-full" />
		<Skeleton class="h-48 w-full" />
		<Skeleton class="h-48 w-full" />
	</div>
{:else}
	<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
		{#each mapPacks as pack}
			{@const mapPack = pack.mapPacks}
			{@const completionPercent = getMapPackCompletionPercent(pack)}
			<button class="text-left" on:click={() => openMapPackPage(pack)}>
				<Card.Root
					class="h-full cursor-pointer overflow-hidden border-2 transition-all hover:border-primary/50"
					style="border-color: {getDifficultyColor(mapPack?.difficulty)}40;"
				>
					<Card.Header class="pb-2">
						<div class="flex items-center justify-between">
							<div class="flex items-center gap-3">
								<div
									class="flex h-12 w-12 items-center justify-center rounded-lg"
									style="background-color: {getDifficultyColor(mapPack?.difficulty)}20;"
								>
									<Map
										class="h-6 w-6"
										style="color: {getDifficultyColor(mapPack?.difficulty)};"
									/>
								</div>
								<div>
									<Card.Title class="text-lg">{mapPack?.name || 'Map Pack'}</Card.Title>
									<p
										class="text-sm"
										style="color: {getDifficultyColor(mapPack?.difficulty)};"
									>
										{getDifficultyName(mapPack?.difficulty)}
									</p>
								</div>
							</div>
							<div
								class="rounded-full px-3 py-1 text-sm font-bold"
								style="background-color: rgba(var(--primary-color), 0.2); color: {primaryColor}"
							>
								+{mapPack?.xp || 0} XP
							</div>
						</div>
					</Card.Header>
					<Card.Content>
						{#if mapPack?.description}
							<p class="mb-3 text-sm text-muted-foreground">{mapPack.description}</p>
						{/if}
						
						<!-- Map Pack Progress Bar -->
						{#if $user.loggedIn}
							<div class="mb-3 flex flex-col gap-2">
								<div class="flex justify-between text-sm">
									<span class="text-muted-foreground">{$_('battlepass.progress')}</span>
									<span class="font-medium">{completionPercent}%</span>
								</div>
								<div class="h-2 overflow-hidden rounded-full bg-muted">
									<div
										class="h-full rounded-full transition-all"
										style="width: {completionPercent}%; background-color: {getDifficultyColor(mapPack?.difficulty)};"
									/>
								</div>
							</div>
						{/if}

						<div class="flex items-center justify-between">
							<span class="text-sm text-muted-foreground">
								{mapPack?.mapPackLevels?.length || 0}
								{$_('battlepass.levels_in_pack')}
							</span>
							{#if pack.unlockWeek > 1}
								<div class="flex items-center gap-2 text-sm text-muted-foreground">
									<Lock class="h-4 w-4" />
									<span
										>{$_('battlepass.unlocks_week', {
											values: { week: pack.unlockWeek }
										})}</span
									>
								</div>
							{/if}
						</div>
					</Card.Content>
				</Card.Root>
			</button>
		{:else}
			<div class="col-span-full flex flex-col items-center gap-2 py-12 text-muted-foreground">
				<Map class="h-12 w-12" />
				<p>{$_('battlepass.no_map_packs')}</p>
			</div>
		{/each}
	</div>
{/if}

<!-- Map Pack detail moved to dedicated page at /battlepass/mappacks/[id] -->
