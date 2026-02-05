<script lang="ts">
	import BaseCard from './BaseCard.svelte';
	import * as Card from '$lib/components/ui/card';
	import * as Tooltip from '$lib/components/ui/tooltip';
	import { getTitle } from '$lib/client';
	import { _ } from 'svelte-i18n';
	import { getExpLevel } from '$lib/client/getExpLevel';
	import { isActive } from '$lib/client/isSupporterActive';
	import type { CardConfig } from './types';
	import { getBorderStyle } from './getBorderStyle';

	export let data: any;
	export let cardConfigs: CardConfig[];
	export let config: CardConfig;
	export let draggedCard: string | null;
	export let isCustomizing: boolean = false;

	$: exp = data.player.exp + data.player.extraExp;
	$: expLevel = getExpLevel(exp);
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
			<div class="ratings-grid">
				<div class="rating-item">
					<span class="rating-label">{$_('player_card.rating')}</span>
					<Tooltip.Root>
						<Tooltip.Trigger>
							<div
								class="rating-badge text-white"
								style={`background-color: ${getTitle('dl', data.player)?.color}`}
							>
								{data.player.rating}
							</div>
						</Tooltip.Trigger>
						<Tooltip.Content>{getTitle('dl', data.player)?.fullTitle}</Tooltip.Content>
					</Tooltip.Root>
					<span class="rating-rank">#{data.player.overallRank}</span>
				</div>
				<div class="rating-item">
					<span class="rating-label">{$_('player_card.plat_rating')}</span>
					<div class="rating-badge">
						{data.player.plRating}
					</div>
					<span class="rating-rank">#{data.player.plrank}</span>
				</div>
				<div class="rating-item">
					<span class="rating-label">{$_('player_card.featured')}</span>
					<div class="rating-badge">
						{data.player.totalFLpt}
					</div>
					<span class="rating-rank">#{data.player.flrank}</span>
				</div>
				<div class="rating-item">
					<span class="rating-label">{$_('player_card.challenge_rating')}</span>
					<Tooltip.Root>
						<Tooltip.Trigger>
							<div
								class="rating-badge text-white"
								style={`background-color: ${getTitle('cl', data.player)?.color}`}
							>
								{data.player.clRating}
							</div>
						</Tooltip.Trigger>
						<Tooltip.Content>{getTitle('cl', data.player)?.fullTitle}</Tooltip.Content>
					</Tooltip.Root>
					<span class="rating-rank">#{data.player.clrank}</span>
				</div>
				<div class="rating-item">
					<span class="rating-label">{$_('player_card.contest')}</span>
					<Tooltip.Root>
						<Tooltip.Trigger>
							<div
								class="rating-badge"
								style={`background-color: ${getTitle('elo', data.player)?.color}`}
							>
								{#if data.player.matchCount < 5}
									<span class="opacity-50">{data.player.elo}?</span>
								{:else}
									{data.player.elo}
								{/if}
							</div>
						</Tooltip.Trigger>
						<Tooltip.Content>{getTitle('elo', data.player)?.fullTitle}</Tooltip.Content>
					</Tooltip.Root>
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

	.exp-text {
		font-size: 0.85rem;
	}

	.ratings-grid {
		display: grid;
		grid-template-columns: repeat(5, 1fr);
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
	}

	@media screen and (max-width: 768px) {
		.ratings-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
