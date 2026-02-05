<script lang="ts">
	import Gift from 'lucide-svelte/icons/gift';
	import Lock from 'lucide-svelte/icons/lock';
	import Crown from 'lucide-svelte/icons/crown';
	import Check from 'lucide-svelte/icons/check';
	import * as Popover from '$lib/components/ui/popover/index.js';
	import RewardItemDetails from '$lib/components/RewardItemDetails.svelte';
	import { get } from 'svelte/store';
	import { _ } from 'svelte-i18n';

	export let reward: any;
	export let isPremiumActivated: boolean = false;
	export let isPremiumTrack: boolean = false;
	export let isClaimable: boolean = false;
	export let isClaimed: boolean = false;
	export let isClaiming: boolean = false;
	export let editable: boolean = false;
	export let onRewardClick: (() => void) | null = null;
	export let onClaimReward: (() => void) | null = null;

	let open = false;

	// Determine if item is locked due to premium requirement
	$: isPremiumLocked = isPremiumTrack && !isPremiumActivated;
	// Determine if item should have reduced opacity (tier not reached but accessible)
	$: shouldReduceOpacity = !isClaimable && !isPremiumLocked;

	$: itemData = reward?.items || reward;

	function rarityColor(r: number) {
		switch (r) {
			case 1:
				return '#3b82f6';
			case 2:
				return '#a855f7';
			case 3:
				return '#ec4899';
			case 4:
				return '#dc2626';
			default:
				return '#9ca3af';
		}
	}

	function hexToRgba(hex: string, alpha: number) {
		const normalized = hex.replace('#', '');
		const r = parseInt(normalized.slice(0, 2), 16);
		const g = parseInt(normalized.slice(2, 4), 16);
		const b = parseInt(normalized.slice(4, 6), 16);
		return `rgba(${r}, ${g}, ${b}, ${alpha})`;
	}

	$: borderColor = rarityColor(itemData?.rarity ?? 0);
	$: borderOpacity = !editable && (isPremiumLocked || shouldReduceOpacity) ? 0.3 : 1;
	$: borderColorRgba = hexToRgba(borderColor, borderOpacity);
	$: badgeBackground = hexToRgba(borderColor, 0.2);
</script>

{#if !editable}
	<Popover.Root bind:open>
		<Popover.Trigger asChild let:builder>
			<button
				{...builder}
				use:builder.action
				class="reward-slot relative flex h-20 w-20 items-center justify-center rounded-xl border-2 transition-all"
				style="border-color: {borderColorRgba}; background-color: {isPremiumTrack
					? 'rgb(234 179 8 / 0.1)'
					: 'transparent'}"
				class:reward-claimable={isClaimable && !isClaiming}
				disabled={isClaiming}
				on:click={async () => {
					if (!isClaiming && isClaimable && onClaimReward) {
						open = false;
						onClaimReward();
						isClaimed = true;
						isClaimable = false;
					}
				}}
			>
				{#if isPremiumLocked}
					<div class="absolute right-0.5 top-0.5 z-30">
						<Crown class="h-5 w-5 fill-yellow-400 text-yellow-400" />
					</div>
				{/if}
				{#if reward.quantity > 1}
					<span
						class="quantity-badge absolute bottom-0.5 right-0.5 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-xs font-bold"
						style="background-color: {badgeBackground}; color: {borderColor};"
					>
						{reward.quantity}
					</span>
				{/if}
				{#if isPremiumLocked}
					<div
						class="absolute inset-0 z-20 flex items-center justify-center rounded-xl bg-black/50"
					>
						<Lock class="h-6 w-6" color="white" />
					</div>
				{:else if isClaimed}
					<div
						class="absolute inset-0 z-20 flex items-center justify-center rounded-xl bg-black/50"
					>
						<Check class="h-6 w-6" color="white" />
					</div>
				{:else if !isClaimable}
					<div
						class="absolute inset-0 z-20 flex items-center justify-center rounded-xl bg-black/50"
					>
						<Lock class="h-6 w-6" color="white" />
					</div>
				{:else if isClaimable}
					<div
						class="absolute inset-0 left-1 top-1 z-20 h-fit w-fit items-center justify-center rounded-xl bg-green-500/50 p-1 pl-[4px]"
					>
						<Gift size={16} color="white" />
					</div>
				{/if}
				<div
					class="relative z-0 flex items-center justify-center p-2"
					class:opacity-50={shouldReduceOpacity}
				>
					{#if reward.items?.id || reward.itemId}
						<img
							class="h-12 w-12 object-contain"
							src={`https://cdn.demonlistvn.com/items/${reward.items?.id || reward.itemId}.webp`}
							alt={reward.description}
						/>
					{:else}
						<Gift class="h-8 w-8" />
					{/if}
				</div>
			</button>
		</Popover.Trigger>
		{#if itemData}
			<Popover.Content>
				<RewardItemDetails {itemData} quantity={reward.quantity} />
			</Popover.Content>
		{/if}
	</Popover.Root>
{:else}
	<button
		class="reward-slot relative flex h-20 w-20 items-center justify-center rounded-xl border-2 transition-all"
		style="border-color: {borderColorRgba}; background-color: {isPremiumTrack
			? 'rgb(234 179 8 / 0.1)'
			: 'transparent'}"
		on:click={() => {
			if (onRewardClick) {
				onRewardClick();
			}
		}}
	>
		{#if reward.quantity > 1}
			<span
				class="quantity-badge absolute bottom-0.5 right-0.5 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-xs font-bold"
				style="background-color: {badgeBackground}; color: {borderColor};"
			>
				{reward.quantity}
			</span>
		{/if}
		<div class="flex items-center justify-center p-2">
			{#if reward.items?.id || reward.itemId}
				<img
					class="h-12 w-12 object-contain"
					src={`https://cdn.demonlistvn.com/items/${reward.items?.id || reward.itemId}.webp`}
					alt={reward.description}
				/>
			{:else}
				<Gift class="h-8 w-8" />
			{/if}
		</div>
	</button>
{/if}

<style lang="scss">
	.reward-claimable {
		cursor: pointer;
		transition: all 0.2s;

		&:hover {
			background-color: rgba(34, 197, 94, 0.3) !important;
		}
	}

	.quantity-badge {
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
	}

	/* Custom background color classes with opacity */
	:global(.bg-yellow-500-5) {
		background-color: rgb(234 179 8 / 0.05);
	}

	:global(.bg-yellow-500-10) {
		background-color: rgb(234 179 8 / 0.1);
	}

	:global(.bg-yellow-500-20) {
		background-color: rgb(234 179 8 / 0.2);
	}

	:global(.border-yellow-500-30) {
		border-color: rgb(234 179 8 / 0.3);
	}

	:global(.bg-blue-500-10) {
		background-color: rgb(59 130 246 / 0.1);
	}

	:global(.bg-blue-500-20) {
		background-color: rgb(59 130 246 / 0.2);
	}

	:global(.bg-muted-30) {
		background-color: hsl(var(--muted) / 0.3);
	}
</style>
