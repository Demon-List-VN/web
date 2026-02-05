<script lang="ts">
	import Plus from 'lucide-svelte/icons/plus';
	import { MAX_TIER } from '$lib/battlepass/constants';
	import RewardButton from '$lib/components/RewardButton.svelte';

	export let rewards: any[] = [];
	export let currentTier: number = 0;
	export let isPremium: boolean = false;
	export let claimableRewards: any[] = [];
	export let editable: boolean = false;
	export let onRewardClick: ((reward: any) => void) | null = null;
	export let onAddRewardClick: ((tier: number, isPremium: boolean) => void) | null = null;
	export let onClaimReward: ((rewardId: number) => void) | null = null;
	export let claimingRewardIds: Set<number> = new Set();

	function getTierRewards(tier: number, allRewards: any[]) {
		return allRewards.filter((r: any) => r.tier === tier);
	}

	function getFreeRewards(tierRewards: any[]) {
		return tierRewards.filter((r: any) => !r.isPremium);
	}

	function getPremiumRewards(tierRewards: any[]) {
		return tierRewards.filter((r: any) => r.isPremium);
	}

	function isTierUnlocked(tier: number) {
		return currentTier >= tier;
	}

	function isRewardClaimable(reward: any) {
		return reward && claimableRewards.some((r) => r.id === reward.id);
	}

	function isRewardClaimed(reward: any) {
		if (!reward) return false;
		if (reward.tier > currentTier) return false;
		if (reward.isPremium && !isPremium) return false;
		return !isRewardClaimable(reward);
	}

	function isRewardClaiming(reward: any) {
		return reward && claimingRewardIds?.has?.(reward.id);
	}

	function getMaxTierWithRewards(allRewards: any[]) {
		if (!allRewards || allRewards.length === 0) return 1;
		const maxTier = allRewards.reduce((max, reward) => {
			const tier = typeof reward?.tier === 'number' ? reward.tier : 0;
			return tier > max ? tier : max;
		}, 0);
		return Math.min(Math.max(1, maxTier), MAX_TIER);
	}

	$: maxTierToShow = editable 
		? Math.min(getMaxTierWithRewards(rewards) + 1, MAX_TIER)
		: getMaxTierWithRewards(rewards);
</script>

<div class="tier-track-container overflow-x-auto pb-4">
	<div class="flex flex-col gap-2 px-4" style="min-width: max-content;">
		<!-- Premium Rewards Row -->
		<div class="flex gap-4">
			{#each Array(maxTierToShow) as _, i}
				{@const tier = i + 1}
				{@const tierRewards = getTierRewards(tier, rewards)}
				{@const premiumRewards = getPremiumRewards(tierRewards)}
				{@const isUnlocked = isTierUnlocked(tier)}
				<div class="flex w-20 flex-col items-center gap-1">
					{#each premiumRewards as premiumReward}
						<RewardButton
							reward={premiumReward}
							isPremiumActivated={isPremium}
							isPremiumTrack={true}
							isClaimable={isRewardClaimable(premiumReward)}
							isClaimed={isRewardClaimed(premiumReward)}
							isClaiming={isRewardClaiming(premiumReward)}
							{editable}
							onRewardClick={() => onRewardClick?.(premiumReward)}
							onClaimReward={() => onClaimReward?.(premiumReward.id)}
						/>
					{/each}
					{#if editable && onAddRewardClick}
						<!-- Add Premium Reward Button -->
						<button
							class="reward-slot relative flex h-20 w-20 items-center justify-center rounded-xl border-2 border-yellow-500-30 bg-yellow-500-5 transition-all hover:scale-105 hover:bg-yellow-500-10"
							on:click={() => onAddRewardClick?.(tier, true)}
						>
							<Plus class="h-8 w-8 text-yellow-500/50" />
						</button>
					{/if}
				</div>
			{/each}
		</div>

		<!-- Tier Numbers Row -->
		<div class="flex gap-4">
			{#each Array(maxTierToShow) as _, i}
				{@const tier = i + 1}
				{@const isUnlocked = isTierUnlocked(tier)}
				<div class="flex w-20 items-center justify-center">
					<div
						class="tier-number flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold transition-all {isUnlocked
							? 'bg-gradient-to-br from-yellow-400 to-orange-500 text-black'
							: 'bg-muted text-muted-foreground'}"
					>
						{tier}
					</div>
				</div>
			{/each}
		</div>

		<!-- Free Rewards Row -->
		<div class="flex gap-4">
			{#each Array(maxTierToShow) as _, i}
				{@const tier = i + 1}
				{@const tierRewards = getTierRewards(tier, rewards)}
				{@const freeRewards = getFreeRewards(tierRewards)}
				{@const isUnlocked = isTierUnlocked(tier)}
				<div class="flex w-20 flex-col items-center gap-1">
					{#each freeRewards as freeReward}
						<RewardButton
							reward={freeReward}
							isPremiumActivated={true}
							isPremiumTrack={false}
							isClaimable={isRewardClaimable(freeReward)}
							isClaimed={isRewardClaimed(freeReward)}
							isClaiming={isRewardClaiming(freeReward)}
							{editable}
							onRewardClick={() => onRewardClick?.(freeReward)}
							onClaimReward={() => onClaimReward?.(freeReward.id)}
						/>
					{/each}
					{#if editable && onAddRewardClick}
						<!-- Add Free Reward Button -->
						<button
							class="reward-slot relative flex h-20 w-20 items-center justify-center rounded-xl border-2 border-muted bg-muted/30 transition-all hover:scale-105 hover:bg-muted/50"
							on:click={() => onAddRewardClick?.(tier, false)}
						>
							<Plus class="h-8 w-8 text-muted-foreground/50" />
						</button>
					{/if}
				</div>
			{/each}
		</div>
	</div>
</div>

<style lang="scss">
	.tier-track-container {
		scrollbar-width: thin;
		scrollbar-color: hsl(var(--muted)) transparent;
	}

	.tier-track-container::-webkit-scrollbar {
		height: 8px;
	}

	.tier-track-container::-webkit-scrollbar-track {
		background: transparent;
	}

	.tier-track-container::-webkit-scrollbar-thumb {
		background-color: hsl(var(--muted));
		border-radius: 4px;
	}
</style>
