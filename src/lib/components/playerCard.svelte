<script context="module" lang="ts">
	const playerCardSettingsCache = new Map<string, any>();

	export function clearPlayerCardSettingsCache(uid?: string) {
		if (uid) {
			playerCardSettingsCache.delete(uid);

			return;
		}

		playerCardSettingsCache.clear();
	}
</script>

<script lang="ts">
	import * as Avatar from '$lib/components/ui/avatar';
	import * as Tooltip from '$lib/components/ui/tooltip';
	import { getTitle } from '$lib/client';
	import { getPvpVisibleRatingLabel } from '$lib/client/pvp';
	import { badgeVariants } from '$lib/components/ui/badge';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import { getExpLevel } from '$lib/client/getExpLevel';
	import PlayerLevelBadge from '$lib/components/PlayerLevelBadge.svelte';
	import { isActive } from '$lib/client/isSupporterActive';
	import {
		getSupporterTier,
		getSupporterTierStyle
	} from '$lib/client/supporterTier';
	import type { PlayerRankedListSummary } from '$lib/types/playerRankedList';
	import {
		normalizePlayerCardStatLines,
		PLAYER_CARD_STAT_LINE_COUNT,
		resolveDefaultPlayerCardStatLineIds,
		resolvePlayerCardStatLineIds,
		shouldShowPlayerCardEloStat,
		shouldShowPlayerCardPvpEloStat
	} from '$lib/utils/playerCardStatLines';
	import {
		normalizeCustomListRankBadges,
		resolveCustomListRankBadge
	} from '$lib/utils/customListRank';
	import { _ } from 'svelte-i18n';

	export let player: any;
	export let listSummaries: PlayerRankedListSummary[] | null = null;
	export let active = true;

	let remoteSummaries: PlayerRankedListSummary[] = [];
	let hydratedPlayer: any = null;
	let isLoadingPlayerSettings = false;
	let isLoadingLists = false;
	let hasLoadedRemote = false;
	let listLoadFailed = false;
	let settingsLoadFailed = false;
	let lastPlayerUid = '';

	$: if (player?.uid !== lastPlayerUid) {
		lastPlayerUid = player?.uid || '';
		remoteSummaries = [];
		hydratedPlayer = playerCardSettingsCache.get(lastPlayerUid) ?? null;
		isLoadingPlayerSettings = false;
		isLoadingLists = false;
		hasLoadedRemote = false;
		listLoadFailed = false;
		settingsLoadFailed = false;
	}

	$: cardPlayer = hydratedPlayer ?? player;
	$: supporterTier = getSupporterTier(cardPlayer?.supporterUntil);
	$: supporterTierStyle = getSupporterTierStyle(supporterTier);
	$: hasKnownPlayerCardStatLines = Array.isArray(cardPlayer?.playerCardStatLines);
	$: exp = (cardPlayer?.exp ?? 0) + (cardPlayer?.extraExp ?? 0);
	$: expLevel = getExpLevel(exp);
	$: summaries = listSummaries ?? remoteSummaries;
	$: hasLoadedListSummaries = listSummaries !== null || hasLoadedRemote;
	$: configuredStatLineIds = hasKnownPlayerCardStatLines
		? normalizePlayerCardStatLines(cardPlayer?.playerCardStatLines)
		: [];
	$: defaultStatLineIds = resolveDefaultPlayerCardStatLineIds(summaries);
	$: showEloStat = shouldShowPlayerCardEloStat(cardPlayer?.overviewData);
	$: showPvpEloStat = shouldShowPlayerCardPvpEloStat(cardPlayer?.overviewData);
	$: contestEloValue = getContestEloValue(cardPlayer);
	$: isContestEloLoading = active
		&& Boolean(player?.uid)
		&& contestEloValue === null
		&& !settingsLoadFailed
		&& (isLoadingPlayerSettings
			|| (hydratedPlayer === null && !hasKnownPlayerCardStatLines));
	$: contestTitle = contestEloValue === null
		? null
		: getTitle('elo', cardPlayer);
	$: hasConfiguredStatLines = hasKnownPlayerCardStatLines
		&& configuredStatLineIds.length > 0;
	$: effectiveStatLineIds = resolvePlayerCardStatLineIds(
		hasConfiguredStatLines ? configuredStatLineIds : defaultStatLineIds,
		summaries
	);
	$: resolvedStatLines = effectiveStatLineIds
		.map((id) => resolvePlayerCardStatLine(id))
		.filter((line): line is NonNullable<typeof line> => line !== null);
	$: showStatLineSkeleton = active
		&& ((!hasKnownPlayerCardStatLines && !settingsLoadFailed)
			|| (Boolean(cardPlayer?.uid) && !hasLoadedListSummaries
				&& !listLoadFailed));
	$: statLineSkeletonCount = hasConfiguredStatLines
		? configuredStatLineIds.length
		: PLAYER_CARD_STAT_LINE_COUNT;
	$: statLineSkeletons = Array.from(
		{ length: statLineSkeletonCount },
		(_, index) => index
	);
	$: if (
		active
		&& player?.uid
		&& !hasKnownPlayerCardStatLines
		&& !isLoadingPlayerSettings
		&& !settingsLoadFailed
	) {
		void loadPlayerCardSettings(player.uid);
	}
	$: if (
		active
		&& listSummaries === null
		&& player?.uid
		&& !hasLoadedRemote
		&& !isLoadingLists
		&& !listLoadFailed
	) {
		void loadPlayerRankedLists(player.uid);
	}

	async function loadPlayerCardSettings(uid: string) {
		const cachedPlayer = playerCardSettingsCache.get(uid);

		if (cachedPlayer) {
			hydratedPlayer = cachedPlayer;

			return;
		}

		isLoadingPlayerSettings = true;

		try {
			const response = await fetch(
				`${import.meta.env.VITE_API_URL}/players/${uid}`
			);

			if (!response.ok) {
				throw new Error('Failed to load player card settings');
			}

			const loadedPlayer = { ...player, ...(await response.json()) };
			playerCardSettingsCache.set(uid, loadedPlayer);
			hydratedPlayer = loadedPlayer;
		} catch {
			settingsLoadFailed = true;
		} finally {
			isLoadingPlayerSettings = false;
		}
	}

	async function loadPlayerRankedLists(uid: string) {
		isLoadingLists = true;

		try {
			const response = await fetch(
				`${import.meta.env.VITE_API_URL}/players/${uid}/lists`
			);

			if (!response.ok) {
				throw new Error('Failed to load player ranked lists');
			}

			const summaries = await response.json();
			remoteSummaries = Array.isArray(summaries) ? summaries : [];
			hasLoadedRemote = true;
		} catch {
			listLoadFailed = true;
		} finally {
			isLoadingLists = false;
		}
	}

	function formatScore(value: number | null | undefined) {
		if (typeof value !== 'number' || !Number.isFinite(value)) {
			return '-';
		}

		return String(Math.round(value));
	}

	function formatRank(value: number | null | undefined) {
		return typeof value === 'number' && Number.isFinite(value) && value > 0
			? `#${value}`
			: null;
	}

	function resolvePlayerCardStatLine(listId: number) {
		const summary = summaries.find((entry) => entry.id === listId);

		if (!summary) {
			return null;
		}

		const badge = resolveCustomListRankBadge(
			summary,
			normalizeCustomListRankBadges(summary.rankBadges)
		);

		return {
			label: summary.title,
			value: formatScore(summary.score),
			rank: formatRank(summary.rank),
			valueStyle: badge ? `background: ${badge.color}; color: white;` : '',
			tooltip: badge?.name || null
		};
	}

	function getContestEloValue(player: any) {
		const value = player?.elo;

		return value === null || value === undefined || value === ''
			? null
			: String(value);
	}

	function shouldDimContestElo(player: any) {
		const matchCount = Number(player?.matchCount);

		return Number.isFinite(matchCount) && matchCount < 5;
	}

	function getOuterHeight(node: HTMLElement) {
		return node.getBoundingClientRect().height;
	}

	function animateCardResize(node: HTMLElement) {
		const content = node.firstElementChild as HTMLElement | null;

		if (!content || typeof ResizeObserver === 'undefined' || !node.animate) {
			return {};
		}

		const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
		let previousHeight = getOuterHeight(content);
		let animation: Animation | null = null;

		const observer = new ResizeObserver(() => {
			const nextHeight = getOuterHeight(content);

			if (
				reduceMotion.matches || previousHeight === 0
				|| Math.abs(nextHeight - previousHeight) < 1
			) {
				previousHeight = nextHeight;

				return;
			}

			animation?.cancel();
			animation = node.animate(
				[
					{ height: `${previousHeight}px` },
					{ height: `${nextHeight}px` }
				],
				{
					duration: 220,
					easing: 'cubic-bezier(0.22, 1, 0.36, 1)'
				}
			);
			previousHeight = nextHeight;
		});

		observer.observe(content);

		return {
			destroy() {
				animation?.cancel();
				observer.disconnect();
			}
		};
	}

	function getPvpRatingValue(player: any) {
		const value = player?.pvpRating ?? player?.pvp_rating ?? null;
		const numberValue = Number(value);

		return Number.isFinite(numberValue) ? Math.round(numberValue) : null;
	}

	function getPvpRatingDeviation(player: any) {
		const value = player?.pvpRatingDeviation ?? player?.pvp_rating_deviation
			?? null;
		const numberValue = Number(value);

		return Number.isFinite(numberValue) ? numberValue : null;
	}

	function formatPvpRating(player: any) {
		const rating = getPvpRatingValue(player);

		if (rating === null) {
			return '-';
		}

		const ratingDeviation = getPvpRatingDeviation(player);
		const label = getPvpVisibleRatingLabel(rating, ratingDeviation);

		return label ?? '-';
	}
