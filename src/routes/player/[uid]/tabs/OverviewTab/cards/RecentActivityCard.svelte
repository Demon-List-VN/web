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
	export let onRecordClick: (uid: string, levelID: number) => void;

	$: selectedList = data.selectedList;
	$: records = data.selectedListRecords?.data || [];
	$: recentRecords = [...records]
		.filter((record) => record.timestamp)
		.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
		.slice(0, 5);
</script>

<BaseCard bind:draggedCard bind:cardConfigs bind:config bind:isCustomizing>
	<Card.Root class="h-full" style={getBorderStyle(data.player)}>
		<Card.Header>
			<Card.Title class="text-lg">{$_('player.overview.recent_activity')}</Card.Title>
		</Card.Header>
		<Card.Content>
			{#if recentRecords.length > 0}
				{#if selectedList}
					<p class="card-context">{selectedList.title}</p>
				{/if}
				<div class="recent-list">
					{#each recentRecords as record}
						<button
							class="recent-item"
							on:click={() => onRecordClick(record.uid, record.levelId)}
						>
							<span class="recent-level-name">
								{record.level?.name}
							</span>
							<div class="recent-meta">
								<span class="recent-device">{record.mobile ? '📱' : '💻'}</span>
								<span class="recent-date">
									{new Date(record.timestamp).toLocaleDateString('vi-VN')}
								</span>
							</div>
						</button>
					{/each}
				</div>
			{:else}
				<div class="no-records">
					{selectedList ? $_('player.overview.no_records') : 'No ranked list selected.'}
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

	.recent-list {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.recent-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 10px;
		background-color: rgba(128, 128, 128, 0.1);
		border-radius: 8px;
		transition: background-color 0.2s;
		width: 100%;
		border: none;
		color: inherit;
		cursor: pointer;
		text-align: left;

		&:hover {
			background-color: rgba(128, 128, 128, 0.2);
		}
	}

	.recent-level-name {
		font-weight: 500;
		flex: 1;
	}

	.recent-meta {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 0.85rem;
		opacity: 0.7;
	}

	.recent-device {
		font-size: 1rem;
	}

	.no-records {
		text-align: center;
		padding: 20px;
		opacity: 0.6;
	}
</style>
