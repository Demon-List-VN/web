<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import BaseCard from './BaseCard.svelte';
	import * as Card from '$lib/components/ui/card';
	import * as Select from '$lib/components/ui/select';
	import * as Tooltip from '$lib/components/ui/tooltip';
	import { getTitle } from '$lib/client';
	import { normalizeCustomListRankBadges, resolveCustomListRankBadge } from '$lib/utils/customListRank';
	import { getPlayerRankedListScoreLabel } from '$lib/types/playerRankedList';
	import { _ } from 'svelte-i18n';
	import { getExpLevel } from '$lib/client/getExpLevel';
	import type { CardConfig } from './types';
	import { getBorderStyle } from './getBorderStyle';

	export let data: any;
	export let cardConfigs: CardConfig[];
	export let config: CardConfig;
	export let draggedCard: string | null;
	export let isCustomizing: boolean = false;

	$: listSummaries = data.listSummaries || [];
	$: selectedList = data.selectedList;
	$: exp = data.player.exp + data.player.extraExp;
	$: expLevel = getExpLevel(exp);
	$: selectedListOption = selectedList
		? { label: selectedList.title, value: selectedList.identifier }
		: undefined;
	$: selectedListBadge = selectedList
		? resolveCustomListRankBadge(
				selectedList,
				normalizeCustomListRankBadges(selectedList.rankBadges)
			)
		: null;
	$: scoreLabel = getPlayerRankedListScoreLabel(selectedList);
	$: contestTitle = getTitle('elo', data.player);

	function formatScore(value: number | null | undefined) {
		if (typeof value !== 'number' || !Number.isFinite(value)) {
			return '0';
		}

		return String(Math.round(value));
	}

	async function handleListChange(option: { value?: string } | undefined) {
		const identifier = option?.value;
		const nextUrl = new URL($page.url.href);

		if (identifier) {
			nextUrl.searchParams.set('list', identifier);
		} else {
			nextUrl.searchParams.delete('list');
		}

		await goto(`${nextUrl.pathname}${nextUrl.search}`, {
			keepFocus: true,
			noScroll: true,
			replaceState: true
		});
	}
</script>

<BaseCard bind:draggedCard bind:cardConfigs bind:config bind:isCustomizing>
	<Card.Root class="h-full" style={getBorderStyle(data.player)}>
		<Card.Header>
			<Card.Title class="text-lg">{$_('player.overview.ratings')}</Card.Title>
		</Card.Header>
		<Card.Content>
			<div class="exp-section">
				<div class="exp-level">
					<b>{$_('player.level')}.{expLevel.level}</b>
				</div>
				<div class="progressBar">
					<div class="progress" style={`width: ${expLevel.progress}%`}>
						<b>{expLevel.progress}%</b>
					</div>
				</div>
				<Tooltip.Root>
					<Tooltip.Trigger class="exp-text">{exp}/{expLevel.upperBound}</Tooltip.Trigger>
					<Tooltip.Content>
						<p>{expLevel.upperBound - exp} {$_('player.exp_to_next')}</p>
					</Tooltip.Content>
				</Tooltip.Root>
			</div>

			{#if listSummaries.length}
				<div class="selector-row">
					<Select.Root selected={selectedListOption} onSelectedChange={handleListChange}>
						<Select.Trigger class="w-full">
							<Select.Value placeholder="Select a ranked list" />
						</Select.Trigger>
						<Select.Content>
							{#each listSummaries as listSummary}
								<Select.Item value={listSummary.identifier}>{listSummary.title}</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
					{#if selectedListBadge}
						<div class="rank-chip" style={`background: ${selectedListBadge.color}`}>
							{selectedListBadge.label}
						</div>
					{/if}
				</div>
			{/if}

			<div class="ratings-grid">
				<div class="rating-item">
					<span class="rating-label">{selectedList ? scoreLabel : $_('player_card.rating')}</span>
					<div class="rating-badge text-white" style={selectedListBadge ? `background: ${selectedListBadge.color}` : undefined}>
						{selectedList ? formatScore(selectedList.score) : '-'}
					</div>
					<span class="rating-rank">{selectedList?.title || 'No ranked list'}</span>
				</div>
				<div class="rating-item">
					<span class="rating-label">Top</span>
					<div class="rating-badge">
						{selectedList ? `#${selectedList.rank}` : '-'}
					</div>
					<span class="rating-rank">Leaderboard</span>
				</div>
				<div class="rating-item">
					<span class="rating-label">Records</span>
					<div class="rating-badge">
						{selectedList?.completedCount ?? 0}
					</div>
					<span class="rating-rank">Accepted</span>
				</div>
				<div class="rating-item">
					<span class="rating-label">{$_('player_card.contest')}</span>
					<Tooltip.Root>
						<Tooltip.Trigger>
							<div class="rating-badge text-white" style={`background-color: ${contestTitle?.color}`}>
								{#if data.player.matchCount < 5}
									<span class="opacity-50">{data.player.elo}?</span>
								{:else}
									{data.player.elo}
								{/if}
							</div>
						</Tooltip.Trigger>
						<Tooltip.Content>{contestTitle?.fullTitle}</Tooltip.Content>
					</Tooltip.Root>
					<span class="rating-rank">Current</span>
				</div>
			</div>
		</Card.Content>
	</Card.Root>
</BaseCard>

<style lang="scss">
	.exp-section {
		display: flex;
		align-items: center;
		gap: 10px;
		margin-bottom: 12px;
		padding: 10px;
		background-color: rgba(128, 128, 128, 0.1);
		border-radius: 6px;
	}

	.exp-level {
		min-width: 50px;
		text-align: center;
		font-size: 0.9rem;
	}

	.progressBar {
		background-color: gray;
		flex: 1;
		border-radius: 8px;
		overflow: hidden;

		b {
			color: var(--textColorInverted);
			margin-right: 5px;
			font-size: 0.85rem;
		}

		.progress {
			background-color: var(--textColor);
			text-align: right;
			border-radius: 8px;
			padding: 1px 0;
		}
	}

	.selector-row {
		display: flex;
		gap: 10px;
		align-items: center;
		margin-bottom: 12px;
	}

	.rank-chip {
		width: fit-content;
		padding: 4px 8px;
		border-radius: 999px;
		color: white;
		font-size: 10px;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}

	.ratings-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 10px;
	}

	.rating-item {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 6px;
		padding: 10px;
		background-color: rgba(128, 128, 128, 0.1);
		border-radius: 6px;
	}

	.rating-label {
		font-size: 0.75rem;
		opacity: 0.7;
		text-align: center;
	}

	.rating-badge {
		padding: 6px 12px;
		border-radius: 6px;
		font-weight: bold;
		font-size: 1.25rem;
		background-color: rgba(128, 128, 128, 0.2);
		cursor: pointer;
	}

	.rating-rank {
		font-size: 0.8rem;
		font-weight: 600;
		opacity: 0.8;
		text-align: center;
	}

	@media screen and (max-width: 768px) {
		.selector-row {
			flex-direction: column;
			align-items: stretch;
		}

		.ratings-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
