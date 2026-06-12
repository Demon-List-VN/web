<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import PlayerLink from '$lib/components/playerLink.svelte';
	import { tournamentFetch } from '$lib/client/tournament';
	import Bracket from './bracket.svelte';

	export let tournament: any;
	export let canManage = false;

	let bracket: any = null;
	let loading = true;
	let overrideNode: any = null;
	let overrideWinner = '';

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

	function openOverride(node: any) {
		overrideNode = node;
		overrideWinner = node.player1Uid;
	}

	async function submitOverride() {
		try {
			await tournamentFetch(`/${tournament.id}/matches/${overrideNode.id}/override`, {
				method: 'POST',
				body: JSON.stringify({ winnerUid: overrideWinner })
			});
			toast.success($_('tournament.bracket.override_success'));
			overrideNode = null;
			await load();
		} catch (error: any) {
			toast.error(error.message);
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
    {canManage}
    onOverride={openOverride}
  />
{/if}

<Dialog.Root open={overrideNode !== null} onOpenChange={(open) => { if (!open) overrideNode = null; }}>
  <Dialog.Content>
    <Dialog.Header>
      <Dialog.Title>{$_('tournament.bracket.set_result')}</Dialog.Title>
    </Dialog.Header>
    {#if overrideNode}
      <div class="flex flex-col gap-[10px]">
        <p class="text-sm text-muted-foreground">{$_('tournament.bracket.choose_winner')}</p>
        <label class="flex items-center gap-[8px]">
          <input type="radio" bind:group={overrideWinner} value={overrideNode.player1Uid} />
          {#if overrideNode.player1}
            <PlayerLink player={overrideNode.player1} showAvatar avatarSize={20} />
          {/if}
        </label>
        <label class="flex items-center gap-[8px]">
          <input type="radio" bind:group={overrideWinner} value={overrideNode.player2Uid} />
          {#if overrideNode.player2}
            <PlayerLink player={overrideNode.player2} showAvatar avatarSize={20} />
          {/if}
        </label>
      </div>
    {/if}
    <Dialog.Footer>
      <Button on:click={submitOverride}>{$_('tournament.bracket.confirm')}</Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
