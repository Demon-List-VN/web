<script lang="ts">
	import PlayerLink from '$lib/components/playerLink.svelte';
	import { cn } from '$lib/utils.js';
	import { _ } from 'svelte-i18n';

	export let tournament: any;
	export let match: any;
	export let totalRounds = 0;
	export let gameIndex: number | null = null;

	function roundLabel() {
		if (match?.isThirdPlace) {
			return $_('tournament.bracket.third_place');
		}

		const fromEnd = totalRounds - Number(match?.round) + 1;

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

	function statusClass(status: string) {
		switch (status) {
			case 'completed':
				return 'completed';
			case 'in_progress':
				return 'live';
			case 'ready':
				return 'starting';
			default:
				return 'waiting';
		}
	}
</script>

<section class="tournament-match-score" aria-live="polite">
  <div class="score-meta">
    <span class="tournament-name">{tournament?.name}</span>
    <span aria-hidden="true">·</span>
    <strong>{roundLabel()}</strong>
    {#if !match?.isThirdPlace}
      <span>#{Number(match?.position ?? 0) + 1}</span>
    {/if}
    {#if gameIndex !== null}
      <span aria-hidden="true">·</span>
      <span>{$_('tournament.matches.overlay_game', { values: { game: gameIndex + 1 } })}</span>
    {/if}
    <span class={cn('status', statusClass(match?.status))}>
      {$_(`tournament.matches.status_${match?.status ?? 'waiting'}`)}
    </span>
  </div>

  <div class="score-row">
    <div class="player player-one">
      {#if match?.player1}
        <PlayerLink player={match.player1} showAvatar avatarSize={28} truncate={18} />
      {:else}
        <span class="pending">{$_('tournament.bracket.pending_player')}</span>
      {/if}
    </div>

    <div class="score" aria-label={$_('tournament.matches.overlay_series_score')}>
      <strong class:winner={match?.winnerUid && match?.winnerUid === match?.player1Uid}>
        {match?.score1 ?? 0}
      </strong>
      <span>-</span>
      <strong class:winner={match?.winnerUid && match?.winnerUid === match?.player2Uid}>
        {match?.score2 ?? 0}
      </strong>
    </div>

    <div class="player player-two">
      {#if match?.player2}
        <PlayerLink player={match.player2} showAvatar avatarSize={28} truncate={18} />
      {:else}
        <span class="pending">{$_('tournament.bracket.pending_player')}</span>
      {/if}
    </div>
  </div>
</section>

<style>
@font-face {
  font-family: "UTM Bebas";
  src: url("/UTM Bebas.ttf") format("truetype");
  font-display: swap;
}

.tournament-match-score {
  position: fixed;
  z-index: 40;
  top: 8px;
  left: 50%;
  width: min(820px, calc(100vw - 132px));
  min-width: 0;
  transform: translateX(-50%);
  overflow: hidden;
  border: 1px solid hsl(var(--border) / 0.9);
  border-radius: 12px;
  background: transparent;
  color: hsl(var(--foreground));
}

.score-meta {
  display: flex;
  height: 28px;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border-bottom: 1px solid hsl(var(--border) / 0.75);
  padding: 0 12px;
  color: hsl(var(--muted-foreground));
  font-size: 11px;
  line-height: 1;
  white-space: nowrap;
}

.tournament-name {
  max-width: 220px;
  overflow: hidden;
  color: hsl(var(--foreground));
  font-weight: 650;
  text-overflow: ellipsis;
}

.status {
  display: inline-flex;
  align-items: center;
  margin-left: 4px;
  border-radius: 999px;
  padding: 3px 7px;
  font-weight: 650;
}

.status.live {
  background: rgb(34 197 94 / 14%);
  color: rgb(34 197 94);
}

.status.starting,
.status.waiting {
  background: rgb(245 158 11 / 14%);
  color: rgb(245 158 11);
}

.status.completed {
  background: hsl(var(--muted));
  color: hsl(var(--muted-foreground));
}

.score-row {
  display: grid;
  height: 58px;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: center;
  gap: 14px;
  padding: 0 18px;
}

.player {
  display: flex;
  min-width: 0;
  align-items: center;
  font-size: 14px;
  font-weight: 650;
}

.player-one {
  justify-content: flex-end;
}

.player-two {
  justify-content: flex-start;
}

.score {
  display: grid;
  grid-template-columns: repeat(3, auto);
  align-items: center;
  justify-content: center;
  gap: 9px;
  text-align: center;
  font-family: "UTM Bebas", sans-serif;
  font-size: 24px;
  font-variant-numeric: tabular-nums;
}

.score span {
  color: #fff;
  font-size: 16px;
  font-weight: 700;
}

.score .winner {
  color: hsl(var(--primary));
}

.pending {
  overflow: hidden;
  color: hsl(var(--muted-foreground));
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 640px) {
  .tournament-match-score {
    left: 8px;
    width: calc(100vw - 76px);
    transform: none;
  }

  .score-meta {
    justify-content: flex-start;
    overflow: hidden;
  }

  .tournament-name {
    max-width: 120px;
  }

  .score-row {
    gap: 8px;
    padding: 0 10px;
  }

  .score {
    gap: 8px;
    font-size: 20px;
  }
}
</style>
