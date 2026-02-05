<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { user } from '$lib/client';
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import TierRewardTrack from '$lib/components/TierRewardTrack.svelte';
	import { Skeleton } from '$lib/components/ui/skeleton/index.js';
	import { XP_PER_TIER, MAX_TIER } from '$lib/battlepass/constants';

	let rewards: any[] = [];
	let claimableRewards: any[] = [];
	let currentTier: number = 0;
	let isPremium: boolean = false;
	let loading = true;
	let claimingRewardIds = new Set<number>();

	async function fetchRewards() {
		try {
			const res = await fetch(`${import.meta.env.VITE_API_URL}/battlepass/rewards`);
			if (res.ok) {
				rewards = await res.json();
			}
		} catch (e) {
			console.error('Failed to fetch rewards:', e);
		}
	}

	async function fetchProgress(userInfo = $user) {
		if (!userInfo.loggedIn) return;

		try {
			const res = await fetch(`${import.meta.env.VITE_API_URL}/battlepass/progress`, {
				headers: {
					Authorization: `Bearer ${await userInfo.token()}`
				}
			});

			if (res.ok) {
				const progress = await res.json();
				currentTier = Math.min(Math.floor(progress.xp / XP_PER_TIER), MAX_TIER);
				isPremium = progress.isPremium ?? false;
			}
		} catch (e) {
			console.error('Failed to fetch progress:', e);
		}
	}

	async function fetchClaimableRewards(userInfo = $user) {
		if (!userInfo.loggedIn) return;

		try {
			const res = await fetch(`${import.meta.env.VITE_API_URL}/battlepass/rewards/claimable`, {
				headers: {
					Authorization: `Bearer ${await userInfo.token()}`
				}
			});

			if (res.ok) {
				claimableRewards = await res.json();
			}
		} catch (e) {
			console.error('Failed to fetch claimable rewards:', e);
		}
	}

	async function claimReward(rewardId: number) {
		if (claimingRewardIds.has(rewardId)) return;
		claimingRewardIds = new Set([...claimingRewardIds, rewardId]);

		try {
			const claimPromise = (async () => {
				const res = await fetch(
					`${import.meta.env.VITE_API_URL}/battlepass/reward/${rewardId}/claim`,
					{
						method: 'POST',
						headers: {
							Authorization: `Bearer ${await $user.token()}`
						}
					}
				);

				if (!res.ok) {
					const error = await res.text();
					throw new Error(error || $_('battlepass.claim_failed'));
				}

				claimableRewards = claimableRewards.filter((reward) => reward.id !== rewardId);
				await fetchClaimableRewards();
				await fetchProgress();
				return true;
			})();

			toast.promise(claimPromise, {
				loading: $_('battlepass.claiming'),
				success: $_('battlepass.reward_claimed'),
				error: (err: unknown) =>
					err instanceof Error ? err.message : $_('battlepass.claim_failed')
			});

			await claimPromise;
		} catch (e) {
			console.error('Failed to claim reward:', e);
		} finally {
			const next = new Set(claimingRewardIds);
			next.delete(rewardId);
			claimingRewardIds = next;
		}
	}

	onMount(async () => {
		user.subscribe(async (value) => {
			if (value.checked) {
				loading = true;
				await Promise.all([fetchRewards(), fetchProgress(), fetchClaimableRewards()]);
				loading = false;
			}
		});
	});
</script>

<div class="mb-4 text-center">
	<h2 class="text-2xl font-bold">{$_('battlepass.tier_rewards')}</h2>
	<p class="text-muted-foreground">{$_('battlepass.tier_rewards_desc')}</p>
</div>

{#if loading}
	<div class="flex flex-col gap-4">
		<Skeleton class="h-24 w-full" />
		<Skeleton class="h-24 w-full" />
	</div>
{:else}
	<TierRewardTrack
		{rewards}
		{currentTier}
		{isPremium}
		{claimableRewards}
		{claimingRewardIds}
		editable={false}
		onClaimReward={claimReward}
	/>
{/if}
