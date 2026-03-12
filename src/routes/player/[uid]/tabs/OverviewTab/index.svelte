<script lang="ts">
	import * as sdk from '$lib/client/sdk';
	import type { PageData } from '../../$types';
	import * as Select from '$lib/components/ui/select';
	import { Button } from '$lib/components/ui/button';
	import RecordDetail from '$lib/components/recordDetail.svelte';
	import { _ } from 'svelte-i18n';
	import { isActive } from '$lib/client/isSupporterActive';
	import { user } from '$lib/client';
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import HeatmapCard from './cards/HeatmapCard.svelte';
	import RatingsCard from './cards/RatingsCard.svelte';
	import TotalRecordsCard from './cards/TotalRecordsCard.svelte';
	import DeviceStatsCard from './cards/DeviceStatsCard.svelte';
	import HardestDemonCard from './cards/HardestDemonCard.svelte';
	import RecentActivityCard from './cards/RecentActivityCard.svelte';
	import EventRatingChart from './cards/EventRatingChart.svelte';
	import CustomImageCard from './cards/CustomImageCard.svelte';
	import CustomMarkdownCard from './cards/CustomMarkdownCard.svelte';
	import type { CardConfig, CardSize } from './cards/types';

	export let data: PageData;

	$: isOwner = $user.loggedIn && $user.data?.uid === data.player.uid;
	$: canCustomize = isOwner && isActive(data.player.supporterUntil);

	let selectedRecord: { uid: string; levelID: number } | null = null;
	let recordDetailOpen = false;

	let isCustomizing = false;
	let draggedCard: string | null = null;

	const defaultCards: CardConfig[] = [
		{ id: 'ratings', visible: true, size: '2x1', order: 0 },
		{ id: 'heatmap', visible: true, size: '2x1', order: 1 },
		{ id: 'eventRating', visible: false, size: '2x1', order: 2 },
		{ id: 'totalRecords', visible: false, size: '1x1', order: 3 },
		{ id: 'deviceStats', visible: false, size: '1x1', order: 4 },
		{ id: 'hardestDemon', visible: false, size: '2x1', order: 5 },
		{ id: 'recentActivity', visible: false, size: '2x1', order: 6 },
		{ id: 'customImage', visible: false, size: '2x1', order: 7 },
		{ id: 'customMarkdown', visible: false, size: '2x1', order: 8 }
	];

	let cardConfigs: CardConfig[] = [];
	let savedCardConfigs: CardConfig[] = [];

	$: visibleCards = cardConfigs.filter((c) => c.visible).sort((a, b) => a.order - b.order);

	function toggleCardVisibility(cardId: string) {
		cardConfigs = cardConfigs.map((c) => (c.id === cardId ? { ...c, visible: !c.visible } : c));
	}

	function changeCardSize(cardId: string, size: CardSize) {
		cardConfigs = cardConfigs.map((c) => (c.id === cardId ? { ...c, size } : c));
	}

	function addCustomImageCard() {
		const customImageCards = cardConfigs.filter((c) => c.id.startsWith('customImage'));
		const nextIndex = customImageCards.length;
		const newCardId = nextIndex === 0 ? 'customImage' : `customImage${nextIndex + 1}`;
		const maxOrder = Math.max(...cardConfigs.map((c) => c.order), -1);

		const newCard: CardConfig = {
			id: newCardId,
			visible: true,
			size: '2x1',
			order: maxOrder + 1
		};

		cardConfigs = [...cardConfigs, newCard];
	}

	function addCustomMarkdownCard() {
		const customMarkdownCards = cardConfigs.filter((c) => c.id.startsWith('customMarkdown'));
		const nextIndex = customMarkdownCards.length;
		const newCardId = nextIndex === 0 ? 'customMarkdown' : `customMarkdown${nextIndex + 1}`;
		const maxOrder = Math.max(...cardConfigs.map((c) => c.order), -1);

		const newCard: CardConfig = {
			id: newCardId,
			visible: true,
			size: '2x1',
			order: maxOrder + 1
		};

		cardConfigs = [...cardConfigs, newCard];
	}

	function removeCard(cardId: string) {
		cardConfigs = cardConfigs.filter((c) => c.id !== cardId);
	}

	function startCustomizing() {
		savedCardConfigs = JSON.parse(JSON.stringify(cardConfigs));
		isCustomizing = true;
	}

	function cancelCustomizing() {
		cardConfigs = JSON.parse(JSON.stringify(savedCardConfigs));
		isCustomizing = false;
	}

	async function resetToDefault() {
		cardConfigs = [...defaultCards];

		const currentOverviewData = data.player.overviewData || {};
		const positions: Record<string, any> = {};

		cardConfigs.forEach((card) => {
			positions[card.id] = {
				...(currentOverviewData[card.id] || {}), // Preserve existing properties like imageUrl
				order: card.order,
				visible: card.visible,
				size: card.size
			};
		});

		await saveCardPositions(positions);
	}

	function openRecordDetail(uid: string, levelID: number) {
		selectedRecord = { uid, levelID };
		recordDetailOpen = true;
	}

	async function saveCardPositions(
		positions: Record<string, { order: number; visible: boolean; size: CardSize }>
	) {
		toast.promise(
			sdk.players.root.request({
				method: 'PUT',
				headers: {
					Authorization: 'Bearer ' + (await $user.token()),
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					uid: data.player.uid,
					overviewData: positions
				})
			}),
			{
				success: 'Saved!',
				loading: 'Saving...',
				error: 'Failed to save'
			}
		);
	}

	function handleSavePositions() {
		const currentOverviewData = data.player.overviewData || {};
		const positions: Record<string, any> = {};

		cardConfigs.forEach((card) => {
			positions[card.id] = {
				...(currentOverviewData[card.id] || {}),
				order: card.order,
				visible: card.visible,
				size: card.size
			};
		});

		saveCardPositions(positions);
		isCustomizing = false;
	}

	onMount(async () => {
		if (data.player.overviewData) {
			const overviewData = data.player.overviewData;

			cardConfigs = Object.keys(overviewData).map((id) => ({
				id,
				visible: overviewData[id].visible,
				size: overviewData[id].size,
				order: overviewData[id].order
			}));

			const existingIds = new Set(cardConfigs.map((c) => c.id));
			const missingConfigs = defaultCards.filter((card) => !existingIds.has(card.id));

			cardConfigs = [...cardConfigs, ...missingConfigs];
		} else {
			cardConfigs = [...defaultCards];
		}

		if (isOwner && !isActive(data.player.supporterUntil)) {
			await resetToDefault();
		}
	});
