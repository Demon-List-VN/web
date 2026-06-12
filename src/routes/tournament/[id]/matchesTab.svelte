<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import MatchCard from '$lib/components/pvp/MatchCard.svelte';
	import { user } from '$lib/client';
	import { tournamentFetch } from '$lib/client/tournament';

	export let tournament: any;

	let matches: any[] = [];
	let loading = true;

	async function load() {
		loading = true;

		try {
			matches = await tournamentFetch(`/${tournament.id}/matches`);
		} catch (error: any) {
			toast.error(error.message);
		} finally {
			loading = false;
		}
	}

	onMount(load);
</script>

<div class="mx-auto flex w-full max-w-[700px] flex-col gap-[10px] px-[10px]">
  {#if loading}
    <p class="text-center text-muted-foreground">{$_('tournament.loading')}</p>
  {:else if matches.length}
    {#each matches as match (match.id)}
      <MatchCard
        {match}
        currentUid={$user?.data?.uid ?? null}
        href={`/versus/matches/${match.id}`}
      />
    {/each}
  {:else}
    <p class="text-center text-muted-foreground">{$_('tournament.matches.empty')}</p>
  {/if}
</div>
