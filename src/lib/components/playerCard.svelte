<script lang="ts">
	import * as Avatar from '$lib/components/ui/avatar';
	import * as Tooltip from '$lib/components/ui/tooltip';
	import { getTitle } from '$lib/client';
	import { badgeVariants } from '$lib/components/ui/badge';
	import { getExpLevel } from '$lib/client/getExpLevel';
	import { isActive } from '$lib/client/isSupporterActive';
	import type { PlayerRankedListSummary } from '$lib/types/playerRankedList';
	import { resolvePlayerRankedListSelection } from '$lib/types/playerRankedList';
	import { normalizePlayerCardStatLines, PLAYER_CARD_DEFAULT_STAT_LINES } from '$lib/utils/playerCardStatLines';
	import { normalizeCustomListRankBadges, resolveCustomListRankBadge } from '$lib/utils/customListRank';
	import { _ } from 'svelte-i18n';

	export let player: any;
	export let listSummaries: PlayerRankedListSummary[] | null = null;
	export let active = true;

	let isBannerFailedToLoad = false;
	let remoteSummaries: PlayerRankedListSummary[] = [];
	let isLoadingLists = false;
	let hasLoadedRemote = false;
	let listLoadFailed = false;
	let lastPlayerUid = '';

	$: if (player?.uid !== lastPlayerUid) {
		lastPlayerUid = player?.uid || '';
		remoteSummaries = [];
		isLoadingLists = false;
		hasLoadedRemote = false;
		listLoadFailed = false;
	}

	$: exp = player.exp + player.extraExp;
	$: expLevel = getExpLevel(exp);
	$: summaries = listSummaries ?? remoteSummaries;
	$: configuredStatLines = normalizePlayerCardStatLines(player?.overviewData?.playerCardStatLines);
	$: resolvedStatLines = configuredStatLines.map((identifier, index) => {
		return resolvePlayerCardStatLine(identifier)
			|| resolvePlayerCardStatLine(PLAYER_CARD_DEFAULT_STAT_LINES[index])
			|| {
				label: '-',
				value: '-',
				rank: null,
				valueStyle: '',
				tooltip: null
			};
	});
	$: if (active && listSummaries === null && player?.uid && !hasLoadedRemote && !isLoadingLists && !listLoadFailed) {
		void loadPlayerRankedLists(player.uid);
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

		const rounded = Math.round(value * 10) / 10;
		return Number.isInteger(rounded) ? String(rounded) : String(rounded);
	}

	function formatRank(value: number | null | undefined) {
		return typeof value === 'number' && Number.isFinite(value) ? `#${value}` : null;
	}

	function resolvePlayerCardStatLine(identifier: string) {
		const summary = resolvePlayerRankedListSelection(summaries, identifier);

		if (summary && (summary.identifier === identifier || summary.slug === identifier || String(summary.id) === identifier)) {
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

		switch (identifier) {
			case 'dl': {
				const title = getTitle('dl', player);
				return {
					label: $_('player_card.rating'),
					value: formatScore(player.rating),
					rank: formatRank(player.overallRank),
					valueStyle: title?.color ? `background-color: ${title.color}` : '',
					tooltip: title?.fullTitle || null
				};
			}
			case 'pl': {
				const title = getTitle('pl', player);
				return {
					label: $_('player_card.plat_rating'),
					value: formatScore(player.plRating),
					rank: formatRank(player.plrank),
					valueStyle: title?.color ? `background-color: ${title.color}` : '',
					tooltip: title?.fullTitle || null
				};
			}
			case 'fl':
				return {
					label: $_('player_card.featured'),
					value: formatScore(player.totalFLpt),
					rank: formatRank(player.flrank),
					valueStyle: '',
					tooltip: null
				};
			case 'cl': {
				const title = getTitle('cl', player);
				return {
					label: $_('player_card.challenge_rating'),
					value: formatScore(player.clRating),
					rank: formatRank(player.clrank),
					valueStyle: title?.color ? `background-color: ${title.color}` : '',
					tooltip: title?.fullTitle || null
				};
			}
			default:
				return null;
		}
	}
</script>

<div
	class="relative z-0 rounded-md border-[1px] p-[12px]"
	style={isActive(player.supporterUntil)
		? `background-color: ${player.bgColor}; border-color: ${player.borderColor}; ${player.bgColor ? 'color: white' : ''}`
		: ''}
>
	{#if isActive(player.supporterUntil) && !isBannerFailedToLoad}
		<img
			on:error={() => {
				isBannerFailedToLoad = true;
			}}
			class="bgGradient absolute top-[42px] z-[-1] ml-[-12px] h-[72px] w-[calc(100%+24px)] rounded object-cover"
			src={`https://cdn.gdvn.net/banners/${player.uid}${player.isBannerGif ? '.gif' : '.jpg'}`}
			alt=""
		/>
	{/if}
	<div class="hoverName">
		<Avatar.Root>
			<Avatar.Image
				class="object-cover"
				src={`https://cdn.gdvn.net/avatars/${player.uid}${
					isActive(player.supporterUntil) && player.isAvatarGif ? '.gif' : '.jpg'
				}`}
				alt=""
			/>
			<Avatar.Fallback>{player.name[0]}</Avatar.Fallback>
		</Avatar.Root>
		{#if player.clan && isActive(player.clans.boostedUntil)}
			<a
				href={`/clan/${player.clan}`}
				class={`headerBadge ${badgeVariants({ variant: 'secondary' })}`}
				style={`background-color: ${player.clans.tagBgColor}; color: ${player.clans.tagTextColor};`}
				>{player.clans.tag}</a
			>
		{/if}
		<h4 class="playerName font-semibold">
			<span class={isActive(player.supporterUntil) ? 'supporter-name' : ''}>
				{#if player.clan && !isActive(player.clans.boostedUntil)}
					<a href={`/clan/${player.clan}`}>[{player.clans.tag}]</a>
				{/if}
				<a href={`/player/${player.uid}`}>{player.name}</a>
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

		<div class="rating">
			<Tooltip.Root>
				<Tooltip.Trigger>
					<div class="leftCol">
						<div class="title" style={`background-color: ${getTitle('elo', player)?.color}`}>
							{#if player.matchCount < 5}
								<span class="opacity-50">{`${player.elo}?`}</span>
							{:else}
								{player.elo}
							{/if}
						</div>
					</div>
				</Tooltip.Trigger>
				<Tooltip.Content>{getTitle('elo', player)?.fullTitle}</Tooltip.Content>
			</Tooltip.Root>
			<div class="rankWrapper">{$_('player_card.contest')}</div>
		</div>
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
		width: 44px;
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
		padding-top: 8px;
		display: grid;
		gap: 8px;
	}

	.rankWrapper {
		display: flex;
		align-items: center;
		gap: 6px;
		flex-wrap: wrap;

		.rank {
			background-color: var(--textColor);
			color: var(--textColorInverted);
			display: inline-flex;
			align-items: center;
			justify-content: center;
			padding-inline: 6px;
			min-height: 20px;
			border-radius: 5px;
			font-weight: 600;
			line-height: 1;
		}
	}

	.rating {
		.title {
			padding: 2px 5px;
			border-radius: 5px;
			font-weight: bold;
			font-size: 12px;
			user-select: none;
			width: fit-content;
		}

		display: flex;
		gap: 8px;
		align-items: center;
		font-size: 12px;
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

	:global(.supporter-name) {
		background: linear-gradient(90deg, #f6d365, #fda085, #f6d365);
		background-size: 200%;
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
		animation: shimmer 3s ease infinite;
	}

	@keyframes shimmer {
		0% { background-position: 0% 50%; }
		100% { background-position: 200% 50%; }
	}

	@media (prefers-reduced-motion: reduce) {
		:global(.supporter-name) {
			animation: none;
		}
	}
</style>