</script>

{#if selectedRecord}
	<RecordDetail
		uid={selectedRecord.uid}
		levelID={selectedRecord.levelID}
		bind:open={recordDetailOpen}
	/>
{/if}

{#if canCustomize}
	<div class="customize-controls">
		<Button
			variant={isCustomizing ? 'default' : 'outline'}
			size="sm"
			on:click={() => (isCustomizing ? cancelCustomizing() : startCustomizing())}
		>
			{isCustomizing ? $_('player.overview.exit_customize') : $_('player.overview.customize')}
		</Button>
		{#if isCustomizing}
			<Button variant="outline" size="sm" on:click={resetToDefault}>
				{$_('player.overview.reset_layout')}
			</Button>
			<Button variant="default" size="sm" on:click={handleSavePositions}>
				{$_('player.overview.save') || 'Save'}
			</Button>
		{/if}
	</div>
{/if}

{#if isCustomizing && canCustomize}
	<div class="customize-panel">
		<h3>{$_('player.overview.card_settings')}</h3>
		<div class="card-controls">
			{#each cardConfigs as config}
				<div class="card-control-item">
					<label class="card-control-label">
						<input
							type="checkbox"
							checked={config.visible}
							on:change={() => toggleCardVisibility(config.id)}
						/>
						<span>
							{#if config.id.startsWith('customImage')}
								{$_('player.overview.card_customImage') || 'Custom Image'}
								{config.id === 'customImage' ? '' : config.id.replace('customImage', '#')}
							{:else if config.id.startsWith('customMarkdown')}
								{$_('player.overview.card_customMarkdown') || 'Custom Markdown'}
								{config.id === 'customMarkdown' ? '' : config.id.replace('customMarkdown', '#')}
							{:else}
								{$_(`player.overview.card_${config.id}`)}
							{/if}
						</span>
					</label>
					<div class="card-control-actions">
						{#if config.visible}
							<Select.Root
								selected={{ label: config.size, value: config.size }}
								onSelectedChange={(e) => {
									if (e && e.value) {
										changeCardSize(config.id, e.value);
									}
								}}
							>
								<Select.Trigger class="w-[100px]">
									<Select.Value />
								</Select.Trigger>
								<Select.Content>
									<Select.Item value="1x1">1x1</Select.Item>
									<Select.Item value="2x1">2x1</Select.Item>
									<Select.Item value="3x1">3x1</Select.Item>
									<Select.Item value="4x1">4x1</Select.Item>
								</Select.Content>
							</Select.Root>
						{/if}
						{#if config.id.startsWith('customImage') || config.id.startsWith('customMarkdown')}
							<Button variant="destructive" size="sm" on:click={() => removeCard(config.id)}>
								{$_('general.delete') || 'Delete'}
							</Button>
						{/if}
					</div>
				</div>
			{/each}
		</div>
		<div class="customize-actions">
			<Button variant="outline" size="sm" on:click={addCustomImageCard}>
				{$_('player.overview.add_custom_image_card') || '+ Add Custom Image Card'}
			</Button>
			<Button variant="outline" size="sm" on:click={addCustomMarkdownCard}>
				{$_('player.overview.add_custom_markdown_card') || '+ Add Custom Markdown Card'}
			</Button>
		</div>
		<p class="customize-hint">{$_('player.overview.drag_hint')}</p>
	</div>
{/if}

<div class="overview-grid" class:customizing={isCustomizing}>
	{#each visibleCards as config (config.id)}
		{#if config.id === 'heatmap'}
			<HeatmapCard {data} bind:draggedCard bind:cardConfigs bind:config bind:isCustomizing />
		{:else if config.id === 'ratings'}
			<RatingsCard {data} bind:draggedCard bind:cardConfigs bind:config bind:isCustomizing />
		{:else if config.id === 'eventRating'}
			<EventRatingChart {data} bind:draggedCard bind:cardConfigs bind:config bind:isCustomizing />
		{:else if config.id === 'totalRecords'}
			<TotalRecordsCard {data} bind:draggedCard bind:cardConfigs bind:config bind:isCustomizing />
		{:else if config.id === 'deviceStats'}
			<DeviceStatsCard {data} bind:draggedCard bind:cardConfigs bind:config bind:isCustomizing />
		{:else if config.id === 'hardestDemon'}
			<HardestDemonCard {data} bind:draggedCard bind:cardConfigs bind:config bind:isCustomizing />
		{:else if config.id === 'recentActivity'}
			<RecentActivityCard
				{data}
				bind:draggedCard
				bind:cardConfigs
				bind:config
				bind:isCustomizing
				onRecordClick={openRecordDetail}
			/>
		{:else if config.id.startsWith('customImage')}
			<CustomImageCard {data} bind:draggedCard bind:cardConfigs bind:config bind:isCustomizing />
		{:else if config.id.startsWith('customMarkdown')}
			<CustomMarkdownCard {data} bind:draggedCard bind:cardConfigs bind:config bind:isCustomizing />
		{/if}
	{/each}
</div>

<style lang="scss">
	.customize-controls {
		display: flex;
		gap: 10px;
		justify-content: center;
		margin-bottom: 15px;
		padding: 10px;
	}

	.customize-panel {
		background-color: rgba(128, 128, 128, 0.1);
		border-radius: 8px;
		padding: 20px;
		margin-bottom: 20px;

		h3 {
			font-size: 1.2rem;
			font-weight: bold;
			margin-bottom: 15px;
		}
	}

	.card-controls {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
		gap: 15px;
		margin-bottom: 15px;
	}

	.card-control-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
		padding: 10px;
		background-color: rgba(128, 128, 128, 0.1);
		border-radius: 6px;
	}

	.card-control-actions {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.card-control-label {
		display: flex;
		align-items: center;
		gap: 8px;
		cursor: pointer;

		input[type='checkbox'] {
			width: 18px;
			height: 18px;
			cursor: pointer;
		}

		span {
			font-size: 0.95rem;
		}
	}

	.customize-actions {
		display: flex;
		justify-content: center;
		gap: 10px;
		margin-top: 10px;
		flex-wrap: wrap;
	}

	.customize-hint {
		font-size: 0.9rem;
		opacity: 0.7;
		text-align: center;
		margin-top: 10px;
	}

	.overview-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
		gap: 20px;
		padding: 20px;
		width: 100%;
		margin: 0 auto;
	}

	@media screen and (max-width: 768px) {
		.overview-grid {
			grid-template-columns: 1fr;
			padding: 10px;
		}

		.card-controls {
			grid-template-columns: 1fr;
		}
	}
</style>
