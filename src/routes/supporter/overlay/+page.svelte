<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { fade } from 'svelte/transition';
	import { Trophy } from 'lucide-svelte';
	import PlayerLink from '$lib/components/playerLink.svelte';

	export let data: any;

	let overlay = data.overlay;
	let latestEventId = overlay?.latestEvent?.id ?? null;
	let visibleEvent: any = null;
	let pollTimer: ReturnType<typeof setInterval> | null = null;
	let hideTimer: ReturnType<typeof setTimeout> | null = null;

	$: topSupporters = overlay?.topSupporters ?? [];

	function formatPrice(value: number) {
		return `${Math.round(value || 0)
			.toLocaleString('vi-VN')}vnd`;
	}

	function nameplateStyle(player: any) {
		const bgColor = player?.bgColor || 'rgba(255, 255, 255, 0.08)';
		const borderColor = player?.borderColor || 'rgba(255, 255, 255, 0.18)';
		const color = player?.bgColor ? '#ffffff' : 'inherit';

		return `background: ${bgColor}; border-color: ${borderColor}; color: ${color};`;
	}

	function playDonationSound() {
		if (typeof window === 'undefined') {
			return;
		}

		const audio = new Audio('/sounds/donation.mp3');
		audio.play()
			.catch(() => {
			// OBS/browser audio can be blocked until the source has interacted.
			});
	}

	function showEvent(event: any) {
		visibleEvent = event;

		if (hideTimer) {
			clearTimeout(hideTimer);
		}

		hideTimer = setTimeout(() => {
			visibleEvent = null;
		}, 15000);
	}

	async function refreshOverlay() {
		try {
			const response = await fetch(
				`${import.meta.env.VITE_API_URL}/donations/overlay`
			);

			if (!response.ok) {
				return;
			}

			const nextOverlay = await response.json();
			const nextEvent = nextOverlay?.latestEvent ?? null;
			const nextEventId = nextEvent?.id ?? null;

			if (nextEventId && nextEventId !== latestEventId) {
				await Promise.resolve();
				latestEventId = nextEventId;
				showEvent(nextEvent);
				playDonationSound();
			}

			overlay = nextOverlay;
		} catch {
		// OBS overlays should keep rendering the last good payload.
		}
	}

	onMount(() => {
		pollTimer = setInterval(refreshOverlay, 5000);
	});

	onDestroy(() => {
		if (pollTimer) {
			clearInterval(pollTimer);
		}

		if (hideTimer) {
			clearTimeout(hideTimer);
		}
	});
</script>

<svelte:head>
  <title>Overlay Ủng Hộ GDVN</title>
  <meta name="robots" content="noindex,nofollow" />
</svelte:head>

<main class="overlayShell">
  {#if visibleEvent}
    <section
      class="eventAlert"
      in:fade={{ duration: 350 }}
      out:fade={{ duration: 700 }}
    >
      {#if visibleEvent.player}
        <PlayerLink
          player={visibleEvent.player}
          showAvatar
          avatarSize={42}
          truncate={22}
        />
      {:else}
        <span>Người ủng hộ GDVN</span>
      {/if}
      {#if visibleEvent.type === 'supporter'}
        <span> đã trở thành Supporter trong </span>
        <span class="goldText">{visibleEvent.months ?? 1}</span>
        <span> tháng</span>
      {:else}
        <span> đã donate </span>
        <span class="goldText">{formatPrice(visibleEvent.amount ?? 0)}</span>
        {#if visibleEvent.message}
          <br />
          <span class="donationMessage">{visibleEvent.message}</span>
        {/if}
      {/if}
    </section>
  {/if}

  <aside class="topPanel">
    <div class="panelTitle">
      <Trophy size={18} />
      <span>Top Ủng Hộ</span>
    </div>
    <div class="supporterList">
      {#each topSupporters.slice(0, 3) as supporter, index}
        <div class="supporterRow">
          <div class="rank">#{index + 1}</div>
          <div class="supporterMeta">
            {#if supporter.player}
              <div class="nameplate" style={nameplateStyle(supporter.player)}>
                <PlayerLink
                  player={supporter.player}
                  showAvatar
                  avatarSize={34}
                  truncate={18}
                />
              </div>
            {:else}
              <strong>Người ủng hộ</strong>
            {/if}
            <small>{formatPrice(supporter.totalAmount ?? 0)}</small>
          </div>
        </div>
      {/each}
    </div>
  </aside>
</main>

<style lang="scss">
:global(html),
:global(body) {
  background: transparent !important;
}

.overlayShell {
  position: fixed;
  inset: 0;
  overflow: hidden;
  background: transparent;
  color: white;
  font-family: Roboto, Arial, sans-serif;
  pointer-events: none;
}

.eventAlert {
  position: absolute;
  left: 40px;
  bottom: 40px;
  width: min(780px, calc(100vw - 80px));
  color: white;
  font-size: 1.8rem;
  font-weight: 900;
  line-height: 1.35;
  text-align: center;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.9);
}

.eventAlert :global(.wrapper) {
  display: inline-flex;
  max-width: 340px;
  vertical-align: middle;
}

.eventAlert :global([data-popover-trigger]) {
  color: inherit;
  font: inherit;
}

.goldText {
  color: #fbbf24;
}

.donationMessage {
  display: block;
  margin-top: 8px;
  text-align: center;
  font-size: 1.15rem;
  font-weight: 400;
  line-height: 1.35;
}

.nameplate {
  display: flex;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  align-items: center;
  overflow: visible;
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 8px;
  padding: 4px 8px;
  color: white;
  font-weight: 900;
  line-height: 1.1;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.45);
}

.nameplate :global(.wrapper) {
  width: 100%;
  min-width: 0;
  overflow: visible;
}

.nameplate :global([data-popover-trigger]) {
  width: 100%;
  min-width: 0;
  overflow: hidden;
}

.nameplate :global([data-popover-trigger] > div) {
  width: 100%;
  min-width: 0;
}

.nameplate :global([data-popover-trigger] span) {
  min-width: 0;
  overflow: hidden;
  color: inherit;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.nameplate :global(a) {
  flex: 0 0 auto;
  color: inherit;
  white-space: nowrap;
}

.topPanel {
  position: absolute;
  top: 40px;
  right: 40px;
  width: 360px;
  padding: 16px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 8px;
  background: rgba(10, 14, 24, 0.74);
  box-shadow: 0 18px 50px rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(14px);
}

.panelTitle {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  color: #fbbf24;
  font-size: 0.92rem;
  font-weight: 900;
  text-transform: uppercase;
}

.supporterList {
  display: grid;
  gap: 10px;
}

.supporterRow {
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr);
  gap: 10px;
  align-items: center;
  min-height: 48px;
}

.rank {
  color: #fbbf24;
  font-size: 1.05rem;
  font-weight: 900;
}

.supporterMeta {
  min-width: 0;

  strong,
  small {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  strong {
    font-size: 1rem;
  }

  .nameplate {
    max-width: 100%;
    font-size: 0.98rem;
  }

  small {
    color: rgba(255, 255, 255, 0.68);
    font-size: 0.85rem;
    font-weight: 700;
  }
}

@media (max-width: 760px) {
  .eventAlert {
    left: 16px;
    right: 16px;
    bottom: 16px;
    width: auto;
    font-size: 1.25rem;
  }

  .topPanel {
    top: 16px;
    right: 16px;
    width: min(340px, calc(100vw - 32px));
  }
}
</style>
