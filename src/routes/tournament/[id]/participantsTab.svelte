<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { UserPlus, X } from 'lucide-svelte';
	import * as Table from '$lib/components/ui/table';
	import { Button } from '$lib/components/ui/button';
	import { cn } from '$lib/utils.js';
	import PlayerLink from '$lib/components/playerLink.svelte';
	import PlayerSelector from '$lib/components/playerSelector.svelte';
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
	$: canManageParticipants = (isHost || isManager) && preStart;

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

	function statusChip(status: string) {
		switch (status) {
			case 'active':
				return 'border-transparent bg-green-500/15 text-green-500';
			case 'invited':
				return 'border-transparent bg-blue-500/15 text-blue-400';
			case 'removed':
				return 'border-transparent bg-red-500/15 text-red-400';
			default:
				return 'border-[hsl(var(--border))] bg-muted text-muted-foreground';
		}
	}

	onMount(load);
</script>

<div class="mx-auto w-full max-w-[720px] px-[10px]">
  {#if canManageParticipants}
    <div class="mb-[16px] flex flex-col gap-[10px] rounded-[10px] border border-[hsl(var(--border))] bg-card/40 p-[14px]">
      <span class="text-sm font-semibold">{$_('tournament.participants.invite')}</span>
      <div class="flex flex-col gap-[8px] sm:flex-row sm:items-center">
        <div class="flex-1">
          <PlayerSelector
            value={selectedPlayer}
            on:select={(e) => (selectedPlayer = e.detail)}
            on:clear={() => (selectedPlayer = null)}
          />
        </div>
        <div class="flex gap-[8px]">
          <Button size="sm" variant="outline" class="flex items-center gap-[6px]" on:click={invite} disabled={!selectedPlayer}>
            <UserPlus size={15} />
            {$_('tournament.participants.invite')}
          </Button>
          {#if isManager}
            <Button size="sm" on:click={forceAdd} disabled={!selectedPlayer}>
              {$_('tournament.participants.force_add')}
            </Button>
          {/if}
        </div>
      </div>
    </div>
  {/if}

  {#if loading}
    <p class="text-center text-muted-foreground">{$_('tournament.loading')}</p>
  {:else if participants.length}
    <div class="overflow-hidden rounded-[10px] border border-[hsl(var(--border))]">
      <Table.Root>
        <Table.Header>
          <Table.Row>
            <Table.Head>{$_('tournament.leaderboard.player')}</Table.Head>
            <Table.Head>{$_('tournament.participants.status')}</Table.Head>
            {#if canManageParticipants}
              <Table.Head class="w-[56px]"></Table.Head>
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
                <span class={cn('inline-flex items-center rounded-full border px-[10px] py-[2px] text-xs font-medium', statusChip(participant.status))}>
                  {$_(`tournament.participants.status_${participant.status}`)}
                </span>
              </Table.Cell>
              {#if canManageParticipants}
                <Table.Cell>
                  {#if participant.status !== 'removed'}
                    <Button
                      size="icon"
                      variant="ghost"
                      class="h-[28px] w-[28px] text-muted-foreground hover:text-destructive"
                      title={$_('tournament.participants.remove')}
                      on:click={() => remove(participant.uid)}
                    >
                      <X size={16} />
                    </Button>
                  {/if}
                </Table.Cell>
              {/if}
            </Table.Row>
          {/each}
        </Table.Body>
      </Table.Root>
    </div>
  {:else}
    <p class="text-center text-muted-foreground">{$_('tournament.participants.empty')}</p>
  {/if}
</div>
