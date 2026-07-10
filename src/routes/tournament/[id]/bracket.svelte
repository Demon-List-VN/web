<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { Trophy, ZoomIn, ZoomOut, RefreshCcw, Maximize2, Minimize2, Crown } from 'lucide-svelte';
	import * as Select from '$lib/components/ui/select';
	import { Button } from '$lib/components/ui/button';
	import { cn } from '$lib/utils.js';
	import PlayerLink from '$lib/components/playerLink.svelte';
	import { resolvePvpRankBadge } from '$lib/utils/pvpRank';

	export let rounds: any[] = [];
	export let thirdPlaceMatch: any = null;
	export let champion: any = null;
	export let editable = false;
	export let participants: any[] = [];
	export let showActions = false;
	export let onSlotChange: ((position: number, slot: 1 | 2, uid: string | null) => void) | null = null;
	export let onStart: ((node: any) => void) | null = null;
	export let onOverride: ((node: any) => void) | null = null;

	// Layout constants (connectors are anchored to the slot block, footers overflow below).
	const MATCH_W = 280;
	const SLOT_H = 68;
	const FOOT_H = 30;
	const V_GAP = 40;
	const H_GAP = 64;
	const HEADER_H = 34;
	const PAD = 24;
	const PITCH = SLOT_H + V_GAP;

	$: round0Count = rounds[0]?.matches?.length ?? 0;

	// centers[round][position] = vertical center (incl. padding + header offset) of the slot block.
	$: centers = (() => {
		const map: Record<number, Record<number, number>> = {};

		if (!rounds.length) {
			return map;
		}

		map[0] = {};

		for (const node of rounds[0].matches) {
			map[0][node.position] = PAD + HEADER_H + SLOT_H / 2 + node.position * PITCH;
		}

		for (let r = 1; r < rounds.length; r += 1) {
			map[r] = {};

			for (const node of rounds[r].matches) {
				const a = map[r - 1][node.position * 2];
				const b = map[r - 1][node.position * 2 + 1];

				map[r][node.position] = (a + b) / 2;
			}
		}

		return map;
	})();

	const columnX = (round: number) => PAD + round * (MATCH_W + H_GAP);
	const centerOf = (round: number, position: number) => centers[round]?.[position] ?? 0;

	$: roundsCount = rounds.length;
	$: finalsCenter = roundsCount ? centerOf(roundsCount - 1, 0) : 0;
	$: finalsX = roundsCount ? columnX(roundsCount - 1) : PAD;
	$: championX = roundsCount ? columnX(roundsCount - 1) + MATCH_W + H_GAP : 0;
	$: bracketRight = roundsCount ? columnX(roundsCount - 1) + MATCH_W : 0;
	$: treeWidth = (champion ? championX + MATCH_W : bracketRight) + PAD;
	$: bracketBottom = PAD + HEADER_H + SLOT_H + Math.max(0, round0Count - 1) * PITCH + FOOT_H;
	$: thirdPlaceTop = finalsCenter + SLOT_H / 2 + FOOT_H + 30;
	$: treeHeight = Math.max(bracketBottom, thirdPlaceMatch ? thirdPlaceTop + 26 + SLOT_H + FOOT_H : 0) + PAD;

	$: connectors = (() => {
		const out: string[] = [];

		for (let r = 1; r < rounds.length; r += 1) {
			for (const node of rounds[r].matches) {
				const parentLeft = columnX(r);
				const parentCenter = centerOf(r, node.position);
				const childRight = columnX(r - 1) + MATCH_W;
				const midX = (childRight + parentLeft) / 2;

				for (const childPos of [node.position * 2, node.position * 2 + 1]) {
					const childCenter = centers[r - 1]?.[childPos];

					if (childCenter == null) {
						continue;
					}

					out.push(`M ${childRight} ${childCenter} H ${midX} V ${parentCenter} H ${parentLeft}`);
				}
			}
		}

		return out;
	})();

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

		return $_('tournament.bracket.round_of', { values: { count: 2 ** (totalRounds - roundIndex) } });
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

	function participantLabel(uid: string) {
		const participant = participants.find((entry) => entry.uid === uid);

		return participant
			? participant.contestSeed
				? `#${participant.contestSeed} ${participant.player?.name ?? uid}`
				: `${participant.player?.name ?? uid} (${participant.eloAtRegistration ?? 1500})`
			: uid;
	}

	function slotSelected(uid: string | null) {
		return uid
			? { value: uid, label: participantLabel(uid) }
			: { value: '', label: $_('tournament.bracket.bye') };
	}

	function hasFooter(node: any) {
		return Boolean(
			node.currentPvpMatchId
			|| (showActions && node.player1Uid && node.player2Uid)
		);
	}

	// Zoom, pan & fullscreen
	let viewport: HTMLDivElement;
	let zoom = 1;
	let dragging = false;
	let expanded = false;
	let sx = 0;
	let sy = 0;
	let sl = 0;
	let st = 0;

	const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

	function zoomIn() {
		zoom = clamp(Number((zoom + 0.2).toFixed(2)), 0.4, 2);
	}

	function zoomOut() {
		zoom = clamp(Number((zoom - 0.2).toFixed(2)), 0.4, 2);
	}

	function resetView() {
		zoom = 1;

		if (viewport) {
			viewport.scrollLeft = 0;
			viewport.scrollTop = 0;
		}
	}

	function onPointerDown(event: PointerEvent) {
		if (event.pointerType !== 'mouse' || event.button !== 0) {
			return;
		}

		const target = event.target as HTMLElement;

		if (target.closest('[data-no-pan]')) {
			return;
		}

		dragging = true;
		sx = event.clientX;
		sy = event.clientY;
		sl = viewport.scrollLeft;
		st = viewport.scrollTop;
	}

	function onPointerMove(event: PointerEvent) {
		if (!dragging) {
			return;
		}

		viewport.scrollLeft = sl - (event.clientX - sx);
		viewport.scrollTop = st - (event.clientY - sy);
	}

	function onPointerUp() {
		dragging = false;
	}

	function onWheel(event: WheelEvent) {
		if (!(event.ctrlKey || event.metaKey)) {
			return;
		}

		event.preventDefault();
		zoom = clamp(Number((zoom - event.deltaY * 0.002).toFixed(3)), 0.4, 2);
	}

	function onKey(event: KeyboardEvent) {
		if (expanded && event.key === 'Escape') {
			expanded = false;
		}
	}
