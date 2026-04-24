<script lang="ts">
	import BaseCard from './BaseCard.svelte';
	import * as Card from '$lib/components/ui/card';
	import LevelCard from '$lib/components/levelCard.svelte';
	import { toLevelCardProps } from '$lib/components/levelCardProps';
	import { _ } from 'svelte-i18n';
	import type { CardConfig } from './types';
	import { getBorderStyle } from './getBorderStyle';

	export let data: any;
	export let cardConfigs: CardConfig[];
	export let config: CardConfig;
	export let draggedCard: string | null;
	export let isCustomizing: boolean = false;

	function resolveLevelCardType(list: any) {
		if (list?.slug === 'fl' || list?.slug === 'pl' || list?.slug === 'dl' || list?.slug === 'cl') {
			return list.slug;
		}

		return list?.isPlatformer ? 'pl' : 'dl';
	}

	$: selectedList = data.selectedList;
	$: records = data.selectedListRecords?.data || [];
	$: hardestLevel = records.length > 0 ? records[0] : null;
	$: levelCardType = resolveLevelCardType(selectedList);
	$: hardestLevelProps = hardestLevel
		? toLevelCardProps(hardestLevel.level || {}, levelCardType, {
				rating: hardestLevel.point,
				top: hardestLevel.no,
				minProgress: hardestLevel.formulaScope?.minProgress ?? hardestLevel.level?.minProgress ?? null,
				record: {
					isChecked: true,
					progress: hardestLevel.progress
				},
				isPlatformer: Boolean(selectedList?.isPlatformer)
			})
		: null;
</script>

<BaseCard bind:draggedCard bind:cardConfigs bind:config bind:isCustomizing>
	<Card.Root class="h-full" style={getBorderStyle(data.player)}>
		<Card.Header>
			<Card.Title class="text-lg">{$_('player.overview.hardest_demon')}</Card.Title>
		</Card.Header>
		<Card.Content>
			{#if hardestLevel && hardestLevelProps}
				<LevelCard {...hardestLevelProps} type={levelCardType} />
			{:else}
				<div class="no-records">{$_('player.overview.no_data')}</div>
			{/if}
		</Card.Content>
	</Card.Root>
</BaseCard>

<style lang="scss">
	.no-records {
		text-align: center;
		padding: 20px;
		opacity: 0.6;
	}
</style>
