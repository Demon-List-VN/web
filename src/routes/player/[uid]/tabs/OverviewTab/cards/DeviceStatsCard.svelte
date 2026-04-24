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

	type DeviceRecord = {
		mobile?: boolean | null;
		refreshRate?: number | null;
	};

	$: selectedList = data.selectedList;
	$: allRecords = (data.selectedListRecords?.data || []) as DeviceRecord[];
	$: mobileRecords = allRecords.filter((record: DeviceRecord) => Boolean(record.mobile)).length;
	$: pcRecords = allRecords.filter((record: DeviceRecord) => !record.mobile).length;
	$: refreshRateRecords = allRecords.filter(
		(record: DeviceRecord) => typeof record.refreshRate === 'number' && record.refreshRate > 0
	);
	$: avgRefreshRate =
		refreshRateRecords.length > 0
			? Math.round(
					refreshRateRecords.reduce(
						(acc: number, record: DeviceRecord) => acc + Number(record.refreshRate || 0),
						0
					) / refreshRateRecords.length
				)
			: 0;
</script>

<BaseCard bind:draggedCard bind:cardConfigs bind:config bind:isCustomizing>
	<Card.Root class="h-full" style={getBorderStyle(data.player)}>
		<Card.Header>
			<Card.Title class="text-lg">{$_('player.overview.device_stats')}</Card.Title>
		</Card.Header>
		<Card.Content>
			{#if selectedList}
				<p class="card-context">{selectedList.title}</p>
			{/if}
			<div class="device-stats">
				<div class="device-item">
					<div class="device-icon">💻</div>
					<div class="device-info">
						<div class="device-label">PC</div>
						<div class="device-value">{pcRecords}</div>
						<div class="device-percent">
							{allRecords.length > 0 ? Math.round((pcRecords / allRecords.length) * 100) : 0}%
						</div>
					</div>
				</div>
				<div class="device-item">
					<div class="device-icon">📱</div>
					<div class="device-info">
						<div class="device-label">Mobile</div>
						<div class="device-value">{mobileRecords}</div>
						<div class="device-percent">
							{allRecords.length > 0 ? Math.round((mobileRecords / allRecords.length) * 100) : 0}%
						</div>
					</div>
				</div>
			</div>
			{#if avgRefreshRate > 0}
				<div class="mt-3 text-center text-sm opacity-70">
					{$_('player.overview.avg_fps')}: {avgRefreshRate}fps
				</div>
			{/if}
		</Card.Content>
	</Card.Root>
</BaseCard>

<style lang="scss">
	.card-context {
		font-size: 0.8rem;
		opacity: 0.7;
		margin-bottom: 10px;
	}

	.device-stats {
		display: flex;
		justify-content: space-around;
		gap: 20px;
	}

	.device-item {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 10px;
		flex: 1;
	}

	.device-icon {
		font-size: 2.5rem;
	}

	.device-info {
		text-align: center;
	}

	.device-label {
		font-size: 0.9rem;
		opacity: 0.7;
		margin-bottom: 5px;
	}

	.device-value {
		font-size: 2rem;
		font-weight: bold;
	}

	.device-percent {
		font-size: 0.85rem;
		opacity: 0.6;
		margin-top: 2px;
	}

	@media screen and (max-width: 768px) {
		.device-icon {
			font-size: 2rem;
		}

		.device-value {
			font-size: 1.5rem;
		}
	}
</style>