</script>

<div class="playerCardFrame" use:animateCardResize>
<div
  class="playerCardRoot relative z-0 overflow-hidden rounded-md border-[1px] p-[12px]"
>
  <div class="hoverName">
    <div class="player-card-avatar-frame">
      <Avatar.Root>
        <Avatar.Image
          class="object-cover"
          src={`https://cdn.gdvn.net/avatars/${cardPlayer.uid}${
              isActive(cardPlayer.supporterUntil) && cardPlayer.isAvatarGif
                  ? '.gif'
                  : '.jpg'
          }`}
          alt=""
        />
        <Avatar.Fallback>{cardPlayer.name[0]}</Avatar.Fallback>
      </Avatar.Root>
      <PlayerLevelBadge player={cardPlayer} />
    </div>
    {#if cardPlayer.clan && isActive(cardPlayer.clans.boostedUntil)}
      <a
        href={`/clan/${cardPlayer.clan}`}
        class={`headerBadge ${badgeVariants({ variant: 'secondary' })}`}
        style={`background-color: ${cardPlayer.clans.tagBgColor}; color: ${cardPlayer.clans.tagTextColor};`}
      >{cardPlayer.clans.tag}</a>
    {/if}
    <h4 class="playerName font-semibold">
      <span
        class={isActive(cardPlayer.supporterUntil) ? 'supporter-tier-text' : ''}
        style={supporterTierStyle}
      >
        {#if cardPlayer.clan && !isActive(cardPlayer.clans.boostedUntil)}
          <a href={`/clan/${cardPlayer.clan}`}>[{cardPlayer.clans.tag}]</a>
        {/if}
        <a href={`/player/${cardPlayer.uid}`}>{cardPlayer.name}</a>
      </span>
    </h4>
  </div>
  <div class="content">
    <div class="rating">
      <div class="flex justify-center">
        <div class="leftCol">
          <b style={`color: ${expLevel.color};`}>Lv.{expLevel.level}</b>
        </div>
      </div>
      <div class="progressBar">
        <div
          class="progress"
          style={`width: ${expLevel.progress}%; background-color: ${expLevel.color};`}
        >
          <b>{expLevel.progress}%</b>
        </div>
      </div>
    </div>
    {#if showStatLineSkeleton}
      {#each statLineSkeletons as skeletonIndex (skeletonIndex)}
        <div class="rating">
          <div class="leftCol">
            <Skeleton class="h-[18px] w-[38px] rounded-[4px]" />
          </div>
          <div class="rankWrapper">
            <Skeleton class="h-[14px] w-24" />
            <Skeleton class="h-[14px] w-10 rounded-[4px]" />
          </div>
        </div>
      {/each}
    {:else}
      {#each resolvedStatLines as statLine}
        <div class="rating">
          {#if statLine.tooltip}
            <Tooltip.Root>
              <Tooltip.Trigger>
                <div class="leftCol">
                  <div class="title text-white" style={statLine.valueStyle}>
                    {statLine.value}
                  </div>
                </div>
              </Tooltip.Trigger>
              <Tooltip.Content>{statLine.tooltip}</Tooltip.Content>
            </Tooltip.Root>
          {:else}
            <div class="leftCol">
              <div class="title" style={statLine.valueStyle}>
                {statLine.value}
              </div>
            </div>
          {/if}
          <div class="rankWrapper">
            {statLine.label}
            {#if statLine.rank}
              <div class="rank">
                {statLine.rank}
              </div>
            {/if}
          </div>
        </div>
      {/each}
    {/if}

    {#if showEloStat}
      <div class="rating">
        {#if isContestEloLoading}
          <div class="leftCol">
            <Skeleton class="h-[18px] w-[38px] rounded-[4px]" />
          </div>
        {:else}
          <Tooltip.Root>
            <Tooltip.Trigger>
              <div class="leftCol">
                <div
                  class="title"
                  style={contestTitle?.color
                  ? `background-color: ${contestTitle.color}`
                  : ''}
                >
                  {#if shouldDimContestElo(cardPlayer) && contestEloValue !== null}
                    <span class="opacity-50">{contestEloValue}?</span>
                  {:else}
                    {contestEloValue ?? '-'}
                  {/if}
                </div>
              </div>
            </Tooltip.Trigger>
            {#if contestTitle?.fullTitle}
              <Tooltip.Content>{contestTitle.fullTitle}</Tooltip.Content>
            {/if}
          </Tooltip.Root>
        {/if}
        <div class="rankWrapper">{$_('player_card.contest')}</div>
      </div>
    {/if}
    {#if showPvpEloStat}
      <div class="rating">
        <div class="leftCol">
          <div class="title">
            {formatPvpRating(cardPlayer)}
          </div>
        </div>
        <div class="rankWrapper">{$_('player_card.pvp')}</div>
      </div>
    {/if}
  </div>
</div>
</div>

<style lang="scss">
.playerCardFrame {
  overflow: hidden;
}

.playerCardRoot {
  transition:
    background-color 260ms ease,
    border-color 260ms ease,
    color 260ms ease;
}

.progressBar {
  background-color: gray;
  width: 100%;
  border-radius: 10px;
  overflow: hidden;
  scale: 0.7;
  b {
    color: var(--textColorInverted);
    margin-right: 5px;
  }

  .progress {
    background-color: var(--textColor);
    text-align: right;
    border-radius: 10px;
  }
}

.wrapper {
  display: flex;
  align-items: center;
  gap: 7px;
}

.player-card-avatar-frame {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.leftCol {
  width: 38px;
  display: flex;
  justify-content: center;
}

.hoverName {
  display: flex;
  gap: 8px;
  align-items: center;
  padding-bottom: 8px;
}

.playerName {
  margin: 0;
  line-height: 1.1;
}

.headerBadge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}

.content {
  padding-top: 6px;
  display: grid;
  gap: 4px;
}

.rankWrapper {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;

  .rank {
    background-color: var(--textColor);
    color: var(--textColorInverted);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding-inline: 5px;
    min-height: 16px;
    border-radius: 4px;
    font-weight: 600;
    line-height: 1;
    font-size: 11px;
  }
}

.rating {
  .title {
    padding: 1px 5px;
    border-radius: 4px;
    font-weight: bold;
    font-size: 12px;
    line-height: 1.2;
    user-select: none;
    width: fit-content;
  }

  display: flex;
  gap: 6px;
  align-items: center;
  font-size: 12px;
  line-height: 1.2;
}

.lastRefreshed {
  font-size: 12px;
  opacity: 0.7;
}

.rank {
  color: white;
  font-size: 10px;
  width: fit-content;
  padding-inline: 5px;
  border-radius: 5px;
  font-weight: 600;
}

@media (prefers-reduced-motion: reduce) {
  .playerCardRoot {
    transition: none;
  }
}
</style>
