<script lang="ts" context="module">
	export type PvpRecentFormItem = {
		id: number | string | null;
		result: 'win' | 'loss';
		ratingDiff: number | null;
	};
</script>

<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import {
		ArrowRight,
		CalendarDays,
		Check,
		ChevronRight,
		Loader2,
		Swords,
		Target,
		Trophy
	} from 'lucide-svelte';
	import type { PvpMission, PvpWeeklyRacePlayer } from '$lib/client/pvp';

	export let dailyMissions: PvpMission[] = [];
	export let weeklyLoginMission: PvpMission | null = null;
	export let unclaimedCount = 0;
	export let claimingMissionKey = '';
	export let weeklyRaceSelf: PvpWeeklyRacePlayer | null = null;
	export let weeklyRaceEndsMs: number | null = null;
	export let recentForm: PvpRecentFormItem[] = [];
	export let winLoss: { wins: number; losses: number; } = { wins: 0, losses: 0 };
	export let now = Date.now();
	export let onClaimMission: (mission: PvpMission) => void | Promise<void> = () => {};
	export let onOpenMissions: () => void = () => {};
	export let onOpenRace: () => void = () => {};
	export let onOpenHistory: () => void = () => {};

	function percent(progress: number, target: number) {
		if (!target) {
			return 0;
		}

		return Math.max(0, Math.min(100, Math.round((progress / target) * 100)));
	}

	function remainingLabel(targetMs: number | null, currentNow: number) {
		if (!targetMs) {
			return '--';
		}

		const totalMinutes = Math.max(0, Math.floor((targetMs - currentNow) / 60_000));
		const days = Math.floor(totalMinutes / (24 * 60));
		const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
		const minutes = totalMinutes % 60;

		if (days > 0) {
			return `${days}d ${hours}h`;
		}

		if (hours > 0) {
			return `${hours}h ${minutes}m`;
		}

		return `${minutes}m`;
	}

	function ratingDiffLabel(value: number | null) {
		if (value === null || !Number.isFinite(value) || value === 0) {
			return '';
		}

		return value > 0 ? `+${value}` : `${value}`;
	}

	$: highlightMissions = [...dailyMissions]
		.sort((a, b) => {
			const aScore = a.claimable ? 0 : a.claimed ? 2 : 1;
			const bScore = b.claimable ? 0 : b.claimed ? 2 : 1;

			return aScore - bScore;
		})
		.slice(0, 2);
	$: countdownLabel = remainingLabel(weeklyRaceEndsMs, now);
</script>

<!-- Cards render as direct grid children of the parent .pvp-dashboard grid. -->

