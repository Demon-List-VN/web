<script lang="ts">
	import { _ } from 'svelte-i18n';
	import PlayerLink from '$lib/components/playerLink.svelte';

	export let rounds: any[] = [];
	export let thirdPlaceMatch: any = null;
	export let champion: any = null;
	export let editable = false;
	export let participants: any[] = [];
	export let showActions = false;
	export let onSlotChange: ((position: number, slot: 1 | 2, uid: string | null) => void) | null = null;
	export let onStart: ((node: any) => void) | null = null;
	export let onOverride: ((node: any) => void) | null = null;

	const MATCH_HEIGHT = 104;
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

	function isWinner(node: any, slot: number) {
		if (!node.winnerUid) {
			return false;
		}

		const uid = slot === 1 ? node.player1Uid : node.player2Uid;

		return uid === node.winnerUid;
	}

	function slotState(node: any, slot: number) {
		return slot === 1 ? node.player1State : node.player2State;
	}

	function slotLabel(node: any, slot: number) {
		return slotState(node, slot) === 'bye'
			? $_('tournament.bracket.bye')
			: $_('tournament.bracket.pending_player');
	}

	function selectedUid(event: Event) {
		const value = (event.currentTarget as HTMLSelectElement).value;

		return value || null;
	}
</script>

<div class="overflow-x-auto pb-[10px]">
  <div class="flex w-fit gap-[40px] p-[10px]">
    {#each rounds as round, roundIndex}
      <div class="flex flex-col">
        <div class="mb-[6px] text-center text-sm font-semibold text-muted-foreground">
          {roundLabel(roundIndex, rounds.length)}
        </div>
        <div
          class="flex flex-col"
          style={`gap: ${columnGap(roundIndex)}px; padding-top: ${columnPadding(roundIndex)}px;`}
        >
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
                  {#if editable && roundIndex === 0}
                    <select
                      class="h-8 min-w-0 flex-1 rounded-md border border-input bg-background px-2 text-xs"
                      value={slot === 1 ? node.player1Uid ?? '' : node.player2Uid ?? ''}
                      on:change={(event) => onSlotChange?.(node.position, slot === 1 ? 1 : 2, selectedUid(event))}
                    >
                      <option value="">{$_('tournament.bracket.bye')}</option>
                      {#each participants as participant}
                        <option value={participant.uid}>
                          {participant.player?.name ?? participant.uid} ({participant.eloAtRegistration ?? 1500})
                        </option>
                      {/each}
                    </select>
                  {:else if player}
                    <PlayerLink {player} showAvatar avatarSize={20} truncate={18} />
                  {:else}
                    <span class="opacity-40">{slotLabel(node, slot)}</span>
                  {/if}
                  {#if !editable || roundIndex !== 0}
                    <span
                      class="ml-auto tabular-nums"
                      class:text-green-500={isWinner(node, slot)}
                    >
                      {score ?? 0}
                    </span>
                  {/if}
                </div>
              {/each}
              {#if node.currentPvpMatchId || (showActions && node.player1Uid && node.player2Uid && node.status !== 'waiting')}
                <div class="flex h-[28px] border-t border-[hsl(var(--border))] bg-muted/40 text-xs">
                  {#if node.currentPvpMatchId}
                    <a
                      class="flex flex-1 items-center justify-center text-primary hover:bg-muted"
                      href={`/versus/matches/${node.currentPvpMatchId}`}
                    >
                      {$_('tournament.bracket.open_match')}
                    </a>
                  {:else if showActions && node.status === 'pending'}
                    <button class="flex-1 hover:bg-muted" on:click={() => onStart?.(node)}>
                      {$_('tournament.bracket.start_match')}
                    </button>
                  {/if}
                  {#if showActions && node.player1Uid && node.player2Uid}
                    <button
                      class="flex-1 border-l border-[hsl(var(--border))] hover:bg-muted"
                      on:click={() => onOverride?.(node)}
                    >
                      {$_('tournament.bracket.edit_result')}
                    </button>
                  {/if}
                </div>
              {/if}
            </div>
          {/each}
        </div>
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
                <span class="opacity-40">{slotLabel(thirdPlaceMatch, slot)}</span>
              {/if}
              <span class="ml-auto tabular-nums" class:text-green-500={isWinner(thirdPlaceMatch, slot)}>
                {score ?? 0}
              </span>
            </div>
          {/each}
          {#if thirdPlaceMatch.currentPvpMatchId || (showActions && thirdPlaceMatch.player1Uid && thirdPlaceMatch.player2Uid && thirdPlaceMatch.status !== 'waiting')}
            <div class="flex h-[28px] border-t border-[hsl(var(--border))] bg-muted/40 text-xs">
              {#if thirdPlaceMatch.currentPvpMatchId}
                <a
                  class="flex flex-1 items-center justify-center text-primary hover:bg-muted"
                  href={`/versus/matches/${thirdPlaceMatch.currentPvpMatchId}`}
                >
                  {$_('tournament.bracket.open_match')}
                </a>
              {:else if showActions && thirdPlaceMatch.status === 'pending'}
                <button class="flex-1 hover:bg-muted" on:click={() => onStart?.(thirdPlaceMatch)}>
                  {$_('tournament.bracket.start_match')}
                </button>
              {/if}
              {#if showActions && thirdPlaceMatch.player1Uid && thirdPlaceMatch.player2Uid}
                <button
                  class="flex-1 border-l border-[hsl(var(--border))] hover:bg-muted"
                  on:click={() => onOverride?.(thirdPlaceMatch)}
                >
                  {$_('tournament.bracket.edit_result')}
                </button>
              {/if}
            </div>
          {/if}
        </div>
      </div>
    {/if}
  </div>
</div>
