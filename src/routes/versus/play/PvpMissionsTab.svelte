<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import type { PvpMission } from '$lib/client/pvp';
	import { _ } from 'svelte-i18n';
	import {
		Check,
		Clock,
		Loader2,
		Lock,
		Sparkles,
		Target
	} from 'lucide-svelte';

	export let missions: PvpMission[] = [];
	export let loading = false;
	export let error = '';
	export let loggedIn = false;
	export let claimingMissionKey = '';
	export let onClaim: (mission: PvpMission) => void | Promise<void> = () => {};

	$: dailyMissions = missions.filter((mission) => mission.periodType === 'daily');
	$: weeklyMissions = missions.filter((mission) => mission.periodType === 'weekly');

	function percent(mission: PvpMission) {
		if (!mission.target) {
			return 0;
		}

		return Math.max(0, Math.min(100, Math.round((mission.progress / mission.target) * 100)));
	}

	function resetLabel(missionsForPeriod: PvpMission[]) {
		const resetAt = missionsForPeriod[0]?.resetAt;

		if (!resetAt) {
			return '';
		}

		return new Intl.DateTimeFormat(undefined, {
			weekday: 'short',
			hour: '2-digit',
			minute: '2-digit',
			timeZoneName: 'short'
		})
			.format(new Date(resetAt));
	}
</script>

