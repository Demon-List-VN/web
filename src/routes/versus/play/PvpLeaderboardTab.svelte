<script lang="ts">
	import PlayerLink from '$lib/components/playerLink.svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import * as Tabs from '$lib/components/ui/tabs';
	import type { PvpLeaderboardPlayer, PvpMode } from '$lib/client/pvp';
	import { _ } from 'svelte-i18n';
	import { RefreshCw, Trophy } from 'lucide-svelte';

	const PVP_MODES: PvpMode[] = ['classic', 'platformer'];

	export let leaderboard: PvpLeaderboardPlayer[] = [];
	export let mode: PvpMode = 'classic';
	export let loading = false;
	export let error = '';
	export let onModeChange: (mode: PvpMode) => void | Promise<void>;
	export let onRefresh: () => void | Promise<void>;
</script>

<section class="leaderboard-section">
  <Card.Root>
    <Card.Header>
      <div class="section-heading inside">
        <div>
          <Card.Title class="leaderboard-title">
            <Trophy class="h-5 w-5" />
            {$_('pvp.leaderboard.title')}
          </Card.Title>
          <Card.Description>{
            $_('pvp.leaderboard.description')
          }</Card.Description>
        </div>
        <Button
          variant="ghost"
          size="icon"
          disabled={loading}
          on:click={() => onRefresh?.()}
          aria-label={$_('pvp.refresh')}
        >
          <RefreshCw class={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>
    </Card.Header>
    <Card.Content>
      <Tabs.Root value={mode}>
        <Tabs.List class="mode-filter-list" aria-label={$_('pvp.mode_label')}>
          {#each PVP_MODES as nextMode}
            <Tabs.Trigger
              value={nextMode}
              class="mode-filter-trigger"
              on:click={() => onModeChange?.(nextMode)}
            >
              {$_(`pvp.mode.${nextMode}`)}
            </Tabs.Trigger>
          {/each}
        </Tabs.List>
      </Tabs.Root>
      {#if loading}
        <div class="leaderboard-skeleton" aria-label={$_('general.loading')}>
          <div></div>
          <div></div>
          <div></div>
        </div>
      {:else if error}
        <div class="empty-state">{error}</div>
      {:else if leaderboard.length === 0}
        <div class="empty-state">{$_('pvp.leaderboard.empty')}</div>
      {:else}
        <div
          class="leaderboard-table"
          role="table"
          aria-label={$_('pvp.leaderboard.title')}
        >
          <div class="leaderboard-row leaderboard-head" role="row">
            <span role="columnheader">{$_('pvp.leaderboard.rank')}</span>
            <span role="columnheader">{$_('pvp.leaderboard.player')}</span>
            <span role="columnheader">{$_('pvp.leaderboard.rating')}</span>
            <span role="columnheader">{$_('pvp.leaderboard.matches')}</span>
          </div>
          {#each leaderboard as player}
            <div class="leaderboard-row" role="row">
              <span class="leaderboard-rank" role="cell">#{player.rank}</span>
              <span class="leaderboard-player" role="cell">
                <PlayerLink {player} showAvatar truncate={28} />
              </span>
              <span class="leaderboard-rating" role="cell">{
                player.pvpRating
              }</span>
              <span role="cell">{player.pvpRatedMatchCount}</span>
            </div>
          {/each}
        </div>
      {/if}
    </Card.Content>
  </Card.Root>
</section>

<style>
.leaderboard-section {
  margin-bottom: 20px;
}

.section-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.section-heading.inside {
  margin: 0;
}

:global(.leaderboard-title) {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

:global(.mode-filter-list) {
  display: inline-grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  width: auto;
  height: auto;
  min-width: 220px;
  margin-bottom: 16px;
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
  background: hsl(var(--muted) / 0.28);
  padding: 3px;
}

:global(.mode-filter-trigger) {
  min-height: 32px;
  padding-inline: 12px;
}

.leaderboard-table {
  display: grid;
  overflow: hidden;
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
}

.leaderboard-row {
  display: grid;
  grid-template-columns: 80px minmax(0, 1fr) 110px 120px;
  align-items: center;
  gap: 12px;
  min-height: 50px;
  border-top: 1px solid hsl(var(--border));
  padding: 10px 14px;
}

.leaderboard-row:first-child {
  border-top: 0;
}

.leaderboard-head {
  min-height: 38px;
  background: hsl(var(--muted) / 0.35);
  color: hsl(var(--muted-foreground));
  font-size: 12px;
  font-weight: 750;
  text-transform: uppercase;
}

.leaderboard-rank {
  color: hsl(var(--muted-foreground));
  font-weight: 750;
}

.leaderboard-player {
  min-width: 0;
}

.leaderboard-rating {
  color: hsl(var(--foreground));
  font-size: 1rem;
  font-weight: 750;
}

.leaderboard-skeleton {
  display: grid;
  gap: 10px;
}

.leaderboard-skeleton div {
  height: 50px;
  border-radius: 8px;
  background: linear-gradient(
    90deg,
    hsl(var(--muted) / 0.45),
    hsl(var(--muted) / 0.22),
    hsl(var(--muted) / 0.45)
  );
  background-size: 200% 100%;
  animation: pvp-skeleton 1.2s ease-in-out infinite;
}

.empty-state {
  display: flex;
  align-items: center;
  min-height: 72px;
  color: hsl(var(--muted-foreground));
  font-size: 13px;
}

@keyframes pvp-skeleton {
  from {
    background-position: 200% 0;
  }

  to {
    background-position: -200% 0;
  }
}

@media (max-width: 640px) {
  .leaderboard-row {
    grid-template-columns: 54px minmax(0, 1fr) 76px;
  }

  .leaderboard-row > :nth-child(4) {
    display: none;
  }
}
</style>
