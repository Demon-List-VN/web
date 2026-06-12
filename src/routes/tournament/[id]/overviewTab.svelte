<script lang="ts">
	import { _ } from 'svelte-i18n';
	import Markdown from '$lib/components/markdown.svelte';
	import { badgeVariants } from '$lib/components/ui/badge';
	import RewardItemDetails from '$lib/components/RewardItemDetails.svelte';
	import { eloRangeText, formatLabelKey } from '$lib/client/tournament';

	export let tournament: any;

	$: eloText = eloRangeText(tournament.minElo, tournament.maxElo);
	$: rewardsByPlacement = (() => {
		const map = new Map<number, any[]>();

		for (const reward of tournament.rewards ?? []) {
			const group = map.get(reward.placement) ?? [];

			group.push(reward);
			map.set(reward.placement, group);
		}

		return [...map.entries()].sort((a, b) => a[0] - b[0]);
	})();
</script>

<div class="mx-auto flex w-full max-w-[1000px] flex-col gap-[20px] px-[10px]">
  <div class="grid grid-cols-2 gap-[12px] md:grid-cols-4">
    <div class="rounded-[8px] border border-[hsl(var(--border))] p-[12px]">
      <div class="text-xs text-muted-foreground">{$_('tournament.overview.format')}</div>
      <div class="font-semibold">{$_(formatLabelKey(tournament.format))}</div>
    </div>
    {#if tournament.maxPlayers}
      <div class="rounded-[8px] border border-[hsl(var(--border))] p-[12px]">
        <div class="text-xs text-muted-foreground">{$_('tournament.overview.players')}</div>
        <div class="font-semibold">{tournament.participantCount}/{tournament.maxPlayers}</div>
      </div>
    {/if}
    {#if eloText}
      <div class="rounded-[8px] border border-[hsl(var(--border))] p-[12px]">
        <div class="text-xs text-muted-foreground">{$_('tournament.overview.skill_range')}</div>
        <div class="font-semibold">{eloText}</div>
      </div>
    {/if}
    {#if tournament.format === 'single_elimination' && tournament.pvpFormat}
      <div class="rounded-[8px] border border-[hsl(var(--border))] p-[12px]">
        <div class="text-xs text-muted-foreground">{$_('tournament.overview.mode')}</div>
        <div class="font-semibold capitalize">{tournament.pvpFormat.mode}</div>
      </div>
    {/if}
    {#if tournament.format === 'contest' && tournament.contestConfig}
      <div class="rounded-[8px] border border-[hsl(var(--border))] p-[12px]">
        <div class="text-xs text-muted-foreground">{$_('tournament.overview.duration')}</div>
        <div class="font-semibold">
          {Math.round(tournament.contestConfig.durationSeconds / 3600)}h
        </div>
      </div>
    {/if}
  </div>

  {#if rewardsByPlacement.length}
    <div>
      <h3 class="mb-[10px] text-lg font-bold">{$_('tournament.overview.rewards')}</h3>
      <div class="flex flex-col gap-[10px]">
        {#each rewardsByPlacement as [placement, rewards]}
          <div class="rounded-[8px] border border-[hsl(var(--border))] p-[12px]">
            <div class="mb-[8px]">
              <span class={badgeVariants({ variant: 'outline' })}>
                {$_('tournament.overview.placement', { values: { placement } })}
              </span>
            </div>
            <div class="flex flex-col gap-[8px]">
              {#each rewards as reward}
                <RewardItemDetails itemData={reward.item ?? { id: reward.itemId }} quantity={reward.quantity} />
              {/each}
            </div>
          </div>
        {/each}
      </div>
    </div>
  {/if}

  {#if tournament.detail}
    <div class="markdown">
      <Markdown content={tournament.detail} />
    </div>
  {/if}
</div>

<style lang="scss">
.markdown {
  width: 100%;
}
</style>
