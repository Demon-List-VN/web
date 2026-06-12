<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import * as Table from '$lib/components/ui/table';
	import { Button } from '$lib/components/ui/button';
	import { badgeVariants } from '$lib/components/ui/badge';
	import PlayerLink from '$lib/components/playerLink.svelte';
	import PlayerSelector from '$lib/components/playerSelector.svelte';
	import { user } from '$lib/client';
	import { tournamentFetch } from '$lib/client/tournament';

	export let tournament: any;
	export let isHost = false;
	export let isManager = false;
	export let onChange: (() => void) | null = null;

	let participants: any[] = [];
	let loading = true;
	let selectedPlayer: any = null;

	$: preStart = ['draft', 'registration_open', 'registration_closed', 'ready'].includes(
		tournament.status
	);

	async function load() {
		loading = true;

		try {
			participants = await tournamentFetch(`/${tournament.id}/participants`);
		} catch (error: any) {
			toast.error(error.message);
		} finally {
			loading = false;
		}
	}

	async function invite() {
		if (!selectedPlayer) {
			return;
		}

		try {
			await tournamentFetch(`/${tournament.id}/invites`, {
				method: 'POST',
				body: JSON.stringify({ uid: selectedPlayer.uid })
			});
			toast.success($_('tournament.participants.invited'));
			selectedPlayer = null;
			await load();
		} catch (error: any) {
			toast.error(error.message);
		}
	}

	async function forceAdd() {
		if (!selectedPlayer) {
			return;
		}

		try {
			await tournamentFetch(`/${tournament.id}/participants`, {
				method: 'POST',
				body: JSON.stringify({ uid: selectedPlayer.uid })
			});
			toast.success($_('tournament.participants.added'));
			selectedPlayer = null;
			await load();
			onChange?.();
		} catch (error: any) {
			toast.error(error.message);
		}
	}

	async function remove(uid: string) {
		try {
			await tournamentFetch(`/${tournament.id}/participants/${uid}`, { method: 'DELETE' });
			toast.success($_('tournament.participants.removed'));
			await load();
			onChange?.();
		} catch (error: any) {
			toast.error(error.message);
		}
	}

	onMount(load);
</script>

<div class="mx-auto w-full max-w-[700px] px-[10px]">
  {#if (isHost || isManager) && preStart}
    <div class="mb-[16px] flex flex-col gap-[8px] rounded-[8px] border border-[hsl(var(--border))] p-[12px]">
      <PlayerSelector
        value={selectedPlayer}
        on:select={(e) => (selectedPlayer = e.detail)}
        on:clear={() => (selectedPlayer = null)}
      />
      <div class="flex gap-[8px]">
        <Button size="sm" variant="outline" on:click={invite} disabled={!selectedPlayer}>
          {$_('tournament.participants.invite')}
        </Button>
        {#if isManager}
          <Button size="sm" on:click={forceAdd} disabled={!selectedPlayer}>
            {$_('tournament.participants.force_add')}
          </Button>
        {/if}
      </div>
    </div>
  {/if}

  {#if loading}
    <p class="text-center text-muted-foreground">{$_('tournament.loading')}</p>
  {:else}
    <Table.Root>
      <Table.Header>
        <Table.Row>
          <Table.Head>{$_('tournament.leaderboard.player')}</Table.Head>
          <Table.Head>{$_('tournament.participants.status')}</Table.Head>
          {#if (isHost || isManager) && preStart}
            <Table.Head></Table.Head>
          {/if}
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {#each participants as participant}
          <Table.Row>
            <Table.Cell>
              {#if participant.player}
                <PlayerLink player={participant.player} showAvatar avatarSize={22} />
              {:else}
                {participant.uid}
              {/if}
            </Table.Cell>
            <Table.Cell>
              <span class={badgeVariants({ variant: participant.status === 'active' ? 'secondary' : 'outline' })}>
                {$_(`tournament.participants.status_${participant.status}`)}
              </span>
            </Table.Cell>
            {#if (isHost || isManager) && preStart}
              <Table.Cell>
                {#if isManager && participant.status !== 'removed'}
                  <Button size="sm" variant="ghost" on:click={() => remove(participant.uid)}>
                    {$_('tournament.participants.remove')}
                  </Button>
                {/if}
              </Table.Cell>
            {/if}
          </Table.Row>
        {/each}
      </Table.Body>
    </Table.Root>
  {/if}
</div>
