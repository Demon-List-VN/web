<script lang="ts">
	import { onMount } from 'svelte';
	import { _ } from 'svelte-i18n';
	import { Download, RefreshCw, Snowflake } from 'lucide-svelte';
	import { toast } from 'svelte-sonner';
	import * as Table from '$lib/components/ui/table';
	import * as Tooltip from '$lib/components/ui/tooltip';
	import { Switch } from '$lib/components/ui/switch';
	import { Label } from '$lib/components/ui/label';
	import { Button } from '$lib/components/ui/button';
	import PlayerLink from '$lib/components/playerLink.svelte';
	import { user } from '$lib/client';
	import {
		getTournamentContestLevels,
		tournamentFetch
	} from '$lib/client/tournament';
	import { cn } from '$lib/utils.js';

	export let tournament: any;
	export let canManage = false;

	let board: any = null;
	let levels: any[] = [];
	let loading = true;
	let refreshing = false;
	let viewLive = false;
	let showPercentage = false;

	$: totalAvailablePoints = levels.reduce(
		(total, level) => total + Number(level.maxPoints || 0),
		0
	);

	function indexToRoman(value: number) {
		const numerals: Array<[number, string]> = [
			[1000, 'M'],
			[900, 'CM'],
			[500, 'D'],
			[400, 'CD'],
			[100, 'C'],
			[90, 'XC'],
			[50, 'L'],
			[40, 'XL'],
			[10, 'X'],
			[9, 'IX'],
			[5, 'V'],
			[4, 'IV'],
			[1, 'I']
		];
		let remaining = value;
		let result = '';

		for (const [amount, numeral] of numerals) {
			while (remaining >= amount) {
				result += numeral;
				remaining -= amount;
			}
		}

		return result;
	}

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

	function displayTotal(entry: any) {
		if (!showPercentage) {
			return entry.totalScore;
		}

		if (totalAvailablePoints <= 0) {
			return '0%';
		}

		const percentage = Math.round(
			(Number(entry.totalScore || 0) / totalAvailablePoints) * 10000
		) / 100;

		return `${percentage}%`;
	}

	function getPenaltyMs(entry: any) {
		if (Number.isFinite(Number(entry.penaltyMs))) {
			return Number(entry.penaltyMs);
		}

		const startedAt = new Date(tournament.startedAt)
			.getTime();

		if (!Number.isFinite(startedAt)) {
			return 0;
		}

		return Object.values(entry.levels ?? {})
			.reduce((total: number, result: any) => {
				const reachedAt = new Date(result?.reachedAt)
					.getTime();

				return Number.isFinite(reachedAt)
					? total + Math.max(0, reachedAt - startedAt)
					: total;
			}, 0);
	}

	function getPenaltyMinutes(entry: any) {
		return Math.round(getPenaltyMs(entry) / 60000);
	}

	function getPenaltyTooltip(entry: any) {
		const totalMs = getPenaltyMs(entry);
		const hours = Math.floor(totalMs / 3600000);
		const minutes = Math.floor((totalMs % 3600000) / 60000);
		const seconds = Math.floor((totalMs % 60000) / 1000);

		return $_('tournament.leaderboard.penalty_detail', {
			values: { hours, minutes, seconds }
		});
	}

	function escapeCsv(value: unknown) {
		const text = String(value ?? '');

		return text.includes('"') || text.includes(',') || text.includes('\n')
			? `"${text.replace(/"/g, '""')}"`
			: text;
	}

	function exportToCsv() {
		if (!board?.entries?.length) {
			return;
		}

		const headers = [
			'Rank',
			'Player',
			'UserID',
			'Total',
			'Penalty',
			'Completed',
			...levels.map((level) => level.name || `Level ${level.levelId}`)
		];
		const rows = board.entries.map((entry: any) => [
			entry.rank,
			entry.player?.name || entry.uid,
			entry.uid,
			entry.totalScore,
			getPenaltyMinutes(entry),
			entry.completedCount,
			...levels.map((level) => entry.levels[String(level.levelId)]?.score ?? 0)
		]);
		const csv = [headers, ...rows]
			.map((row) =>
				row.map(escapeCsv)
					.join(',')
			)
			.join('\n');
		const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
		const link = document.createElement('a');
		link.href = url;
		link.download = `tournament_${tournament.id}_leaderboard.csv`;
		document.body.appendChild(link);
		link.click();
		link.remove();
		URL.revokeObjectURL(url);
	}

	async function load(showToast = false) {
		refreshing = true;
		const request = async () => {
			[board, levels] = await Promise.all([
				tournamentFetch(`/${tournament.id}/leaderboard${viewLive ? '?live=true' : ''}`),
				getTournamentContestLevels(tournament)
			]);
		};

		try {
			if (showToast) {
				await toast.promise(request(), {
					success: $_('contest.leaderboard.refresh.success'),
					error: $_('contest.leaderboard.refresh.error'),
					loading: $_('contest.leaderboard.refresh.loading')
				});
			} else {
				await request();
			}
		} catch (error: any) {
			if (!showToast) {
				toast.error(error.message);
			}
		} finally {
			loading = false;
			refreshing = false;
		}
	}

	onMount(() => load());
</script>

