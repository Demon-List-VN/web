<script lang="ts">
	import BaseCard from './BaseCard.svelte';
	import * as Card from '$lib/components/ui/card';
	import LevelCard from '$lib/components/levelCard.svelte';
	import { toLevelCardProps } from '$lib/components/levelCardProps';
	import { _ } from 'svelte-i18n';
	import { isActive } from '$lib/client/isSupporterActive';
	import type { CardConfig } from './types';
	import { getBorderStyle } from './getBorderStyle';

	export let data: any;
	export let cardConfigs: CardConfig[];
	export let config: CardConfig;
	export let draggedCard: string | null;
	export let isCustomizing: boolean = false;

	$: dlRecords = data.records.dl || [];
	$: hardestLevel = dlRecords.length > 0 ? dlRecords[0] : null;
</script>

<BaseCard bind:draggedCard bind:cardConfigs bind:config bind:isCustomizing>
	<Card.Root class="h-full" style={getBorderStyle(data.player)}>
		<Card.Header>
			<Card.Title class="text-lg">{$_('player.overview.hardest_demon')}</Card.Title>
		</Card.Header>
		<Card.Content>
			{#if hardestLevel}
				<LevelCard {...toLevelCardProps(hardestLevel.levels, 'dl')} type="dl" />
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
