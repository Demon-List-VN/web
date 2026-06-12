<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import * as Table from '$lib/components/ui/table';
	import { Switch } from '$lib/components/ui/switch';
	import { Label } from '$lib/components/ui/label';
	import PlayerLink from '$lib/components/playerLink.svelte';
	import { tournamentFetch } from '$lib/client/tournament';

	export let tournament: any;
	export let canManage = false;

	let board: any = null;
	let levels: any[] = [];
	let loading = true;
	let viewLive = false;

	async function load() {
		loading = true;

		try {
			[board, levels] = await Promise.all([
				tournamentFetch(`/${tournament.id}/leaderboard${viewLive ? '?live=true' : ''}`),
				tournament.contestLevels
					? Promise.resolve(tournament.contestLevels)
					: tournamentFetch(`/${tournament.id}/levels`)
						.catch(() => [])
			]);
		} catch (error: any) {
			toast.error(error.message);
		} finally {
			loading = false;
		}
	}

	$: levelById = new Map((levels ?? []).map((level: any) => [Number(level.levelId), level]));

	onMount(load);
</script>

{#if loading}
  <p class="text-center text-muted-foreground">{$_('tournament.loading')}</p>
{:else if board}
  {#if board.frozen}
    <div class="mx-auto mb-[12px] max-w-[1500px] rounded-[8px] border border-yellow-500/50 bg-yellow-500/10 px-[12px] py-[8px] text-sm text-yellow-600">
      {$_('tournament.leaderboard.frozen_notice')}
    </div>
  {/if}
  {#if canManage && board.frozen}
    <div class="mb-[12px] flex items-center gap-[8px]">
      <Switch bind:checked={viewLive} onCheckedChange={load} id="view-live" />
      <Label for="view-live">{$_('tournament.leaderboard.view_live')}</Label>
    </div>
  {/if}
  <div class="overflow-x-auto">
    <Table.Root class="w-[1000px] max-w-full">
      <Table.Header>
        <Table.Row>
          <Table.Head class="w-[60px]">{$_('tournament.leaderboard.rank')}</Table.Head>
          <Table.Head>{$_('tournament.leaderboard.player')}</Table.Head>
          <Table.Head class="text-right">{$_('tournament.leaderboard.score')}</Table.Head>
          <Table.Head class="text-right">{$_('tournament.leaderboard.completed')}</Table.Head>
          {#each levels ?? [] as level}
            <Table.Head class="text-right">
              {levelById.get(Number(level.levelId))?.levelId ?? level.levelId}
            </Table.Head>
          {/each}
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {#each board.entries as entry}
          <Table.Row>
            <Table.Cell class="font-semibold">{entry.rank}</Table.Cell>
            <Table.Cell>
              {#if entry.player}
                <PlayerLink player={entry.player} showAvatar avatarSize={22} />
              {:else}
                {entry.uid}
              {/if}
            </Table.Cell>
            <Table.Cell class="text-right font-semibold tabular-nums">{entry.totalScore}</Table.Cell>
            <Table.Cell class="text-right tabular-nums">{entry.completedCount}</Table.Cell>
            {#each levels ?? [] as level}
              {@const cell = entry.levels[String(level.levelId)]}
              <Table.Cell class="text-right tabular-nums">
                {#if cell}
                  <span>{cell.score}</span>
                  <span class="text-xs text-muted-foreground"> ({Math.round(cell.progress)}%)</span>
                {:else}
                  -
                {/if}
              </Table.Cell>
            {/each}
          </Table.Row>
        {/each}
      </Table.Body>
    </Table.Root>
  </div>
{/if}
