<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { Snowflake } from 'lucide-svelte';
	import * as Table from '$lib/components/ui/table';
	import { Switch } from '$lib/components/ui/switch';
	import { Label } from '$lib/components/ui/label';
	import { cn } from '$lib/utils.js';
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

	function rankClass(rank: number) {
		switch (rank) {
			case 1:
				return 'text-amber-400';
			case 2:
				return 'text-zinc-300';
			case 3:
				return 'text-orange-400';
			default:
				return '';
		}
	}

	onMount(load);
</script>

{#if loading}
  <p class="text-center text-muted-foreground">{$_('tournament.loading')}</p>
{:else if board}
  <div class="mx-auto flex w-full max-w-[1100px] flex-col gap-[12px] px-[10px]">
    {#if board.frozen}
      <div class="flex items-center gap-[8px] rounded-[8px] border border-sky-500/40 bg-sky-500/10 px-[12px] py-[8px] text-sm text-sky-300">
        <Snowflake size={16} class="shrink-0" />
        {$_('tournament.leaderboard.frozen_notice')}
      </div>
    {/if}
    {#if canManage && board.frozen}
      <div class="flex items-center gap-[8px]">
        <Switch bind:checked={viewLive} onCheckedChange={load} id="view-live" />
        <Label for="view-live">{$_('tournament.leaderboard.view_live')}</Label>
      </div>
    {/if}

    <div class="overflow-x-auto rounded-[10px] border border-[hsl(var(--border))]">
      <Table.Root class="min-w-[720px]">
        <Table.Header>
          <Table.Row>
            <Table.Head class="sticky left-0 z-10 w-[56px] bg-background">{$_('tournament.leaderboard.rank')}</Table.Head>
            <Table.Head class="sticky left-[56px] z-10 min-w-[160px] bg-background">{$_('tournament.leaderboard.player')}</Table.Head>
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
              <Table.Cell class={cn('sticky left-0 z-10 bg-background text-base font-bold tabular-nums', rankClass(entry.rank))}>
                {entry.rank}
              </Table.Cell>
              <Table.Cell class="sticky left-[56px] z-10 bg-background">
                {#if entry.player}
                  <PlayerLink player={entry.player} showAvatar avatarSize={22} />
                {:else}
                  {entry.uid}
                {/if}
              </Table.Cell>
              <Table.Cell class="text-right font-semibold tabular-nums">{entry.totalScore}</Table.Cell>
              <Table.Cell class="text-right tabular-nums text-muted-foreground">{entry.completedCount}</Table.Cell>
              {#each levels ?? [] as level}
                {@const cell = entry.levels[String(level.levelId)]}
                <Table.Cell class="text-right">
                  {#if cell}
                    <div class="flex flex-col items-end gap-[3px]">
                      <span class="tabular-nums">{cell.score}</span>
                      <div class="h-[3px] w-[44px] overflow-hidden rounded-full bg-muted">
                        <div
                          class="h-full rounded-full bg-primary"
                          style={`width: ${Math.max(0, Math.min(100, cell.progress))}%`}
                        ></div>
                      </div>
                    </div>
                  {:else}
                    <span class="text-muted-foreground">-</span>
                  {/if}
                </Table.Cell>
              {/each}
            </Table.Row>
          {/each}
        </Table.Body>
      </Table.Root>
    </div>
  </div>
{/if}
