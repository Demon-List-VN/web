<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { user } from '$lib/client';
	import { tournamentFetch } from '$lib/client/tournament';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import MatchCard from '$lib/components/pvp/MatchCard.svelte';
	import PlayerLink from '$lib/components/playerLink.svelte';
	import MatchActionDialogs from './matchActionDialogs.svelte';

	export let tournament: any;
	export let onChange: (() => Promise<void> | void) | null = null;

	let bracket: any = null;
	let pvpMatches: any[] = [];
	let loading = true;
	let matchActions: any;

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

		return $_('tournament.bracket.round_of', {
			values: { count: 2 ** fromEnd }
		});
	}

	function gamesFor(node: any) {
		return pvpMatches
			.filter((match) => Number(match.tournamentMatch?.id) === Number(node.id))
			.sort(
				(a, b) =>
					Number(a.tournamentMatch?.gameIndex ?? 0)
						- Number(b.tournamentMatch?.gameIndex ?? 0)
			);
	}

	function canStart(node: any) {
		return node.status === 'pending'
			&& node.player1Uid
			&& node.player2Uid
			&& (tournament.status === 'ongoing' || tournament.status === 'finished');
	}

	function canFinalize(node: any) {
		return node.player1Uid
			&& node.player2Uid
			&& (tournament.status === 'ongoing' || tournament.status === 'finished');
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

	async function reload() {
		await load();
		await onChange?.();
	}

	onMount(load);
</script>

{#if loading}
  <p class="text-center text-muted-foreground">{$_('tournament.loading')}</p>
{:else if series.length}
  <div class="mx-auto flex w-full max-w-[1000px] flex-col gap-[14px]">
    {#each series as node (node.id)}
      {@const games = gamesFor(node)}
      <section class="rounded-[10px] border border-[hsl(var(--border))] bg-card/40 p-[14px]">
        <div class="flex flex-wrap items-start justify-between gap-[12px]">
          <div class="flex flex-col gap-[8px]">
            <div class="flex flex-wrap items-center gap-[8px]">
              <strong>{roundLabel(node)}</strong>
              {#if !node.isThirdPlace}
                <span class="text-sm text-muted-foreground">
                  #{Number(node.position) + 1}
                </span>
              {/if}
              <Badge variant={node.status === 'completed' ? 'secondary' : 'outline'}>
                {$_(`tournament.matches.status_${node.status}`)}
              </Badge>
              <span class="font-semibold tabular-nums">
                {node.score1 ?? 0} - {node.score2 ?? 0}
              </span>
            </div>
            <div class="flex flex-wrap items-center gap-[8px]">
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
            </div>
          </div>

          <div class="flex flex-wrap gap-[8px]">
            <Button
              size="sm"
              variant="outline"
              href={`/tournament/${tournament.id}/matches/${node.id}/overlay`}
              target="_blank"
              rel="noreferrer"
            >
              {$_('tournament.bracket.open_overlay')}
            </Button>
            {#if node.currentPvpMatchId}
              <Button
                size="sm"
                variant="outline"
                href={`/versus/matches/${node.currentPvpMatchId}`}
              >
                {$_('tournament.bracket.open_match')}
              </Button>
            {:else if canStart(node)}
              <Button size="sm" on:click={() => matchActions.openStart(node)}>
                {games.length
                  ? $_('tournament.matches.start_next_game')
                  : $_('tournament.bracket.start_match')}
              </Button>
            {/if}
            {#if canFinalize(node)}
              <Button size="sm" variant="outline" on:click={() => matchActions.openOverride(node)}>
                {$_('tournament.bracket.set_result')}
              </Button>
            {/if}
          </div>
        </div>

        <div class="mt-[14px] border-t border-[hsl(var(--border))] pt-[12px]">
          <p class="mb-[10px] text-sm font-semibold">
            {$_('tournament.matches.pvp_games', {
              values: {
                count: games.length,
                bestOf: tournament.pvpFormat?.levelsPerMatch ?? 1
              }
            })}
          </p>
          {#if games.length}
            <div class="flex flex-col gap-[10px]">
              {#each games as match (match.id)}
                <MatchCard
                  {match}
                  currentUid={$user?.data?.uid ?? null}
                  href={`/versus/matches/${match.id}`}
                />
              {/each}
            </div>
          {:else}
            <p class="text-sm text-muted-foreground">
              {$_('tournament.matches.no_pvp_games')}
            </p>
          {/if}
        </div>
      </section>
    {/each}
  </div>
{:else}
  <p class="text-center text-muted-foreground">{$_('tournament.matches.empty')}</p>
{/if}

<MatchActionDialogs bind:this={matchActions} {tournament} onChange={reload} />