<div class="missions-tab">
  {#if !loggedIn}
    <Card.Root class="mission-state">
      <Card.Content class="mission-state-content">
        <Lock class="h-5 w-5" />
        <span>{$_('pvp.missions.sign_in')}</span>
      </Card.Content>
    </Card.Root>
  {:else if loading}
    <div class="mission-loading">
      <Skeleton class="h-28 w-full" />
      <Skeleton class="h-28 w-full" />
      <Skeleton class="h-28 w-full" />
    </div>
  {:else if error}
    <Card.Root class="mission-state">
      <Card.Content class="mission-state-content">
        <Target class="h-5 w-5" />
        <span>{error}</span>
      </Card.Content>
    </Card.Root>
  {:else}
    <section class="mission-period">
      <div class="mission-period-heading">
        <div>
          <h2>{$_('pvp.missions.daily')}</h2>
          <span>
            <Clock class="h-4 w-4" />
            {$_('pvp.missions.resets_at', { values: { time: resetLabel(dailyMissions) } })}
          </span>
        </div>
      </div>
      <div class="mission-list">
        {#each dailyMissions as mission}
          <Card.Root
            class={`mission-card ${mission.completed && !mission.claimed ? 'complete' : ''} ${mission.claimed ? 'claimed' : ''}`}
          >
            <Card.Content class="mission-card-content">
              <div class="mission-icon">
                {#if mission.claimed}
                  <Check class="h-5 w-5" />
                {:else if mission.completed}
                  <Sparkles class="h-5 w-5" />
                {:else}
                  <Target class="h-5 w-5" />
                {/if}
              </div>
              <div class="mission-main">
                <div class="mission-title-row">
                  <strong>{$_(`pvp.missions.items.${mission.key}.title`)}</strong>
                  <span>+{mission.xp} XP</span>
                </div>
                <p>{$_(`pvp.missions.items.${mission.key}.description`)}</p>
                <div class="mission-progress">
                  <div>
                    <span style={`width: ${percent(mission)}%`}></span>
                  </div>
                  <small>{mission.progress}/{mission.target}</small>
                </div>
              </div>
              <Button
                class="mission-claim-button"
                disabled={!mission.claimable || claimingMissionKey === mission.key}
                variant={mission.claimed ? 'outline' : mission.claimable ? 'default' : 'outline'}
                on:click={() => onClaim(mission)}
              >
                {#if claimingMissionKey === mission.key}
                  <Loader2 class="mr-2 h-4 w-4 animate-spin" />
                  {$_('pvp.missions.claiming')}
                {:else if mission.claimed}
                  <Check class="mr-2 h-4 w-4" />
                  {$_('pvp.missions.claimed')}
                {:else if mission.claimable}
                  {$_('pvp.missions.claim')}
                {:else}
                  <Lock class="mr-2 h-4 w-4" />
                  {$_('pvp.missions.locked')}
                {/if}
              </Button>
            </Card.Content>
          </Card.Root>
        {/each}
      </div>
    </section>

    <section class="mission-period">
      <div class="mission-period-heading">
        <div>
          <h2>{$_('pvp.missions.weekly')}</h2>
          <span>
            <Clock class="h-4 w-4" />
            {$_('pvp.missions.resets_at', { values: { time: resetLabel(weeklyMissions) } })}
          </span>
        </div>
      </div>
      <div class="mission-list">
        {#each weeklyMissions as mission}
          <Card.Root
            class={`mission-card ${mission.completed && !mission.claimed ? 'complete' : ''} ${mission.claimed ? 'claimed' : ''}`}
          >
            <Card.Content class="mission-card-content">
              <div class="mission-icon">
                {#if mission.claimed}
                  <Check class="h-5 w-5" />
                {:else if mission.completed}
                  <Sparkles class="h-5 w-5" />
                {:else}
                  <Target class="h-5 w-5" />
                {/if}
              </div>
              <div class="mission-main">
                <div class="mission-title-row">
                  <strong>{$_(`pvp.missions.items.${mission.key}.title`)}</strong>
                  <span>+{mission.xp} XP</span>
                </div>
                <p>{$_(`pvp.missions.items.${mission.key}.description`)}</p>
                <div class="mission-progress">
                  <div>
                    <span style={`width: ${percent(mission)}%`}></span>
                  </div>
                  <small>{mission.progress}/{mission.target}</small>
                </div>
              </div>
              <Button
                class="mission-claim-button"
                disabled={!mission.claimable || claimingMissionKey === mission.key}
                variant={mission.claimed ? 'outline' : mission.claimable ? 'default' : 'outline'}
                on:click={() => onClaim(mission)}
              >
                {#if claimingMissionKey === mission.key}
                  <Loader2 class="mr-2 h-4 w-4 animate-spin" />
                  {$_('pvp.missions.claiming')}
                {:else if mission.claimed}
                  <Check class="mr-2 h-4 w-4" />
                  {$_('pvp.missions.claimed')}
                {:else if mission.claimable}
                  {$_('pvp.missions.claim')}
                {:else}
                  <Lock class="mr-2 h-4 w-4" />
                  {$_('pvp.missions.locked')}
                {/if}
              </Button>
            </Card.Content>
          </Card.Root>
        {/each}
      </div>
    </section>
  {/if}
</div>

<style>
.missions-tab {
  display: grid;
  gap: 24px;
}

.mission-loading {
  display: grid;
  gap: 12px;
}

:global(.mission-state) :global(.mission-state-content) {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 18px;
  color: hsl(var(--muted-foreground));
}

.mission-period {
  display: grid;
  gap: 12px;
}

.mission-period-heading {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.mission-period-heading h2 {
  margin: 0;
  font-size: 22px;
  font-weight: 700;
}

.mission-period-heading span {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: hsl(var(--muted-foreground));
  font-size: 13px;
}

.mission-list {
  display: grid;
  gap: 12px;
}

:global(.mission-card) {
  border-color: hsl(var(--border));
}

:global(.mission-card.complete) {
  border-color: rgb(34 197 94 / 0.5);
  background: rgb(34 197 94 / 0.06);
}

:global(.mission-card.claimed) {
  opacity: 0.72;
}

:global(.mission-card) :global(.mission-card-content) {
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr) 128px;
  align-items: center;
  gap: 14px;
  padding: 16px;
}

.mission-icon {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border-radius: 8px;
  background: hsl(var(--muted));
  color: hsl(var(--muted-foreground));
}

:global(.mission-card.complete) .mission-icon,
:global(.mission-card.claimed) .mission-icon {
  background: rgb(34 197 94 / 0.16);
  color: rgb(74 222 128);
}

.mission-main {
  display: grid;
  gap: 8px;
  min-width: 0;
}

.mission-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.mission-title-row strong {
  min-width: 0;
}

.mission-title-row span {
  flex: 0 0 auto;
  font-weight: 700;
  color: rgb(34 197 94);
}

.mission-main p {
  margin: 0;
  color: hsl(var(--muted-foreground));
  font-size: 14px;
}

.mission-progress {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
}

.mission-progress > div {
  overflow: hidden;
  height: 8px;
  border-radius: 999px;
  background: hsl(var(--muted));
}

.mission-progress span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: rgb(34 197 94);
}

.mission-progress small {
  color: hsl(var(--muted-foreground));
  font-variant-numeric: tabular-nums;
}

:global(.mission-claim-button) {
  width: 128px;
}

@media (max-width: 720px) {
  :global(.mission-card) :global(.mission-card-content) {
    grid-template-columns: 40px minmax(0, 1fr);
  }

  :global(.mission-claim-button) {
    grid-column: 1 / -1;
    width: 100%;
  }
}
</style>