</script>

<svelte:window on:keydown={onKey} />

{#if rounds.length}
  <div class={expanded ? 'fixed inset-0 z-50 flex flex-col bg-background p-[12px]' : 'relative'}>
    <div
      class={expanded
        ? 'mb-[8px] flex items-center justify-end gap-[4px]'
        : 'absolute right-[6px] top-[6px] z-20 flex items-center gap-[4px] rounded-[8px] border border-[hsl(var(--border))] bg-background/80 p-[4px] backdrop-blur'}
      data-no-pan
    >
      <Button size="icon" variant="ghost" class="h-[28px] w-[28px]" title={$_('tournament.bracket.zoom_out')} on:click={zoomOut}>
        <ZoomOut size={16} />
      </Button>
      <span class="w-[40px] text-center text-xs tabular-nums text-muted-foreground">{Math.round(zoom * 100)}%</span>
      <Button size="icon" variant="ghost" class="h-[28px] w-[28px]" title={$_('tournament.bracket.zoom_in')} on:click={zoomIn}>
        <ZoomIn size={16} />
      </Button>
      <Button size="icon" variant="ghost" class="h-[28px] w-[28px]" title={$_('tournament.bracket.reset_view')} on:click={resetView}>
        <RefreshCcw size={15} />
      </Button>
      <Button
        size="icon"
        variant="ghost"
        class="h-[28px] w-[28px]"
        title={expanded ? $_('tournament.bracket.exit_fullscreen') : $_('tournament.bracket.fullscreen')}
        on:click={() => (expanded = !expanded)}
      >
        {#if expanded}
          <Minimize2 size={16} />
        {:else}
          <Maximize2 size={16} />
        {/if}
      </Button>
    </div>

    <div
      bind:this={viewport}
      class={cn(
        'overflow-auto rounded-[10px] border border-[hsl(var(--border))] bg-muted/10',
        expanded ? 'flex-1' : 'max-h-[70vh]'
      )}
      class:cursor-grab={!dragging}
      class:cursor-grabbing={dragging}
      role="application"
      aria-label="Bracket"
      on:pointerdown={onPointerDown}
      on:pointermove={onPointerMove}
      on:pointerup={onPointerUp}
      on:pointerleave={onPointerUp}
      on:wheel={onWheel}
    >
      <div style={`width: ${treeWidth * zoom}px; height: ${treeHeight * zoom}px;`}>
        <div
          class="relative origin-top-left"
          style={`width: ${treeWidth}px; height: ${treeHeight}px; transform: scale(${zoom});`}
        >
          <svg
            class="pointer-events-none absolute left-0 top-0"
            width={treeWidth}
            height={treeHeight}
            style="overflow: visible;"
          >
            {#each connectors as path}
              <path d={path} fill="none" stroke="hsl(var(--border))" stroke-width="2" />
            {/each}
          </svg>

          {#each rounds as round, roundIndex}
            <div
              class="absolute text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground"
              style={`left: ${columnX(roundIndex)}px; top: ${PAD}px; width: ${MATCH_W}px;`}
            >
              {roundLabel(roundIndex, rounds.length)}
            </div>

            {#each round.matches as node (node.id ?? `${roundIndex}-${node.position}`)}
              <div
                class="absolute"
                style={`left: ${columnX(roundIndex)}px; top: ${centerOf(roundIndex, node.position) - SLOT_H / 2}px; width: ${MATCH_W}px;`}
              >
                <div class="overflow-hidden rounded-[8px] border border-[hsl(var(--border))] bg-card shadow-sm">
                  {#each [1, 2] as slot}
                    {@const player = slot === 1 ? node.player1 : node.player2}
                    {@const playerUid = slot === 1 ? node.player1Uid : node.player2Uid}
                    {@const score = slot === 1 ? node.score1 : node.score2}
                    {@const winner = isWinner(node, slot)}
                    <div
                      class={cn(
                        'flex h-[34px] items-center gap-[6px] border-l-2 px-[8px] text-sm',
                        slot === 2 && 'border-t border-t-[hsl(var(--border))]',
                        winner ? 'border-l-primary bg-primary/10 font-semibold' : 'border-l-transparent'
                      )}
                    >
                      {#if editable && roundIndex === 0}
                        <div class="flex min-w-0 flex-1 items-center gap-[5px]" data-no-pan>
                          {#if player}
                            <div class="min-w-0">
                              <PlayerLink
                                {player}
                                showAvatar
                                avatarSize={20}
                                truncate={24}
                                rankBadge={resolvePvpRankBadge(player)}
                              />
                            </div>
                          {:else}
                            <span class="min-w-0 flex-1 truncate opacity-40">{slotLabel(node, slot)}</span>
                          {/if}
                          <Select.Root
                            selected={slotSelected(playerUid)}
                            onSelectedChange={(value) =>
                              onSlotChange?.(node.position, slot === 1 ? 1 : 2, value?.value ? String(value.value) : null)}
                          >
                            <Select.Trigger
                              class="h-[30px] w-[28px] shrink-0 border-0 bg-transparent px-[4px] py-0 shadow-none focus:ring-0"
                              aria-label={playerUid ? participantLabel(playerUid) : $_('tournament.bracket.bye')}
                            >
                              <span class="sr-only">
                                {playerUid ? participantLabel(playerUid) : $_('tournament.bracket.bye')}
                              </span>
                            </Select.Trigger>
                            <Select.Content
                              sameWidth={false}
                              class="max-h-[260px] w-[280px] overflow-y-auto"
                            >
                              <Select.Item value="" label={$_('tournament.bracket.bye')}>
                                {$_('tournament.bracket.bye')}
                              </Select.Item>
                              {#each participants as participant}
                                <Select.Item value={participant.uid} label={participantLabel(participant.uid)}>
                                  {participantLabel(participant.uid)}
                                </Select.Item>
                              {/each}
                            </Select.Content>
                          </Select.Root>
                        </div>
                      {:else if player}
                        <PlayerLink
                          {player}
                          showAvatar
                          avatarSize={20}
                          truncate={22}
                          rankBadge={resolvePvpRankBadge(player)}
                        />
                      {:else}
                        <span class="opacity-40">{slotLabel(node, slot)}</span>
                      {/if}
                      {#if !editable || roundIndex !== 0}
                        <span class="ml-auto tabular-nums" class:text-primary={winner}>{score ?? 0}</span>
                      {/if}
                    </div>
                  {/each}
                </div>

                {#if hasFooter(node)}
                  <div class="mt-[2px] flex h-[26px] overflow-hidden rounded-[6px] border border-[hsl(var(--border))] bg-muted/40 text-xs" data-no-pan>
                    {#if node.currentPvpMatchId}
                      <a class="flex flex-1 items-center justify-center text-primary hover:bg-muted" href={`/versus/matches/${node.currentPvpMatchId}`}>
                        {$_('tournament.bracket.open_match')}
                      </a>
                    {:else if showActions && node.status === 'pending'}
                      <button class="flex-1 hover:bg-muted" on:click={() => onStart?.(node)}>
                        {$_('tournament.bracket.start_match')}
                      </button>
                    {/if}
                    {#if showActions && node.player1Uid && node.player2Uid}
                      <button class="flex-1 border-l border-[hsl(var(--border))] hover:bg-muted" on:click={() => onOverride?.(node)}>
                        {$_('tournament.bracket.edit_result')}
                      </button>
                    {/if}
                  </div>
                {/if}
              </div>
            {/each}
          {/each}

          {#if champion}
            <div class="absolute" style={`left: ${championX}px; top: ${finalsCenter - SLOT_H / 2}px; width: ${MATCH_W}px;`}>
              <div class="flex items-center gap-[3px] text-xs font-semibold text-amber-400" style="position: absolute; top: -22px;">
                <Crown size={14} />
                {$_('tournament.bracket.champion')}
              </div>
              <div class="flex h-[68px] items-center gap-[8px] rounded-[8px] border border-amber-400/60 bg-gradient-to-r from-amber-500/15 to-transparent px-[12px]">
                <Trophy size={18} class="shrink-0 text-amber-400" />
                <PlayerLink
                  player={champion}
                  showAvatar
                  avatarSize={24}
                  truncate={24}
                  rankBadge={resolvePvpRankBadge(champion)}
                />
              </div>
            </div>
          {/if}

          {#if thirdPlaceMatch}
            <div class="absolute" style={`left: ${finalsX}px; top: ${thirdPlaceTop}px; width: ${MATCH_W}px;`}>
              <div class="mb-[6px] text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {$_('tournament.bracket.third_place')}
              </div>
              <div class="overflow-hidden rounded-[8px] border border-orange-400/40 bg-card">
                {#each [1, 2] as slot}
                  {@const player = slot === 1 ? thirdPlaceMatch.player1 : thirdPlaceMatch.player2}
                  {@const score = slot === 1 ? thirdPlaceMatch.score1 : thirdPlaceMatch.score2}
                  {@const winner = isWinner(thirdPlaceMatch, slot)}
                  <div
                    class={cn(
                      'flex h-[34px] items-center gap-[6px] border-l-2 px-[8px] text-sm',
                      slot === 2 && 'border-t border-t-[hsl(var(--border))]',
                      winner ? 'border-l-orange-400 bg-orange-400/10 font-semibold' : 'border-l-transparent'
                    )}
                  >
                    {#if player}
                      <PlayerLink
                        {player}
                        showAvatar
                        avatarSize={20}
                        truncate={22}
                        rankBadge={resolvePvpRankBadge(player)}
                      />
                    {:else}
                      <span class="opacity-40">{slotLabel(thirdPlaceMatch, slot)}</span>
                    {/if}
                    <span class="ml-auto tabular-nums" class:text-orange-400={winner}>{score ?? 0}</span>
                  </div>
                {/each}
              </div>
            </div>
          {/if}
        </div>
      </div>
    </div>
  </div>
{/if}
