<script lang="ts">
	import { _ } from 'svelte-i18n';
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Avatar from '$lib/components/ui/avatar';
	import PlayerLink from '$lib/components/playerLink.svelte';
	import { isActive } from '$lib/client/isSupporterActive';
	import { ArrowRight, Heart } from 'lucide-svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Skeleton } from '$lib/components/ui/skeleton';

	type SupporterProgress = {
		totalRevenue?: number;
		serverCostPercent: number;
		minecraftServerPercent: number;
		gdvnCupFundingPercent?: number;
		hcmGrandFinalsPercent?: number;
		hanoiQuarterfinalsPercent?: number;
	};

	type CupProgressKey = Extract<keyof SupporterProgress, `${string}Percent`>;

	export let topSupporters: any[] | null = null;
	export let serverProgress: SupporterProgress | null = null;

	const cupGoals: {
		labelKey: string;
		target: number;
		percentKey: CupProgressKey;
	}[] = [
		{
			labelKey: 'supporter.goals.gdvn_cup_funding',
			target: 10000000,
			percentKey: 'gdvnCupFundingPercent'
		},
		{
			labelKey: 'supporter.goals.hcm_grand_finals',
			target: 15000000,
			percentKey: 'hcmGrandFinalsPercent'
		},
		{
			labelKey: 'supporter.goals.hanoi_quarterfinals',
			target: 20000000,
			percentKey: 'hanoiQuarterfinalsPercent'
		}
	];
	const medalColors = ['text-yellow-500', 'text-gray-400', 'text-amber-600'];
	const isBannerFailedToLoad: boolean[] = [];

	$: totalRevenue = Number(serverProgress?.totalRevenue || 0);
	$: goals = cupGoals.map((goal) => ({
		...goal,
		percent: progressPercent(goal)
	}));

	function progressPercent(goal: (typeof cupGoals)[number]) {
		const apiPercent = serverProgress?.[goal.percentKey];

		if (typeof apiPercent === 'number') {
			return apiPercent;
		}

		return goal.target > 0
			? Math.min(100, Math.round((totalRevenue / goal.target) * 10000) / 100)
			: 0;
	}

	function toBarWidth(percent: number) {
		return `${Math.max(0, Math.min(100, percent))}%`;
	}

	function formatCompactVnd(amount: number) {
		return new Intl.NumberFormat('vi-VN', {
			notation: 'compact',
			compactDisplay: 'short',
			maximumFractionDigits: 1
		})
			.format(amount);
	}
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

    <!-- Server Progress -->
    {#if serverProgress}
      <div class="progressSection">
        <div class="progressRows">
          {#each goals as goal}
            <div class="progressRow">
              <div class="progressLabel">
                <span>{$_(goal.labelKey)}</span>
                <span class="progressPercent">{Math.round(goal.percent)}%</span>
              </div>
              <div class="progressMeta">
                <span>{formatCompactVnd(totalRevenue)}</span>
                <span>{formatCompactVnd(goal.target)}</span>
              </div>
              <div class="progressBar">
                <div
                  class="progressFill"
                  style={`width: ${toBarWidth(goal.percent)}`}
                >
                </div>
              </div>
            </div>
          {/each}
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

.progressSection {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.progressRows {
  flex: 1;
  display: grid;
  gap: 10px;
  min-width: 240px;
}

.progressRow {
  min-width: 0;
}

.progressLabel {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  font-size: 13px;
  margin-bottom: 6px;
  color: hsl(var(--muted-foreground));
}

.progressLabel span:first-child {
  min-width: 0;
}

.progressPercent {
  font-weight: 600;
  color: hsl(var(--foreground));
  white-space: nowrap;
}

.progressMeta {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  font-size: 12px;
  color: hsl(var(--muted-foreground) / 0.78);
  margin-top: -3px;
  margin-bottom: 5px;
}

.progressMeta span:last-child {
  white-space: nowrap;
}

.progressBar {
  height: 6px;
  border-radius: 3px;
  background: hsl(var(--muted));
  overflow: hidden;
}

.progressFill {
  height: 100%;
  border-radius: 3px;
  background: linear-gradient(90deg, hsl(330 70% 55%), hsl(340 80% 60%));
  transition: width 0.8s ease;
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
  .progressSection {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
