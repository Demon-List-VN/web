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
	import { badgeVariants } from '$lib/components/ui/badge';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import { getExpLevel } from '$lib/client/getExpLevel';
	import { isActive } from '$lib/client/isSupporterActive';
	import { getSupporterTier, getSupporterTierStyle } from '$lib/client/supporterTier';
	import type { PlayerRankedListSummary } from '$lib/types/playerRankedList';
	import {
		DEFAULT_PLAYER_CARD_STAT_LINE_SLUGS,
		normalizePlayerCardStatLines,
		resolvePlayerCardStatLineIds,
		shouldShowPlayerCardEloStat,
		shouldShowPlayerCardPvpEloStat,
		type DefaultPlayerCardStatLineSlug
	} from '$lib/utils/playerCardStatLines';
	import {
		normalizeCustomListRankBadges,
		resolveCustomListRankBadge
	} from '$lib/utils/customListRank';
	import { _ } from 'svelte-i18n';

	export let player: any;
	export let listSummaries: PlayerRankedListSummary[] | null = null;
	export let active = true;

	let isBannerFailedToLoad = false;
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
	$: configuredStatLineIds = hasKnownPlayerCardStatLines
		? normalizePlayerCardStatLines(cardPlayer?.playerCardStatLines)
		: [];
	$: showEloStat = shouldShowPlayerCardEloStat(cardPlayer?.overviewData);
	$: showPvpEloStat = shouldShowPlayerCardPvpEloStat(cardPlayer?.overviewData);
	$: hasConfiguredStatLines = hasKnownPlayerCardStatLines && configuredStatLineIds.length > 0;
	$: effectiveStatLineIds = resolvePlayerCardStatLineIds(configuredStatLineIds, summaries);
	$: resolvedStatLines = hasConfiguredStatLines
		? effectiveStatLineIds
				.map((id) => resolvePlayerCardStatLine(id))
				.filter((line): line is NonNullable<typeof line> => line !== null)
		: DEFAULT_PLAYER_CARD_STAT_LINE_SLUGS.map((slug) => resolveDefaultPlayerCardStatLine(slug, $_));
	$: showStatLineSkeleton =
		active &&
		((!hasKnownPlayerCardStatLines && !settingsLoadFailed) ||
			(hasConfiguredStatLines && listSummaries === null && !hasLoadedRemote && !listLoadFailed));
	$: statLineSkeletonCount = hasConfiguredStatLines
		? configuredStatLineIds.length
		: DEFAULT_PLAYER_CARD_STAT_LINE_SLUGS.length;
	$: statLineSkeletons = Array.from({ length: statLineSkeletonCount }, (_, index) => index);
	$: if (
		active &&
		player?.uid &&
		!hasKnownPlayerCardStatLines &&
		!isLoadingPlayerSettings &&
		!settingsLoadFailed
	) {
		void loadPlayerCardSettings(player.uid);
	}
	$: if (
		active &&
		hasConfiguredStatLines &&
		listSummaries === null &&
		cardPlayer?.uid &&
		!hasLoadedRemote &&
		!isLoadingLists &&
		!listLoadFailed
	) {
		void loadPlayerRankedLists(cardPlayer.uid);
	}

	async function loadPlayerCardSettings(uid: string) {
		const cachedPlayer = playerCardSettingsCache.get(uid);

		if (cachedPlayer) {
			hydratedPlayer = cachedPlayer;
			return;
		}

		isLoadingPlayerSettings = true;

		try {
			const response = await fetch(`${import.meta.env.VITE_API_URL}/players/${uid}`);

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
			const response = await fetch(`${import.meta.env.VITE_API_URL}/players/${uid}/lists`);
			remoteSummaries = await response.json();
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
		return typeof value === 'number' && Number.isFinite(value) && value > 0 ? `#${value}` : null;
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

	function resolveDefaultPlayerCardStatLine(
		slug: DefaultPlayerCardStatLineSlug,
		translate: (id: string) => string
	) {
		switch (slug) {
			case 'pl':
				return {
					label: translate('player_card.plat_rating'),
					value: formatScore(cardPlayer?.plRating ?? 0),
					rank: formatRank(cardPlayer?.plrank),
					valueStyle: '',
					tooltip: null
				};
			case 'cl':
				return {
					label: translate('player_card.challenge_rating'),
					value: formatScore(cardPlayer?.clRating ?? 0),
					rank: formatRank(cardPlayer?.clrank),
					valueStyle: '',
					tooltip: null
				};
			case 'fl':
				return {
					label: translate('player_card.featured'),
					value: formatScore(cardPlayer?.totalFLpt ?? 0),
					rank: formatRank(cardPlayer?.flrank),
					valueStyle: '',
					tooltip: null
				};
			case 'dl':
			default:
				return {
					label: translate('player_card.rating'),
					value: formatScore(cardPlayer?.rating ?? cardPlayer?.totalDLpt ?? 0),
					rank: formatRank(cardPlayer?.overallRank ?? cardPlayer?.dlrank),
					valueStyle: '',
					tooltip: null
				};
		}
	}

	function getPvpRatingValue(player: any) {
		const value = player?.pvpRating ?? player?.pvp_rating ?? null;
		const numberValue = Number(value);

		return Number.isFinite(numberValue) ? Math.round(numberValue) : null;
	}

	function getPvpRatedMatchCount(player: any) {
		const value = player?.pvpRatedMatchCount ?? player?.pvp_rated_match_count ?? null;
		const numberValue = Number(value);

		return Number.isFinite(numberValue) ? numberValue : null;
	}

	function formatPvpRating(player: any) {
		const rating = getPvpRatingValue(player);

		if (rating === null) return '-';

		const matchCount = getPvpRatedMatchCount(player);
		return `${rating}${matchCount !== null && matchCount < 5 ? '?' : ''}`;
	}
</script>

<div
	class="relative z-0 overflow-hidden rounded-md border-[1px] p-[12px]"
	style={cardPlayer.bgColor || cardPlayer.borderColor
		? `background-color: ${cardPlayer.bgColor}; border-color: ${cardPlayer.borderColor}; ${cardPlayer.bgColor ? 'color: white' : ''}`
		: ''}
>
	{#if isActive(cardPlayer.supporterUntil) && !isBannerFailedToLoad}
		<img
			on:error={() => {
				isBannerFailedToLoad = true;
			}}
			class="bgGradient absolute top-[42px] z-[-1] ml-[-12px] h-[72px] w-[calc(100%+24px)] rounded object-cover"
			src={`https://cdn.gdvn.net/banners/${cardPlayer.uid}${cardPlayer.isBannerGif ? '.gif' : '.jpg'}`}
			alt=""
		/>
	{/if}
	<div class="hoverName">
		<Avatar.Root>
			<Avatar.Image
				class="object-cover"
				src={`https://cdn.gdvn.net/avatars/${cardPlayer.uid}${
					isActive(cardPlayer.supporterUntil) && cardPlayer.isAvatarGif ? '.gif' : '.jpg'
				}`}
				alt=""
			/>
			<Avatar.Fallback>{cardPlayer.name[0]}</Avatar.Fallback>
		</Avatar.Root>
		{#if cardPlayer.clan && isActive(cardPlayer.clans.boostedUntil)}
			<a
				href={`/clan/${cardPlayer.clan}`}
				class={`headerBadge ${badgeVariants({ variant: 'secondary' })}`}
				style={`background-color: ${cardPlayer.clans.tagBgColor}; color: ${cardPlayer.clans.tagTextColor};`}
				>{cardPlayer.clans.tag}</a
			>
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
					<b>Lv.{expLevel.level}</b>
				</div>
			</div>
			<div class="progressBar">
				<div class="progress" style={`width: ${expLevel.progress}%`}>
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
				<Tooltip.Root>
					<Tooltip.Trigger>
						<div class="leftCol">
							<div class="title" style={`background-color: ${getTitle('elo', cardPlayer)?.color}`}>
								{#if cardPlayer.matchCount < 5}
									<span class="opacity-50">{`${cardPlayer.elo}?`}</span>
								{:else}
									{cardPlayer.elo}
								{/if}
							</div>
						</div>
					</Tooltip.Trigger>
					<Tooltip.Content>{getTitle('elo', cardPlayer)?.fullTitle}</Tooltip.Content>
				</Tooltip.Root>
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

<style lang="scss">
	.bgGradient {
		margin-top: -50px;
		mask-image: linear-gradient(rgba(0, 0, 0, 1) 0%, rgba(0, 0, 0, 1) 25%, rgba(0, 0, 0, 0) 100%);
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

</style>
