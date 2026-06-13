<script lang="ts">
	import { _ } from 'svelte-i18n';
	import Markdown from '$lib/components/markdown.svelte';
	import RewardPodium from '$lib/components/tournament/RewardPodium.svelte';

	export let tournament: any;

	$: hasRewards = Boolean(tournament.rewards?.length);
	$: hasDetail = Boolean(tournament.detail);
</script>

<div class="mx-auto flex w-full max-w-[1000px] flex-col gap-[24px] px-[10px]">
  {#if hasRewards}
    <div>
      <h3 class="mb-[12px] text-lg font-bold">{$_('tournament.overview.rewards')}</h3>
      <RewardPodium rewards={tournament.rewards} />
    </div>
  {/if}

  {#if hasDetail}
    <div class="markdown">
      <Markdown content={tournament.detail} />
    </div>
  {/if}

  {#if !hasRewards && !hasDetail}
    <p class="py-[20px] text-center text-muted-foreground">{$_('tournament.overview.empty')}</p>
  {/if}
</div>

<style lang="scss">
.markdown {
  width: 100%;
}
</style>
