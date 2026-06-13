<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import MatchCard from '$lib/components/pvp/MatchCard.svelte';
	import PlayerLink from '$lib/components/playerLink.svelte';
	import { Button } from '$lib/components/ui/button';
	import { cn } from '$lib/utils.js';
	import { user } from '$lib/client';
	import { tournamentFetch } from '$lib/client/tournament';

	export let tournament: any;

	let bracket: any = null;
	let pvpMatches: any[] = [];
	let loading = true;

	$: series = bracket
		? [
			...bracket.rounds.flatMap((round: any) => round.matches),
			...(bracket.thirdPlaceMatch ? [bracket.thirdPlaceMatch] : [])
		].filter((node) => node.id)
		: [];

	function roundLabel(node: any) {
		if (node.isThirdPlace) {
			return $_('tournament.bracket.third_place');
		}

		const totalRounds = bracket?.rounds?.length ?? 0;
		const fromEnd = totalRounds - Number(node.round) + 1;

		if (fromEnd === 1) {
			return $_('cup.rounds.finals');
		}

		if (fromEnd === 2) {
			return $_('cup.rounds.semifinals');
		}

		if (fromEnd === 3) {
			return $_('cup.rounds.quarterfinals');
		}

		return $_('tournament.bracket.round_of', { values: { count: 2 ** fromEnd } });
	}

	function gamesFor(node: any) {
		return pvpMatches
			.filter((match) => Number(match.tournamentMatch?.id) === Number(node.id))
			.sort(
				(a, b) =>
					Number(a.tournamentMatch?.gameIndex ?? 0) - Number(b.tournamentMatch?.gameIndex ?? 0)
			);
	}

	function statusChip(status: string) {
		switch (status) {
			case 'completed':
				return 'border-transparent bg-green-500/15 text-green-500';
			case 'in_progress':
				return 'border-transparent bg-blue-500/15 text-blue-400';
			case 'pending':
			case 'ready':
				return 'border-transparent bg-amber-500/15 text-amber-400';
			default:
				return 'border-[hsl(var(--border))] bg-muted text-muted-foreground';
		}
	}

	async function load() {
		loading = true;

		try {
			[bracket, pvpMatches] = await Promise.all([
				tournamentFetch(`/${tournament.id}/bracket`),
				tournamentFetch(`/${tournament.id}/matches`)
			]);
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
{:else if series.length}
  <div class="mx-auto flex w-full max-w-[800px] flex-col gap-[14px] px-[10px]">
    {#each series as node (node.id)}
      {@const games = gamesFor(node)}
      <section class="rounded-[10px] border border-[hsl(var(--border))] bg-card/40 p-[14px]">
        <div class="flex flex-wrap items-center gap-[8px]">
          <strong>{roundLabel(node)}</strong>
          {#if !node.isThirdPlace}
            <span class="text-sm text-muted-foreground">#{Number(node.position) + 1}</span>
          {/if}
          <span class={cn('inline-flex items-center rounded-full border px-[10px] py-[2px] text-xs font-medium', statusChip(node.status))}>
            {$_(`tournament.matches.status_${node.status}`)}
          </span>
          <span class="ml-auto text-lg font-bold tabular-nums">
            {node.score1 ?? 0} - {node.score2 ?? 0}
          </span>
        </div>

        <div class="mt-[10px] flex flex-wrap items-center gap-[8px] text-sm">
          {#if node.player1}
            <PlayerLink player={node.player1} showAvatar avatarSize={22} />
          {:else}
            <span class="text-muted-foreground">{$_('tournament.bracket.pending_player')}</span>
          {/if}
          <span class="text-muted-foreground">vs</span>
          {#if node.player2}
            <PlayerLink player={node.player2} showAvatar avatarSize={22} />
          {:else}
            <span class="text-muted-foreground">{$_('tournament.bracket.pending_player')}</span>
          {/if}
          {#if node.currentPvpMatchId}
            <Button size="sm" variant="outline" class="ml-auto" href={`/versus/matches/${node.currentPvpMatchId}`}>
              {$_('tournament.bracket.open_match')}
            </Button>
          {/if}
        </div>

        {#if games.length}
          <div class="mt-[12px] flex flex-col gap-[10px] border-t border-[hsl(var(--border))] pt-[12px]">
            {#each games as match (match.id)}
              <MatchCard {match} currentUid={$user?.data?.uid ?? null} href={`/versus/matches/${match.id}`} />
            {/each}
          </div>
        {/if}
      </section>
    {/each}
  </div>
{:else}
  <p class="text-center text-muted-foreground">{$_('tournament.matches.empty')}</p>
{/if}
