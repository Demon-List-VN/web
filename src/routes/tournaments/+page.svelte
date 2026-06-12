<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { user } from '$lib/client';
	import { Button } from '$lib/components/ui/button';
	import { Plus } from 'lucide-svelte';
	import TournamentCard from './tournamentCard.svelte';

	export let data: any;

	$: tournaments = data.tournaments ?? [];
</script>

<svelte:head>
  <title>{$_('tournament.title')} - {$_('head.site_name')}</title>
</svelte:head>

<div class="mx-auto mt-[20px] w-full max-w-[1000px] px-[10px]">
  <div class="mb-[20px] flex items-center justify-between">
    <h1 class="text-2xl font-bold">{$_('tournament.title')}</h1>
    {#if $user?.loggedIn}
      <Button href="/tournaments/create" class="flex items-center gap-[6px]">
        <Plus size={16} />
        {$_('tournament.create')}
      </Button>
    {/if}
  </div>
  {#if tournaments.length}
    <div class="flex flex-col gap-[10px]">
      {#each tournaments as tournament (tournament.id)}
        <TournamentCard {tournament} />
      {/each}
    </div>
  {:else}
    <p class="mt-[40px] text-center text-muted-foreground">
      {$_('tournament.empty')}
    </p>
  {/if}
</div>
