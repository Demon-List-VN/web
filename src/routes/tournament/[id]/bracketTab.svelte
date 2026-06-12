<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { tournamentFetch } from '$lib/client/tournament';
	import Bracket from './bracket.svelte';

	export let tournament: any;

	let bracket: any = null;
	let loading = true;

	async function load() {
		loading = true;

		try {
			bracket = await tournamentFetch(`/${tournament.id}/bracket`);
		} catch (error: any) {
			toast.error(error.message);
		} finally {
			loading = false;
		}
	}

	onMount(load);
</script>

{#if loading}
  <p class="text-center text-muted-foreground">{$_('tournament.loading')}</p>
{:else if bracket}
  <Bracket
    rounds={bracket.rounds}
    thirdPlaceMatch={bracket.thirdPlaceMatch}
    champion={bracket.champion}
  />
{/if}
