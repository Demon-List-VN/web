<script lang="ts">
	import { _ } from 'svelte-i18n';
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Avatar from '$lib/components/ui/avatar';
	import PlayerLink from '$lib/components/playerLink.svelte';
	import { isActive } from '$lib/client/isSupporterActive';
	import { ArrowRight, Heart } from 'lucide-svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import {
		supporterPrizePool,
		supporterRevenueIntervalMs
	} from '$lib/client/supporterCampaign';
	import { onMount } from 'svelte';

	type SupporterProgress = {
		totalRevenue?: number | string | null;
	};

	export let topSupporters: any[] | null = null;

	const medalColors = ['text-yellow-500', 'text-gray-400', 'text-amber-600'];
	const isBannerFailedToLoad: boolean[] = [];
	let serverProgress: SupporterProgress | null = null;
	let progressLoading = true;

	$: parsedTotalRevenue = Number(serverProgress?.totalRevenue);
	$: totalRevenue = Number.isFinite(parsedTotalRevenue)
		? Math.max(0, parsedTotalRevenue)
		: 0;
	$: prizePool = supporterPrizePool(totalRevenue);

	function formatCompactVnd(amount: number) {
		return new Intl.NumberFormat('vi-VN', {
			notation: 'compact',
			compactDisplay: 'short',
			maximumFractionDigits: 1
		})
			.format(amount);
	}

	async function loadProgress() {
		try {
			const response = await fetch(
				`${import.meta.env.VITE_API_URL}/buyers/progress?interval=${supporterRevenueIntervalMs()}`
			);

			if (response.ok) {
				serverProgress = await response.json();
			}
		} catch {
		// Keep the supporter leaderboard usable if progress cannot be loaded.
		} finally {
			progressLoading = false;
		}
	}

	onMount(() => {
		void loadProgress();
	});
</script>

<section class="supporterProof">
  <div class="proofHeader">
    <div class="flex items-center gap-2">
      <Heart class="h-5 w-5 text-pink-500" />
      <h4>{$_('homepage.supporters.title')}</h4>
    </div>
    <a href="/supporter/top" class="viewAllBtn">
      {$_('homepage.supporters.view_leaderboard')}
      <ArrowRight class="ml-1 h-4 w-4" />
    </a>
  </div>

  <div class="proofBody">
    <!-- Top Supporters -->
    <div class="topSupportersSection">
      {#if topSupporters === null}
        {#each { length: 3 } as _}
          <Card.Root class="supporterCard">
            <Card.Content class="p-4 flex items-center gap-3">
              <Skeleton class="h-12 w-12 rounded-full" />
              <Skeleton class="h-4 w-24" />
            </Card.Content>
          </Card.Root>
        {/each}
      {:else if topSupporters.length > 0}
        {#each topSupporters.slice(0, 3) as buyer, index}
          <Card.Root
            class="supporterCard"
            style={isActive(buyer.player?.supporterUntil)
            ? `background-color: ${buyer.player.bgColor || ''}; border-color: ${
                buyer.player.borderColor || ''
            }; ${buyer.player.bgColor ? 'color: white' : ''}`
            : ''}
          >
            {#if isActive(buyer.player?.supporterUntil) && !isBannerFailedToLoad[index]}
              <img
                on:error={() => {
                    isBannerFailedToLoad[index] = true;
                }}
                class="absolute left-0 top-0 z-0 h-full w-full rounded-xl object-cover opacity-20"
                loading="lazy"
                decoding="async"
                src={`https://cdn.gdvn.net/banners/${buyer.player.uid}${
                    buyer.player.isBannerGif ? '.gif' : '.jpg'
                }?version=${buyer.player.bannerVersion}`}
                alt=""
              />
            {/if}
            <div class="absolute bottom-0 left-0 top-0 z-10 w-1.5 rounded-l-xl {index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : 'bg-amber-600'}">
            </div>
            <Card.Content class="relative z-10 flex items-center gap-3 p-3">
              <Avatar.Root class="h-10 w-10">
                <Avatar.Image
                  class="object-cover"
                  loading="lazy"
                  decoding="async"
                  src={`https://cdn.gdvn.net/avatars/${buyer.player.uid}${
                      isActive(buyer.player.supporterUntil) && buyer.player.isAvatarGif
                          ? '.gif'
                          : '.jpg'
                  }?version=${buyer.player.avatarVersion}`}
                  alt={buyer.player.name}
                />
                <Avatar.Fallback>{buyer.player.name[0]}</Avatar.Fallback>
              </Avatar.Root>
              <div class="flex items-center gap-2">
                <span class="text-base font-bold {medalColors[index]}">#{
                    index + 1
                  }</span>
                <PlayerLink player={buyer.player} />
              </div>
            </Card.Content>
          </Card.Root>
        {/each}
      {/if}
    </div>

    <!-- Prize Pool -->
    {#if progressLoading}
      <div class="prizeSection" aria-hidden="true">
        <div class="prizeCard">
          <Skeleton class="h-3 w-24" />
          <Skeleton class="mt-3 h-8 w-40" />
          <Skeleton class="mt-3 h-3 w-56" />
        </div>
      </div>
    {:else if serverProgress}
      <div class="prizeSection">
        <div class="prizeCard">
          <span class="prizeLabel">{$_('supporter.prize_pool.title')}</span>
          <strong>{formatCompactVnd(prizePool)}</strong>
          <span class="prizeNote">
            {$_('supporter.prize_pool.note', {
              values: { revenue: formatCompactVnd(totalRevenue) }
            })}
          </span>
        </div>
        <Button
          href="/supporter"
          variant="outline"
          size="sm"
          class="supportCta"
        >
          <Heart class="h-3.5 w-3.5 mr-1.5" />
          {$_('homepage.supporters.help_reach')}
        </Button>
      </div>
    {/if}
  </div>
</section>

<style lang="scss">
.supporterProof {
  padding: 0 50px;
}

.proofHeader {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 8px;

  h4 {
    font-weight: 600;
    font-size: 18px;
    margin: 0;
  }
}

.viewAllBtn {
  display: inline-flex;
  align-items: center;
  font-size: 14px;
  font-weight: 500;
  color: hsl(var(--muted-foreground));
  transition: color 0.2s;
  &:hover {
    color: hsl(var(--foreground));
  }
}

.proofBody {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.topSupportersSection {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 10px;
}

:global(.supporterCard) {
  position: relative !important;
  overflow: hidden !important;
  transition: all 0.2s !important;
  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  }
}

.prizeSection {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.prizeCard {
  flex: 1;
  display: grid;
  gap: 4px;
  min-width: 240px;
  padding: 14px 16px;
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
  background: hsl(var(--card));
}

.prizeLabel {
  color: hsl(var(--muted-foreground));
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0;
  text-transform: uppercase;
}

.prizeCard strong {
  color: hsl(var(--foreground));
  font-size: 2rem;
  font-weight: 800;
  line-height: 1.1;
  overflow-wrap: anywhere;
}

.prizeNote {
  font-size: 12px;
  color: hsl(var(--muted-foreground) / 0.78);
}

:global(.supportCta) {
  white-space: nowrap;
}

@media screen and (max-width: 768px) {
  .supporterProof {
    padding: 0 16px;
  }
  .topSupportersSection {
    grid-template-columns: 1fr;
  }
  .prizeSection {
    flex-direction: column;
    align-items: flex-start;
  }

  .prizeCard {
    width: 100%;
  }

  .prizeCard strong {
    font-size: 1.75rem;
  }
}
</style>
