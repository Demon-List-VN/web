<script lang="ts">
	import { onMount } from 'svelte';
	import { _ } from 'svelte-i18n';
	import { RefreshCw } from 'lucide-svelte';
	import { Button } from '$lib/components/ui/button';
	import { Switch } from '$lib/components/ui/switch';
	import { Label } from '$lib/components/ui/label';
	import { getTournamentContestLevels } from '$lib/client/tournament';
	import ContestLevelCard from './contestLevelCard.svelte';

	export let tournament: any;

	let levels: any[] = [];
	let loading = true;
	let refreshing = false;
	let showDeathCount = true;
	let errorMessage = '';

	async function load() {
		refreshing = true;
		errorMessage = '';

		try {
			levels = await getTournamentContestLevels(tournament);
		} catch (error: any) {
			levels = [];
			errorMessage = error?.message || $_('tournament.levels.load_failed');
		} finally {
			loading = false;
			refreshing = false;
		}
	}

	onMount(load);
</script>

<div class="mx-auto flex w-full max-w-[1000px] flex-col gap-[10px] px-[10px]">
  <div class="flex items-center justify-center gap-[20px] rounded-lg border p-3">
    <Button
      size="icon"
      variant="outline"
      on:click={load}
      disabled={refreshing}
      aria-label={$_('tournament.levels.refresh')}
    >
      <RefreshCw size={16} class={refreshing ? 'animate-spin' : ''} />
    </Button>
    <div class="flex items-center gap-2">
      <Switch id="tournament-death-count-toggle" bind:checked={showDeathCount} />
      <Label for="tournament-death-count-toggle" class="cursor-pointer">
        {$_('contest.show_death_count')}
      </Label>
    </div>
  </div>

  {#if loading}
    <p class="py-6 text-center text-muted-foreground">{$_('tournament.loading')}</p>
  {:else if errorMessage}
    <p class="py-6 text-center text-muted-foreground">{errorMessage}</p>
  {:else if levels.length === 0}
    <p class="py-6 text-center text-muted-foreground">{$_('tournament.levels.empty')}</p>
  {:else}
    {#each levels as level, index (level.levelId)}
      <ContestLevelCard {level} {index} {showDeathCount} {tournament} onSubmitted={load} />
    {/each}
  {/if}
</div>
