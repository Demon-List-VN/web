<script lang="ts">
	import { _ } from 'svelte-i18n';
	import PlayerLink from '$lib/components/playerLink.svelte';

	export let rounds: any[] = [];
	export let thirdPlaceMatch: any = null;
	export let champion: any = null;
	export let canManage = false;
	export let onOverride: ((node: any) => void) | null = null;

	const MATCH_HEIGHT = 80;
	const GAP = 20;

	function roundLabel(roundIndex: number, totalRounds: number) {
		const fromEnd = totalRounds - roundIndex;

		if (fromEnd === 1) {
			return $_('cup.rounds.finals');
		}

		if (fromEnd === 2) {
			return $_('cup.rounds.semifinals');
		}

		if (fromEnd === 3) {
			return $_('cup.rounds.quarterfinals');
		}

		const size = 2 ** (totalRounds - roundIndex);

		return $_('tournament.bracket.round_of', { values: { count: size } });
	}

	// Vertical spacing doubles each round so connectors line up.
	function columnGap(roundIndex: number) {
		return (MATCH_HEIGHT + GAP) * 2 ** roundIndex - MATCH_HEIGHT;
	}

	function columnPadding(roundIndex: number) {
		return ((MATCH_HEIGHT + GAP) * 2 ** roundIndex - (MATCH_HEIGHT + GAP)) / 2;
	}

	function isWinner(node: any, slot: 1 | 2) {
		if (!node.winnerUid) {
			return false;
		}

		const uid = slot === 1 ? node.player1Uid : node.player2Uid;

		return uid === node.winnerUid;
	}
</script>

<div class="overflow-x-auto pb-[10px]">
  <div class="flex w-fit gap-[40px] p-[10px]">
    {#each rounds as round, roundIndex}
      <div class="flex flex-col" style={`gap: ${columnGap(roundIndex)}px; padding-top: ${columnPadding(roundIndex)}px;`}>
        <div class="mb-[6px] text-center text-sm font-semibold text-muted-foreground">
          {roundLabel(roundIndex, rounds.length)}
        </div>
        {#each round.matches as node}
          <div
            class="flex w-[240px] flex-col overflow-hidden rounded-[8px] border border-[hsl(var(--border))]"
            style={`height: ${MATCH_HEIGHT}px;`}
          >
            {#each [1, 2] as slot}
              {@const player = slot === 1 ? node.player1 : node.player2}
              {@const score = slot === 1 ? node.score1 : node.score2}
              <div
                class="flex flex-1 items-center gap-[6px] px-[10px] text-sm"
                class:bg-green-500={false}
                class:font-semibold={isWinner(node, slot)}
              >
                {#if player}
                  <PlayerLink {player} showAvatar avatarSize={20} truncate={18} />
                {:else}
                  <span class="opacity-40">{$_('tournament.bracket.tbd')}</span>
                {/if}
                <span
                  class="ml-auto tabular-nums"
                  class:text-green-500={isWinner(node, slot)}
                >
                  {score ?? 0}
                </span>
              </div>
            {/each}
            {#if canManage && node.status !== 'completed' && node.player1Uid && node.player2Uid}
              <button
                class="border-t border-[hsl(var(--border))] bg-muted/40 py-[2px] text-xs text-muted-foreground hover:bg-muted"
                on:click={() => onOverride?.(node)}
              >
                {$_('tournament.bracket.set_result')}
              </button>
            {/if}
          </div>
        {/each}
      </div>
    {/each}
  </div>

  <div class="mt-[20px] flex flex-wrap gap-[30px] p-[10px]">
    {#if champion}
      <div>
        <p class="mb-[6px] text-center text-yellow-400">{$_('tournament.bracket.champion')}</p>
        <div class="flex h-[40px] w-[240px] items-center rounded-[8px] border border-yellow-400 px-[10px]">
          <PlayerLink player={champion} showAvatar avatarSize={22} truncate={20} />
        </div>
      </div>
    {/if}
    {#if thirdPlaceMatch}
      <div>
        <p class="mb-[6px] text-center text-sm text-muted-foreground">
          {$_('tournament.bracket.third_place')}
        </p>
        <div class="flex w-[240px] flex-col overflow-hidden rounded-[8px] border border-[hsl(var(--border))]">
          {#each [1, 2] as slot}
            {@const player = slot === 1 ? thirdPlaceMatch.player1 : thirdPlaceMatch.player2}
            {@const score = slot === 1 ? thirdPlaceMatch.score1 : thirdPlaceMatch.score2}
            <div
              class="flex h-[36px] items-center gap-[6px] px-[10px] text-sm"
              class:font-semibold={isWinner(thirdPlaceMatch, slot)}
            >
              {#if player}
                <PlayerLink {player} showAvatar avatarSize={20} truncate={18} />
              {:else}
                <span class="opacity-40">{$_('tournament.bracket.tbd')}</span>
              {/if}
              <span class="ml-auto tabular-nums" class:text-green-500={isWinner(thirdPlaceMatch, slot)}>
                {score ?? 0}
              </span>
            </div>
          {/each}
          {#if canManage && thirdPlaceMatch.status !== 'completed' && thirdPlaceMatch.player1Uid && thirdPlaceMatch.player2Uid}
            <button
              class="border-t border-[hsl(var(--border))] bg-muted/40 py-[2px] text-xs text-muted-foreground hover:bg-muted"
              on:click={() => onOverride?.(thirdPlaceMatch)}
            >
              {$_('tournament.bracket.set_result')}
            </button>
          {/if}
        </div>
      </div>
    {/if}
  </div>
</div>