<Card.Root class="dashboard-card">
  <button type="button" class="dashboard-card-head" on:click={onOpenMissions}>
    <span class="dashboard-card-title">
      <Target class="h-4 w-4" />
      {$_('pvp.tabs.missions')}
      {#if unclaimedCount > 0}
        <span class="dashboard-badge">{unclaimedCount > 9 ? '9+' : unclaimedCount}</span>
      {/if}
    </span>
    <span class="dashboard-card-link">
      {$_('pvp.dashboard.view_all')}
      <ChevronRight class="h-4 w-4" />
    </span>
  </button>

  {#if weeklyLoginMission}
    <div class="weekly-login">
      <div class="weekly-login-top">
        <span class="weekly-login-label">
          <CalendarDays class="h-4 w-4" />
          {$_('pvp.dashboard.weekly_login')}
        </span>
        <strong class="weekly-login-count">
          {weeklyLoginMission.progress}/{weeklyLoginMission.target}
        </strong>
      </div>
      <div class="dashboard-progress">
        <span
          style={`width: ${percent(weeklyLoginMission.progress, weeklyLoginMission.target)}%`}
        ></span>
      </div>
      <small class="weekly-login-hint">
        {#if weeklyLoginMission.claimable}
          {$_('pvp.dashboard.weekly_login_claimable', {
            values: { xp: weeklyLoginMission.xp }
          })}
        {:else if weeklyLoginMission.claimed}
          {$_('pvp.dashboard.weekly_login_claimed')}
        {:else}
          {$_('pvp.dashboard.weekly_login_hint', {
            values: {
              days: Math.max(0, weeklyLoginMission.target - weeklyLoginMission.progress),
              xp: weeklyLoginMission.xp
            }
          })}
        {/if}
      </small>
    </div>
  {/if}

  <div class="mini-mission-list">
    {#each highlightMissions as mission (mission.key)}
      <div class="mini-mission" class:done={mission.claimed}>
        <div class="mini-mission-main">
          <div class="mini-mission-row">
            <strong>{$_(`pvp.missions.items.${mission.key}.title`)}</strong>
            <span class="mini-mission-xp">+{mission.xp} XP</span>
          </div>
          <div class="dashboard-progress sm">
            <span style={`width: ${percent(mission.progress, mission.target)}%`}></span>
          </div>
        </div>
        <Button
          size="sm"
          variant={mission.claimable ? 'default' : 'outline'}
          class="mini-mission-claim"
          disabled={!mission.claimable || claimingMissionKey === mission.key}
          on:click={() => onClaimMission(mission)}
        >
          {#if claimingMissionKey === mission.key}
            <Loader2 class="h-4 w-4 animate-spin" />
          {:else if mission.claimed}
            <Check class="h-4 w-4" />
          {:else if mission.claimable}
            {$_('pvp.missions.claim')}
          {:else}
            {percent(mission.progress, mission.target)}%
          {/if}
        </Button>
      </div>
    {:else}
      <p class="dashboard-empty">{$_('pvp.dashboard.missions_empty')}</p>
    {/each}
  </div>
</Card.Root>

<Card.Root class="dashboard-card">
  <button type="button" class="dashboard-card-head" on:click={onOpenRace}>
    <span class="dashboard-card-title">
      <Trophy class="h-4 w-4" />
      {$_('pvp.tabs.weekly_race')}
    </span>
    <span class="dashboard-card-link">
      {$_('pvp.dashboard.view_race')}
      <ChevronRight class="h-4 w-4" />
    </span>
  </button>

  {#if weeklyRaceSelf && (weeklyRaceSelf.points ?? 0) > 0}
    <div class="race-stats">
      <div class="race-rank">
        <span class="race-rank-value">
          {weeklyRaceSelf.rank ? `#${weeklyRaceSelf.rank}` : '--'}
        </span>
        <span class="race-rank-label">{$_('pvp.dashboard.your_rank')}</span>
      </div>
      <div class="race-meta">
        <div>
          <strong>{weeklyRaceSelf.points ?? 0}</strong>
          <span>{$_('pvp.weekly_race_points')}</span>
        </div>
        <div>
          <strong>{Math.round(weeklyRaceSelf.winrate ?? 0)}%</strong>
          <span>{$_('pvp.dashboard.winrate')}</span>
        </div>
      </div>
    </div>
  {:else}
    <p class="dashboard-empty">{$_('pvp.dashboard.race_empty')}</p>
  {/if}

  <div class="race-countdown">
    <CalendarDays class="h-4 w-4" />
    {$_('pvp.dashboard.race_ends_in', { values: { time: countdownLabel } })}
  </div>
</Card.Root>

<Card.Root class="dashboard-card">
  <button type="button" class="dashboard-card-head" on:click={onOpenHistory}>
    <span class="dashboard-card-title">
      <Swords class="h-4 w-4" />
      {$_('pvp.dashboard.recent_form')}
    </span>
    <span class="dashboard-card-link">
      {$_('pvp.dashboard.view_history')}
      <ChevronRight class="h-4 w-4" />
    </span>
  </button>

  <div class="form-record">
    <span class="form-record-win">{winLoss.wins}{$_('pvp.dashboard.wins_short')}</span>
    <span class="form-record-sep">/</span>
    <span class="form-record-loss">{winLoss.losses}{$_('pvp.dashboard.losses_short')}</span>
  </div>

  {#if recentForm.length}
    <div class="form-pills">
      {#each recentForm as item (item.id)}
        <span class="form-pill" class:win={item.result === 'win'} class:loss={item.result === 'loss'}>
          <span class="form-pill-result">
            {item.result === 'win' ? $_('pvp.dashboard.win_letter') : $_('pvp.dashboard.loss_letter')}
          </span>
          {#if ratingDiffLabel(item.ratingDiff)}
            <span class="form-pill-diff">{ratingDiffLabel(item.ratingDiff)}</span>
          {/if}
        </span>
      {/each}
    </div>
  {:else}
    <p class="dashboard-empty">{$_('pvp.dashboard.form_empty')}</p>
  {/if}

  <Button variant="outline" size="sm" class="form-history-button" on:click={onOpenHistory}>
    {$_('pvp.dashboard.view_history')}
    <ArrowRight class="ml-1 h-4 w-4" />
  </Button>
</Card.Root>

<style>
:global(.dashboard-card) {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 16px;
}

.dashboard-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
  padding: 0;
  border: none;
  background: none;
  color: inherit;
  text-align: left;
  cursor: pointer;
}

.dashboard-card-title {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-weight: 800;
  font-size: 15px;
}

.dashboard-badge {
  display: inline-grid;
  place-items: center;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  border-radius: 999px;
  background: rgb(34 197 94 / 0.16);
  color: rgb(22 163 74);
  font-size: 12px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}

.dashboard-card-link {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
  color: hsl(var(--muted-foreground));
  font-size: 13px;
  font-weight: 700;
  transition: color 0.15s ease;
}

.dashboard-card-head:hover .dashboard-card-link {
  color: hsl(var(--foreground));
}

.dashboard-progress {
  overflow: hidden;
  height: 8px;
  border-radius: 999px;
  background: hsl(var(--muted));
}

.dashboard-progress.sm {
  height: 6px;
}

.dashboard-progress span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: rgb(34 197 94);
}

.dashboard-empty {
  margin: 0;
  color: hsl(var(--muted-foreground));
  font-size: 13px;
  line-height: 1.5;
}

/* Weekly login */
.weekly-login {
  display: grid;
  gap: 6px;
  padding: 12px;
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
  background: hsl(var(--muted) / 0.35);
}

.weekly-login-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.weekly-login-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 700;
}

.weekly-login-count {
  font-variant-numeric: tabular-nums;
}

.weekly-login-hint {
  color: hsl(var(--muted-foreground));
  font-size: 12px;
  line-height: 1.4;
}

/* Mini missions */
.mini-mission-list {
  display: grid;
  gap: 10px;
}

.mini-mission {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
}

.mini-mission.done {
  opacity: 0.65;
}

.mini-mission-main {
  display: grid;
  gap: 6px;
  min-width: 0;
}

.mini-mission-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.mini-mission-row strong {
  overflow: hidden;
  font-size: 13px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mini-mission-xp {
  flex-shrink: 0;
  color: rgb(34 197 94);
  font-size: 12px;
  font-weight: 700;
}

:global(.mini-mission-claim) {
  min-width: 64px;
}

/* Weekly race */
.race-stats {
  display: flex;
  align-items: center;
  gap: 16px;
}

.race-rank {
  display: grid;
  gap: 2px;
}

.race-rank-value {
  font-size: 30px;
  font-weight: 900;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

.race-rank-label {
  color: hsl(var(--muted-foreground));
  font-size: 12px;
}

.race-meta {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  flex: 1;
}

.race-meta strong {
  display: block;
  font-size: 18px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}

.race-meta span {
  color: hsl(var(--muted-foreground));
  font-size: 12px;
}

.race-countdown {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: auto;
  color: hsl(var(--muted-foreground));
  font-size: 13px;
  font-weight: 600;
}

/* Recent form */
.form-record {
  display: flex;
  align-items: baseline;
  gap: 6px;
  font-size: 22px;
  font-weight: 900;
  font-variant-numeric: tabular-nums;
}

.form-record-win {
  color: rgb(34 197 94);
}

.form-record-loss {
  color: rgb(239 68 68);
}

.form-record-sep {
  color: hsl(var(--muted-foreground));
  font-weight: 600;
}

.form-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.form-pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 8px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.form-pill.win {
  background: rgb(34 197 94 / 0.14);
  color: rgb(22 163 74);
}

.form-pill.loss {
  background: rgb(239 68 68 / 0.14);
  color: rgb(220 38 38);
}

.form-pill-result {
  font-weight: 900;
}

.form-pill-diff {
  opacity: 0.85;
}

:global(.form-history-button) {
  margin-top: auto;
  width: 100%;
}
</style>
