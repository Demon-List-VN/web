<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { Trophy, HeartHandshake } from 'lucide-svelte';
	import { isActive } from '$lib/client/isSupporterActive';

	export let data: any;

	let overlay = data.overlay;
	let latestDonationId = overlay?.latestDonation?.id ?? null;
	let highlightDonation = false;
	let pollTimer: ReturnType<typeof setInterval> | null = null;

	$: latestDonation = overlay?.latestDonation ?? null;
	$: topSupporters = overlay?.topSupporters ?? [];

	function formatPrice(value: number) {
		return `${Math.round(value || 0)
			.toLocaleString('vi-VN')}₫`;
	}

	function avatarUrl(player: any) {
		const extension = isActive(player?.supporterUntil) && player?.isAvatarGif
			? 'gif'
			: 'jpg';

		return `https://cdn.gdvn.net/avatars/${player.uid}.${extension}?version=${player.avatarVersion}`;
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
			const nextDonationId = nextOverlay?.latestDonation?.id ?? null;

			if (nextDonationId && nextDonationId !== latestDonationId) {
				highlightDonation = false;
				await Promise.resolve();
				highlightDonation = true;
				latestDonationId = nextDonationId;
				setTimeout(() => {
					highlightDonation = false;
				}, 5200);
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
	});
</script>

<svelte:head>
  <title>GDVN Supporter Overlay</title>
  <meta name="robots" content="noindex,nofollow" />
</svelte:head>

<main class="overlayShell">
  {#if latestDonation}
    <section class:pop={highlightDonation} class="latestDonation">
      <div class="donationIcon">
        <HeartHandshake size={28} />
      </div>
      <div class="donationText">
        <span>New support</span>
        <strong>{latestDonation.player?.name ?? 'GDVN Supporter'}</strong>
        <small>{formatPrice(latestDonation.amount)}</small>
        {#if latestDonation.message}
          <p>{latestDonation.message}</p>
        {/if}
      </div>
    </section>
  {/if}

  <aside class="topPanel">
    <div class="panelTitle">
      <Trophy size={18} />
      <span>Top Supporters</span>
    </div>
    <div class="supporterList">
      {#each topSupporters.slice(0, 3) as supporter, index}
        <div class="supporterRow">
          <div class="rank">#{index + 1}</div>
          {#if supporter.player}
            <img src={avatarUrl(supporter.player)} alt="" />
          {/if}
          <div class="supporterMeta">
            <strong>{supporter.player?.name ?? 'Supporter'}</strong>
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

.latestDonation {
  position: absolute;
  left: 40px;
  bottom: 40px;
  display: grid;
  grid-template-columns: 58px minmax(0, 1fr);
  width: min(560px, calc(100vw - 80px));
  min-height: 104px;
  gap: 16px;
  align-items: center;
  padding: 18px 20px;
  border: 1px solid rgba(255, 255, 255, 0.22);
  border-radius: 8px;
  background: rgba(10, 14, 24, 0.82);
  box-shadow: 0 18px 50px rgba(0, 0, 0, 0.38);
  backdrop-filter: blur(14px);
}

.latestDonation.pop {
  animation: donationPop 5.2s ease both;
}

.donationIcon {
  display: grid;
  width: 58px;
  height: 58px;
  place-items: center;
  border-radius: 8px;
  background: linear-gradient(135deg, #f59e0b, #ec4899);
}

.donationText {
  min-width: 0;

  span,
  small {
    display: block;
    color: rgba(255, 255, 255, 0.72);
    font-size: 0.9rem;
    font-weight: 700;
    text-transform: uppercase;
  }

  strong {
    display: block;
    overflow: hidden;
    color: white;
    font-size: 1.75rem;
    line-height: 1.1;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  p {
    display: -webkit-box;
    margin-top: 6px;
    overflow: hidden;
    color: rgba(255, 255, 255, 0.9);
    font-size: 1rem;
    line-height: 1.3;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    line-clamp: 2;
  }
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
  grid-template-columns: 44px 42px minmax(0, 1fr);
  gap: 10px;
  align-items: center;
  min-height: 48px;
}

.rank {
  color: #fbbf24;
  font-size: 1.05rem;
  font-weight: 900;
}

.supporterRow img {
  width: 42px;
  height: 42px;
  border: 2px solid rgba(255, 255, 255, 0.22);
  border-radius: 50%;
  object-fit: cover;
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

  small {
    color: rgba(255, 255, 255, 0.68);
    font-size: 0.85rem;
    font-weight: 700;
  }
}

@keyframes donationPop {
  0% {
    opacity: 0;
    transform: translateX(-30px) translateY(14px) scale(0.96);
  }
  12%,
  88% {
    opacity: 1;
    transform: translateX(0) translateY(0) scale(1);
  }
  100% {
    opacity: 0.9;
    transform: translateX(0) translateY(0) scale(1);
  }
}

@media (max-width: 760px) {
  .latestDonation {
    left: 16px;
    right: 16px;
    bottom: 16px;
    width: auto;
  }

  .topPanel {
    top: 16px;
    right: 16px;
    width: min(340px, calc(100vw - 32px));
  }
}
</style>
