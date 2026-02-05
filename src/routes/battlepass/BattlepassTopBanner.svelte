<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Skeleton } from '$lib/components/ui/skeleton/index.js';
	import { user } from '$lib/client';
	import { onMount } from 'svelte';
	import { _ } from 'svelte-i18n';
	import Crown from 'lucide-svelte/icons/crown';
	import Gift from 'lucide-svelte/icons/gift';
	import Lock from 'lucide-svelte/icons/lock';
	import Zap from 'lucide-svelte/icons/zap';
	import { XP_PER_TIER, MAX_TIER, PREMIUM_PRICE } from '$lib/battlepass/constants';
	import { Clock } from 'lucide-svelte';

	export let season: any;
	export let primaryColor = '#8b5cf6';
	export let purchaseDialogOpen = false; // bindable from parent

	let loading = true;
	let progress: any = null;
	let claimableRewards: any[] = [];
	let mounted = false;

	// Helper function to convert hex to RGB
	function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
		const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
		return result
			? {
					r: parseInt(result[1], 16),
					g: parseInt(result[2], 16),
					b: parseInt(result[3], 16)
				}
			: null;
	}

	// Generate CSS variable strings
	$: cssVars = (() => {
		const rgb = hexToRgb(primaryColor);
		if (!rgb) return '';
		return `--primary-color: ${rgb.r}, ${rgb.g}, ${rgb.b};`;
	})();

	$: currentTier = progress ? Math.min(Math.floor(progress.xp / XP_PER_TIER), MAX_TIER) : 0;
	$: tierProgress = progress ? progress.xp % XP_PER_TIER : 0;
	$: isPremium = progress?.isPremium ?? false;
	$: daysRemaining = season
		? Math.max(0, Math.ceil((new Date(season.end).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
		: 0;

	function formatCurrency(amount: number): string {
		return new Intl.NumberFormat('vi-VN', {
			style: 'currency',
			currency: 'VND'
		}).format(amount);
	}

	async function fetchProgress() {
		if (!$user.loggedIn || !season) return;

		try {
			const res = await fetch(`${import.meta.env.VITE_API_URL}/battlepass/progress`, {
				headers: {
					Authorization: `Bearer ${await $user.token()}`
				}
			});

			if (res.ok) {
				progress = await res.json();
			}
		} catch (e) {
			console.error('Failed to fetch progress:', e);
		}
	}

	async function loadData() {
		loading = true;
		if ($user.loggedIn) {
			fetchProgress();
		}
		loading = false;
	}

	onMount(() => {
		mounted = true;
		loadData();

		const unsubscribe = user.subscribe(async (value) => {
			if (!mounted) return;

			if (value.loggedIn) {
				fetchProgress();
			} else {
				progress = null;
				claimableRewards = [];
			}
		});

		return () => {
			mounted = false;
			unsubscribe();
		};
	});
</script>

<div class="hero-section relative overflow-hidden" style={cssVars}>
	<div class="hero-bg-image absolute inset-0">
		<img
			src={season?.backgroundUrl || `https://cdn.demonlistvn.com/battlepasses/${season?.id}.webp`}
			alt="Season Background"
			class="h-full w-full object-cover"
		/>
	</div>
	<div class="relative z-10 mx-auto flex w-full max-w-6xl flex-col items-center gap-6 px-4 py-12">
		<div class="flex items-center gap-3">
			<h1 class="title-shadow text-4xl font-bold md:text-5xl">{season?.title}</h1>
		</div>
		<!-- Season Timer -->
		<div class="flex items-center gap-2 rounded-full bg-muted/50 px-6 py-2 backdrop-blur-sm">
			<Clock size={18} />
			<span class="font-medium"
				>{$_('battlepass.days_remaining', { values: { count: daysRemaining } })}</span
			>
		</div>

		<!-- User Progress Card -->
		{#if $user.loggedIn}
			<Card.Root
				class="w-full max-w-[500px] overflow-hidden backdrop-blur-md"
				style="border: 2px solid rgba(var(--primary-color), 0.3); background: linear-gradient(to bottom right, rgba(var(--primary-color), 0.22), rgba(var(--primary-color), 0.12));"
			>
				<Card.Content class="p-6 text-white">
					{#if loading}
						<div class="flex flex-col gap-4">
							<Skeleton class="h-8 w-48" />
							<Skeleton class="h-4 w-full" />
							<Skeleton class="h-6 w-32" />
						</div>
					{:else}
						<div class="flex flex-col gap-4">
							<!-- Tier Display -->
							<div class="flex items-center justify-between">
								<div class="flex items-center gap-3">
									<div
										class="tier-badge flex h-16 w-16 items-center justify-center rounded-xl text-2xl font-bold text-white shadow-lg"
										style="background: linear-gradient(to bottom right, rgba(var(--primary-color), 1), rgba(var(--primary-color), 0.7));"
									>
										{currentTier}
									</div>
									<div>
										<h3 class="text-xl font-bold">{$_('battlepass.tier')} {currentTier}</h3>
										<p class="text-sm text-white">
											{progress?.xp ?? 0} XP {$_('battlepass.total')}
										</p>
									</div>
								</div>
								{#if isPremium}
									<div class="flex gap-[5px]">
										<div
											class="flex items-center gap-2 rounded-full px-4 py-2 text-white"
											style="background: linear-gradient(to right, rgba(var(--primary-color), 1), rgba(var(--primary-color), 0.8));"
										>
											<Crown class="h-5 w-5" />
											<span class="font-bold">PREMIUM</span>
										</div>
										<Button
											class="h-full rounded-full text-white"
											style="background: linear-gradient(to right, rgba(var(--primary-color), 1), rgba(var(--primary-color), 0.8));"
											on:click={() => (purchaseDialogOpen = true)}
										>
											<Gift />
										</Button>
									</div>
								{:else}
									<Button
										class="text-white"
										style="background: linear-gradient(to right, rgba(var(--primary-color), 1), rgba(var(--primary-color), 0.8));"
										on:click={() => (purchaseDialogOpen = true)}
									>
										<Crown class="mr-2 h-4 w-4" />
										{$_('battlepass.upgrade')} - {formatCurrency
											? formatCurrency(PREMIUM_PRICE)
											: PREMIUM_PRICE}
									</Button>
								{/if}
							</div>

							<!-- XP Progress Bar -->
							<div class="flex flex-col gap-2">
								<div class="flex justify-between text-sm">
									<span
										>{$_('battlepass.progress_to_tier', {
											values: { tier: Math.min(currentTier + 1, MAX_TIER) }
										})}</span
									>
									<span>{tierProgress} / {XP_PER_TIER} XP</span>
								</div>
								<div class="xp-bar-container h-4 overflow-hidden rounded-full bg-muted">
									<div
										class="xp-bar h-full rounded-full transition-all duration-500"
										style="width: {(tierProgress / XP_PER_TIER) *
											100}%; background: linear-gradient(to right, rgba(var(--primary-color), 1), rgba(var(--primary-color), 0.7));"
									/>
								</div>
							</div>

							<!-- Claimable Rewards -->
							{#if claimableRewards.length > 0}
								<div class="flex items-center gap-2 rounded-lg bg-green-500/20 p-3 text-white">
									<Gift class="h-5 w-5" />
									<span class="font-medium"
										>{$_('battlepass.rewards_ready', {
											values: { count: claimableRewards.length }
										})}</span
									>
								</div>
							{/if}
						</div>
					{/if}
				</Card.Content>
			</Card.Root>
		{:else}
			<Card.Root class="w-full max-w-2xl border-2 border-muted backdrop-blur-md">
				<Card.Content class="flex flex-col items-center gap-4 p-8">
					<Lock class="h-12 w-12 text-muted-foreground" />
					<h3 class="text-xl font-medium">{$_('battlepass.sign_in_to_track')}</h3>
					<p class="text-center text-muted-foreground">{$_('battlepass.sign_in_description')}</p>
				</Card.Content>
			</Card.Root>
		{/if}
	</div>
</div>

<style lang="scss">
	.hero-section {
		min-height: 400px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.tier-badge {
		animation: tier-glow 2s ease-in-out infinite alternate;
	}

	@keyframes tier-glow {
		from {
			box-shadow: 0 0 15px rgba(var(--primary-color), 0.3);
		}
		to {
			box-shadow: 0 0 25px rgba(var(--primary-color), 0.5);
		}
	}

	.xp-bar-container {
		box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.2);
	}
	.xp-bar {
		box-shadow: 0 0 10px rgba(var(--primary-color), 0.5);
	}

	/* Text shadow styles for title and description */
	.title-shadow {
		/* white glow + very subtle dark offset */
		text-shadow:
			0 8px 22px rgba(0, 0, 0, 0.42),
			0 2px 6px rgba(0, 0, 0, 0.08);
	}

	.desc-shadow {
		text-shadow:
			0 4px 12px rgba(0, 0, 0, 0.18),
			0 1px 3px rgba(0, 0, 0, 0.06);
	}
</style>
