<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { Trophy, Medal } from 'lucide-svelte';
	import { cn } from '$lib/utils.js';
	import RewardItemDetails from '$lib/components/RewardItemDetails.svelte';

	export let rewards: any[] = [];

	$: byPlacement = (() => {
		const map = new Map<number, any[]>();

		for (const reward of rewards ?? []) {
			const group = map.get(reward.placement) ?? [];

			group.push(reward);
			map.set(reward.placement, group);
		}

		return [...map.entries()].sort((a, b) => a[0] - b[0]);
	})();
	$: top = byPlacement.filter(([placement]) => placement <= 3);
	$: rest = byPlacement.filter(([placement]) => placement > 3);

	function medal(placement: number) {
		switch (placement) {
			case 1:
				return {
					ring: 'ring-1 ring-amber-400/40',
					bg: 'bg-gradient-to-b from-amber-500/10 to-transparent',
					badge: 'border-amber-400/40 bg-amber-400/20 text-amber-300'
				};
			case 2:
				return {
					ring: 'ring-1 ring-zinc-300/30',
					bg: 'bg-gradient-to-b from-zinc-400/10 to-transparent',
					badge: 'border-zinc-300/40 bg-zinc-300/20 text-zinc-200'
				};
			case 3:
				return {
					ring: 'ring-1 ring-orange-400/30',
					bg: 'bg-gradient-to-b from-orange-500/10 to-transparent',
					badge: 'border-orange-400/40 bg-orange-400/20 text-orange-300'
				};
			default:
				return {
					ring: '',
					bg: '',
					badge: 'border-[hsl(var(--border))] bg-muted text-muted-foreground'
				};
		}
	}
</script>

{#if byPlacement.length}
	<div class="flex flex-col gap-[16px]">
		{#if top.length}
			<div class="grid gap-[12px] md:grid-cols-3">
				{#each top as [placement, items]}
					{@const m = medal(placement)}
					<div
						class={cn(
							'flex flex-col gap-[12px] rounded-[12px] border border-[hsl(var(--border))] p-[14px]',
							m.ring,
							m.bg
						)}
					>
						<div class="flex items-center gap-[8px]">
							<div
								class={cn(
									'flex h-[30px] w-[30px] items-center justify-center rounded-full border',
									m.badge
								)}
							>
								{#if placement === 1}
									<Trophy size={16} />
								{:else}
									<Medal size={16} />
								{/if}
							</div>
							<span class="text-sm font-bold">
								{$_('tournament.overview.placement', { values: { placement } })}
							</span>
						</div>
						<div class="flex flex-col gap-[10px]">
							{#each items as reward}
								<RewardItemDetails
									itemData={reward.item ?? { id: reward.itemId }}
									quantity={reward.quantity}
								/>
							{/each}
						</div>
					</div>
				{/each}
			</div>
		{/if}

		{#if rest.length}
			<div class="flex flex-col gap-[8px]">
				<h4 class="text-sm font-semibold text-muted-foreground">
					{$_('tournament.podium.other_placements')}
				</h4>
				{#each rest as [placement, items]}
					<div class="flex flex-col gap-[8px] rounded-[8px] border border-[hsl(var(--border))] p-[12px]">
						<span class="text-xs font-semibold text-muted-foreground">
							{$_('tournament.overview.placement', { values: { placement } })}
						</span>
						<div class="flex flex-col gap-[8px]">
							{#each items as reward}
								<RewardItemDetails
									itemData={reward.item ?? { id: reward.itemId }}
									quantity={reward.quantity}
								/>
							{/each}
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>
{/if}
