<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import {
		ArrowLeft,
		Check,
		Eye,
		EyeOff,
		Flag,
		Loader2,
		Pause,
		Play,
		RotateCcw,
		ShieldAlert,
		Shuffle,
		X
	} from 'lucide-svelte';
	import { _ } from 'svelte-i18n';

	export let title = '';
	export let backHref = '/versus/play';
	export let backLabel = '';
	export let loggedIn = false;
	export let loading = false;
	export let actionLoading = '';
	export let hideOpponentInfo = false;
	export let showOpponentInfoToggle = true;
	export let canRequeue = false;
	export let canRequestLevelChange = false;
	export let canRequestBanPickAbort = false;
	export let canAbortRoomMatch = false;
	export let canAbortAsManager = false;
	export let canControlTournamentMatch = false;
	export let matchPaused = false;
	export let canResign = false;
	export let canReport = false;
	export let reportSubmitted = false;

	export let onToggleOpponentInfo: () => void = () => {};
	export let onRequeue: () => void = () => {};
	export let onRequestLevelChange: () => void = () => {};
	export let onRequestBanPickAbort: () => void = () => {};
	export let onAbortRoomMatch: () => void = () => {};
	export let onAbortAsManager: () => void = () => {};
	export let onSetMatchPaused: (paused: boolean) => void = () => {};
	export let onResign: () => void = () => {};
	export let onReport: () => void = () => {};
</script>

<section class="match-topbar">
  <div>
    <a class="back-link" href={backHref}>
      <ArrowLeft class="h-4 w-4" />
      {backLabel || $_('pvp.lobby_title')}
    </a>
    <h1>{title}</h1>
  </div>

  {#if loggedIn}
    <div class="topbar-actions">
      {#if showOpponentInfoToggle}
        <Button
          variant="outline"
          aria-pressed={hideOpponentInfo}
          on:click={onToggleOpponentInfo}
        >
          {#if hideOpponentInfo}
            <Eye class="mr-2 h-4 w-4" />
            {$_('pvp.show_opponent_info')}
          {:else}
            <EyeOff class="mr-2 h-4 w-4" />
            {$_('pvp.hide_opponent_info')}
          {/if}
        </Button>
      {/if}

      {#if canRequeue}
        <Button
          disabled={Boolean(actionLoading) || loading}
          on:click={onRequeue}
        >
          {#if actionLoading === 'requeue'}
            <Loader2 class="mr-2 h-4 w-4 animate-spin" />
          {:else}
            <RotateCcw class="mr-2 h-4 w-4" />
          {/if}
          {$_('pvp.requeue')}
        </Button>
      {/if}

      {#if canRequestLevelChange}
        <Button
          variant="outline"
          disabled={Boolean(actionLoading) || loading}
          on:click={onRequestLevelChange}
        >
          {#if actionLoading === 'level-change'}
            <Loader2 class="mr-2 h-4 w-4 animate-spin" />
          {:else}
            <Shuffle class="mr-2 h-4 w-4" />
          {/if}
          {$_('pvp.request_level_change')}
        </Button>
      {/if}

      {#if canRequestBanPickAbort}
        <Button
          variant="destructive"
          disabled={Boolean(actionLoading) || loading}
          on:click={onRequestBanPickAbort}
        >
          {#if actionLoading === 'ban-pick-abort'}
            <Loader2 class="mr-2 h-4 w-4 animate-spin" />
          {:else}
            <X class="mr-2 h-4 w-4" />
          {/if}
          {$_('pvp.request_ban_pick_abort')}
        </Button>
      {/if}

      {#if canAbortRoomMatch}
        <Button
          variant="destructive"
          disabled={Boolean(actionLoading) || loading}
          on:click={onAbortRoomMatch}
        >
          {#if actionLoading === 'abort-room-match'}
            <Loader2 class="mr-2 h-4 w-4 animate-spin" />
          {:else}
            <X class="mr-2 h-4 w-4" />
          {/if}
          {$_('pvp.abort_room_match')}
        </Button>
      {/if}

      {#if canAbortAsManager}
        <Button
          variant="destructive"
          disabled={Boolean(actionLoading) || loading}
          on:click={onAbortAsManager}
        >
          {#if actionLoading === 'manager-abort-match'}
            <Loader2 class="mr-2 h-4 w-4 animate-spin" />
          {:else}
            <X class="mr-2 h-4 w-4" />
          {/if}
          {$_('pvp.manager_abort_match')}
        </Button>
      {/if}

      {#if canControlTournamentMatch}
        <Button
          variant={matchPaused ? 'default' : 'outline'}
          disabled={Boolean(actionLoading) || loading}
          on:click={() => onSetMatchPaused(!matchPaused)}
        >
          {#if actionLoading === 'pause-match' || actionLoading === 'unpause-match'}
            <Loader2 class="mr-2 h-4 w-4 animate-spin" />
          {:else if matchPaused}
            <Play class="mr-2 h-4 w-4" />
          {:else}
            <Pause class="mr-2 h-4 w-4" />
          {/if}
          {matchPaused ? $_('pvp.unpause_match') : $_('pvp.pause_match')}
        </Button>
      {/if}

      {#if canReport || reportSubmitted}
        <Button
          variant="outline"
          disabled={reportSubmitted || Boolean(actionLoading) || loading}
          on:click={onReport}
        >
          {#if reportSubmitted}
            <Check class="mr-2 h-4 w-4" />
            {$_('pvp.report.submitted')}
          {:else}
            <ShieldAlert class="mr-2 h-4 w-4" />
            {$_('pvp.report.button')}
          {/if}
        </Button>
      {/if}

      {#if canResign}
        <Button
          variant="destructive"
          disabled={Boolean(actionLoading) || loading}
          on:click={onResign}
        >
          {#if actionLoading === 'resign-match'}
            <Loader2 class="mr-2 h-4 w-4 animate-spin" />
          {:else}
            <Flag class="mr-2 h-4 w-4" />
          {/if}
          {$_('pvp.resign')}
        </Button>
      {/if}
    </div>
  {/if}
</section>

<style lang="scss">
.match-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 24px;
}

.topbar-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px;
}

h1 {
  margin: 6px 0 0;
  font-size: clamp(2rem, 4vw, 3.25rem);
  font-weight: 800;
  letter-spacing: 0;
}

.back-link {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: hsl(var(--primary));
  font-size: 14px;
  font-weight: 700;
  text-decoration: none;
}

.back-link:hover {
  text-decoration: underline;
}

@media (max-width: 640px) {
  .match-topbar {
    align-items: stretch;
    flex-direction: column;
  }

  .topbar-actions {
    justify-content: stretch;
  }

  .topbar-actions :global(button) {
    width: 100%;
  }
}
</style>
