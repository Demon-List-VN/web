<script lang="ts">
	import { createEventDispatcher, onDestroy, onMount } from 'svelte';
	import { getExpLevel } from '$lib/client/getExpLevel';
	import type { PvpXpAward } from '$lib/client/pvp';
	import { _ } from 'svelte-i18n';
	import { Trophy, X } from 'lucide-svelte';

	export let award: PvpXpAward;

	const dispatch = createEventDispatcher<{ closeToast: void; }>();
	const reasonLabelKeys: Record<string, string> = {
		pvp_match_win: 'player.xp_log.reasons.pvp_match_win',
		pvp_match_loss: 'player.xp_log.reasons.pvp_match_loss',
		pvp_mission_claim: 'player.xp_log.reasons.pvp_mission_claim',
		record_submission: 'player.xp_log.reasons.record_submission',
		record_submission_rejected: 'player.xp_log.reasons.record_submission_rejected',
		challenge_submission: 'player.xp_log.reasons.challenge_submission',
		challenge_submission_rejected: 'player.xp_log.reasons.challenge_submission_rejected',
		challenge_submission_accepted: 'player.xp_log.reasons.challenge_submission_accepted',
		record_manual_100: 'player.xp_log.reasons.record_manual_100'
	};
	let frame: number | null = null;
	let displayedXp = 0;
	let displayedDiff = 0;

	$: newXp = normalizeInteger(award?.newXp);
	$: diff = normalizeInteger(award?.diff);
	$: previousXp = Math.max(0, newXp - diff);
	$: currentLevel = getExpLevel(displayedXp);
	$: previousLevel = getExpLevel(previousXp);
	$: targetLevel = getExpLevel(newXp);
	$: levelChanged = targetLevel.level > previousLevel.level;

	onMount(() => {
		displayedXp = previousXp;
		displayedDiff = 0;

		const startedAt = performance.now();
		const durationMs = 1400;

		function animate(now: number) {
			const progress = Math.min(1, (now - startedAt) / durationMs);
			const eased = easeOutCubic(progress);

			displayedXp = Math.round(previousXp + (newXp - previousXp) * eased);
			displayedDiff = Math.round(diff * eased);

			if (progress < 1) {
				frame = requestAnimationFrame(animate);

				return;
			}

			displayedXp = newXp;
			displayedDiff = diff;
			frame = null;
		}

		frame = requestAnimationFrame(animate);
	});

	onDestroy(() => {
		if (frame !== null) {
			cancelAnimationFrame(frame);
		}
	});

	function normalizeInteger(value: unknown) {
		const parsed = Number(value);

		return Number.isFinite(parsed) ? Math.trunc(parsed) : 0;
	}

	function easeOutCubic(value: number) {
		return 1 - Math.pow(1 - value, 3);
	}

	function formatSigned(value: number) {
		return `${value > 0 ? '+' : ''}${value}`;
	}

	function formatProgress(value: number) {
		return value.toFixed(1)
			.replace(/\.0$/, '');
	}

	function reasonLabel(reason: unknown) {
		const key = String(reason || '')
			.trim();

		return $_(reasonLabelKeys[key] ?? 'player.xp_log.reasons.unknown');
	}
</script>

<div
  class="pvp-xp-toast"
  role="status"
  aria-live="polite"
>
  <div class="toast-header">
    <div class="toast-icon">
      <Trophy class="h-5 w-5" />
    </div>
    <div class="toast-title">
      <strong>{$_('pvp.xp_toast.title')}</strong>
      <span>{reasonLabel(award?.reason)}</span>
    </div>
    <button
      type="button"
      class="toast-close"
      aria-label={$_('general.close')}
      on:click={() => dispatch('closeToast')}
    >
      <X class="h-4 w-4" />
    </button>
  </div>

  <div class="xp-gain">
    <span>{formatSigned(displayedDiff)}</span>
    <small>XP</small>
  </div>

  <div class="level-meta">
    <span>{$_('pvp.xp_toast.level', { values: { level: currentLevel.level } })}</span>
    <span>{$_('pvp.xp_toast.total_xp', { values: { xp: displayedXp } })}</span>
  </div>

  <div class="xp-track" aria-hidden="true">
    <div class="xp-fill" style={`width: ${currentLevel.progress}%;`} />
  </div>

  <div class="toast-footer">
    {#if levelChanged}
      <span>
        {$_('pvp.xp_toast.level_up', { values: { level: targetLevel.level } })}
      </span>
    {:else}
      <span>
        {
          $_('pvp.xp_toast.progress', {
            values: { progress: formatProgress(currentLevel.progress) }
          })
        }
      </span>
    {/if}
    <span>
      {currentLevel.upperBound - displayedXp} {$_('player.exp_to_next')}
    </span>
  </div>
</div>

<style lang="scss">
.pvp-xp-toast {
  width: min(92vw, 390px);
  display: grid;
  gap: 12px;
  border: 1px solid hsl(var(--foreground) / 0.18);
  border-radius: 8px;
  background: hsl(var(--background));
  box-shadow: 0 18px 45px rgb(0 0 0 / 28%);
  color: hsl(var(--foreground));
  padding: 14px;
}

.toast-header,
.level-meta,
.toast-footer {
  display: flex;
  align-items: center;
}

.toast-header {
  gap: 10px;
}

.toast-icon {
  display: inline-flex;
  width: 36px;
  height: 36px;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: hsl(var(--foreground));
  color: hsl(var(--background));
}

.toast-title {
  display: grid;
  min-width: 0;
  flex: 1;
  gap: 2px;
}

.toast-title strong {
  font-size: 14px;
  line-height: 1.2;
}

.toast-title span,
.toast-footer,
.level-meta {
  color: hsl(var(--foreground) / 0.7);
  font-size: 12px;
}

.toast-close {
  display: inline-flex;
  width: 30px;
  height: 30px;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: hsl(var(--foreground) / 0.7);
  cursor: pointer;
}

.toast-close:hover {
  background: hsl(var(--foreground) / 0.1);
  color: hsl(var(--foreground));
}

.xp-gain {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 8px;
  color: hsl(var(--foreground));
}

.xp-gain span {
  font-size: 42px;
  font-weight: 850;
  line-height: 1;
}

.xp-gain small {
  font-size: 15px;
  font-weight: 800;
}

.level-meta,
.toast-footer {
  justify-content: space-between;
  gap: 12px;
}

.level-meta span:first-child {
  color: hsl(var(--foreground));
  font-weight: 700;
}

.toast-footer span:last-child {
  text-align: right;
}

.xp-track {
  height: 8px;
  overflow: hidden;
  border-radius: 999px;
  background: hsl(var(--foreground) / 0.14);
}

.xp-fill {
  height: 100%;
  border-radius: inherit;
  background: hsl(var(--foreground));
  transition: width 120ms linear;
}
</style>
