<script lang="ts">
	import BaseCard from './BaseCard.svelte';
	import * as Card from '$lib/components/ui/card';
	import { _ } from 'svelte-i18n';
	import type { CardConfig } from './types';
	import { getBorderStyle } from './getBorderStyle';

	export let data: any;
	export let cardConfigs: CardConfig[];
	export let config: CardConfig;
	export let draggedCard: string | null;
	export let isCustomizing: boolean = false;

	$: selectedList = data.selectedList;
	$: recordsResponse = data.selectedListRecords;
	$: totalRecords = recordsResponse?.total ?? recordsResponse?.data?.length ?? 0;
	$: totalLevels = recordsResponse?.list?.items?.length ?? null;
	$: coverage = totalLevels && totalLevels > 0
		? Math.round((totalRecords / totalLevels) * 100)
		: null;
</script>

<BaseCard bind:draggedCard bind:cardConfigs bind:config bind:isCustomizing>
	<Card.Root class="h-full" style={getBorderStyle(data.player)}>
		<Card.Header>
			<Card.Title class="text-lg">{$_('player.overview.total_records')}</Card.Title>
		</Card.Header>
		<Card.Content>
			<div class="stat-value">{totalRecords}</div>
			<div class="stat-breakdown">
				<div class="stat-item">
					<span class="stat-label">List</span>
					<span class="stat-number stat-text">{selectedList?.title || '-'}</span>
				</div>
				<div class="stat-item">
					<span class="stat-label">Levels</span>
					<span class="stat-number">{totalLevels ?? '-'}</span>
				</div>
				<div class="stat-item">
					<span class="stat-label">Coverage</span>
					<span class="stat-number">{coverage != null ? `${coverage}%` : '-'}</span>
				</div>
			</div>
		</Card.Content>
	</Card.Root>
</BaseCard>

<style lang="scss">
	.stat-value {
		font-size: 3rem;
		font-weight: bold;
		text-align: center;
		margin-bottom: 10px;
	}

	.stat-breakdown {
		display: flex;
		flex-direction: column;
		gap: 8px;
		margin-top: 15px;
	}

	.stat-item {
		display: flex;
		justify-content: space-between;
		padding: 8px 12px;
		background-color: rgba(128, 128, 128, 0.1);
		border-radius: 8px;
	}

	.stat-label {
		font-size: 0.9rem;
		opacity: 0.8;
	}

	.stat-number {
		font-weight: 600;
		font-size: 1.1rem;
		text-align: right;
	}

	.stat-text {
		max-width: 65%;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	@media screen and (max-width: 768px) {
		.stat-value {
			font-size: 2.5rem;
		}
	}
</style>