{#if loading}
  <p class="text-center text-muted-foreground">{$_('tournament.loading')}</p>
{:else if board}
  <div class="mx-auto w-full max-w-[1500px] px-[10px]">
    {#if board.frozen}
      <div class="mb-[10px] flex items-center gap-[8px] rounded-[8px] border border-sky-500/40 bg-sky-500/10 px-[12px] py-[8px] text-sm text-sky-300">
        <Snowflake size={16} class="shrink-0" />
        {$_('tournament.leaderboard.frozen_notice')}
      </div>
    {/if}

    <div class="mb-[10px] flex flex-wrap justify-center gap-[10px]">
      <div class="flex items-center gap-[10px] rounded-md border border-input bg-background px-3">
        <Label for="tournament-percentage-switch" class="cursor-pointer text-sm">
          {showPercentage
            ? $_('contest.leaderboard.display_mode.contribution_percentage')
            : $_('contest.leaderboard.display_mode.total_points')}
        </Label>
        <Switch id="tournament-percentage-switch" bind:checked={showPercentage} />
      </div>
      <Button href="#tournament-me" variant="outline">
        {$_('contest.leaderboard.jump_to_me')}
      </Button>
      <Button
        size="icon"
        variant="outline"
        on:click={exportToCsv}
        disabled={!board.entries?.length}
        aria-label={$_('tournament.leaderboard.export')}
      >
        <Download size={16} />
      </Button>
      <Button
        size="icon"
        variant="outline"
        on:click={() => load(true)}
        disabled={refreshing}
        aria-label={$_('tournament.leaderboard.refresh')}
      >
        <RefreshCw size={16} class={refreshing ? 'animate-spin' : ''} />
      </Button>
      {#if canManage && board.frozen}
        <div class="flex items-center gap-[8px] rounded-md border border-input bg-background px-3">
          <Switch
            bind:checked={viewLive}
            onCheckedChange={() => load()}
            id="view-live"
          />
          <Label for="view-live">{$_('tournament.leaderboard.view_live')}</Label>
        </div>
      {/if}
    </div>

    {#if board.entries?.length}
      <div class="overflow-x-auto">
        <Table.Root class="min-w-[760px]">
          <Table.Header class="bg-background">
            <Table.Row>
              <Table.Head class="w-[100px]">{$_('tournament.leaderboard.rank')}</Table.Head>
              <Table.Head class="min-w-[200px]">{$_('tournament.leaderboard.player')}</Table.Head>
              <Table.Head class="w-[100px] text-center">{$_('contest.leaderboard.total')}</Table.Head>
              <Table.Head class="w-[100px] text-center">{$_('contest.leaderboard.penalty')}</Table.Head>
              <Table.Head class="w-[100px] text-center">{$_('tournament.leaderboard.completed')}</Table.Head>
              {#each levels as level, index}
                <Table.Head class="w-[90px] text-center">
                  <Tooltip.Root>
                    <Tooltip.Trigger>
                      {indexToRoman(index + 1)}
                    </Tooltip.Trigger>
                    <Tooltip.Content>{level.name || `Level ${level.levelId}`}</Tooltip.Content>
                  </Tooltip.Root>
                </Table.Head>
              {/each}
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {#each board.entries as entry (entry.uid)}
              <Table.Row>
                <Table.Cell
                  class={cn(
                    'w-[100px] text-base font-bold tabular-nums',
                    rankClass(entry.rank),
                    $user.loggedIn && entry.uid === $user.data.uid ? 'text-yellow-500' : ''
                  )}
                >
                  #{entry.rank}
                </Table.Cell>
                <Table.Cell class="min-w-[200px]">
                  {#if entry.player}
                    <div id={$user.loggedIn && entry.uid === $user.data.uid ? 'tournament-me' : undefined}>
                      <PlayerLink
                        player={entry.player}
                        showAvatar
                        avatarSize={22}
                        showTitle={true}
                        titleType="elo"
                      />
                    </div>
                  {:else}
                    {entry.uid}
                  {/if}
                </Table.Cell>
                <Table.Cell class="w-[100px] text-center font-bold tabular-nums">
                  {displayTotal(entry)}
                </Table.Cell>
                <Table.Cell class="w-[100px] text-center tabular-nums">
                  <Tooltip.Root>
                    <Tooltip.Trigger>
                      {getPenaltyMinutes(entry)}
                    </Tooltip.Trigger>
                    <Tooltip.Content>{getPenaltyTooltip(entry)}</Tooltip.Content>
                  </Tooltip.Root>
                </Table.Cell>
                <Table.Cell class="w-[100px] text-center tabular-nums text-muted-foreground">
                  {entry.completedCount}
                </Table.Cell>
                {#each levels as level}
                  {@const result = entry.levels[String(level.levelId)]}
                  <Table.Cell class="w-[90px] text-center tabular-nums">
                    {#if result}
                      {result.score}<br />
                      <span class="text-[11px] opacity-50">
                        {Math.round(Number(result.progress) * 100) / 100}%
                      </span>
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
    {:else}
      <p class="py-8 text-center text-muted-foreground">
        {$_('tournament.leaderboard.empty')}
      </p>
    {/if}
  </div>
{/if}
