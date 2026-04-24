<script lang="ts">
	import * as Table from '$lib/components/ui/table';
	import RecordDetail from '$lib/components/recordDetail.svelte';
	import { _ } from 'svelte-i18n';
	import { getPlayerRankedListScoreLabel } from '$lib/types/playerRankedList';

	export let data: any;

	let recordDetailOpened = false;
	let selectedRecord: any = null;

	$: selectedList = data.selectedList;
	$: recordsResponse = data.selectedListRecords;
	$: records = recordsResponse?.data || [];
	$: isPlatformer = Boolean(selectedList?.isPlatformer);

	function getTimeString(ms: number) {
		const minutes = Math.floor(ms / 60000);
		const seconds = Math.floor((ms % 60000) / 1000);
		const milliseconds = ms % 1000;
		return `${minutes}:${seconds.toString().padStart(2, '0')}.${milliseconds}`;
	}

	function formatPoint(value: number | null | undefined) {
		if (typeof value !== 'number' || !Number.isFinite(value)) {
			return '0';
		}

		const rounded = Math.round(value * 10) / 10;
		return Number.isInteger(rounded) ? String(rounded) : String(rounded);
	}
</script>

{#if selectedRecord}
	<RecordDetail
		bind:open={recordDetailOpened}
		bind:uid={selectedRecord.userid}
		bind:levelID={selectedRecord.levelid}
	/>
{/if}


{#if !selectedList}
	<div class="emptyState">No official or verified list ranking yet.</div>
{:else}
	<div class="summaryCard">
		<div>
			<p class="summaryEyebrow">{selectedList.title}</p>
			<h3 class="summaryTitle">
				{recordsResponse?.total ?? 0} accepted records
			</h3>
			<p class="summaryMeta">
				{getPlayerRankedListScoreLabel(selectedList)} {formatPoint(selectedList.score)} · Top #{selectedList.rank}
			</p>
		</div>
		{#if recordsResponse?.lastRefreshedAt}
			<p class="summaryMeta">Last refreshed {new Date(recordsResponse.lastRefreshedAt).toLocaleString('vi-VN')}</p>
		{/if}
	</div>

	{#if records.length}
	<Table.Root>
		<Table.Caption>{$_('player.table.total_record')}: {recordsResponse?.total ?? records.length}</Table.Caption>
		<Table.Header>
			<Table.Row>
				<Table.Head>{$_('player.table.level')}</Table.Head>
				<Table.Head class="w-[100px] text-center">{$_('player.table.submitted_on')}</Table.Head>
				<Table.Head class="w-[100px] text-center">{$_('player.table.device')}</Table.Head>
				<Table.Head class="w-[80px] text-center">{$_('player.table.point')}</Table.Head>
				{#if isPlatformer}
					<Table.Head class="w-[80px] text-center">{$_('player.table.time')}</Table.Head>
				{:else}
					<Table.Head class="w-[80px] text-center">{$_('player.table.progress')}</Table.Head>
				{/if}
			</Table.Row>
		</Table.Header>
		<Table.Body>
			{#each records as record}
				<Table.Row
					on:click={(e) => {
						// @ts-expect-error
						if (e.target.nodeName == 'A') return;
						selectedRecord = record;
						recordDetailOpened = true;
					}}
				>
					<Table.Cell class="font-medium">
						<div class="relative flex">
							{#if record.level?.videoID}
								<img
									class="levelBG absolute ml-[-18px] mt-[-16px] box-border h-[53.5px] w-[350px] max-w-full object-cover"
									src={`https://img.youtube.com/vi/${record.level.videoID}/0.jpg`}
									alt="bg"
								/>
							{/if}
							<a
								class="levelName z-10"
								href={`/level/${record.level?.id}`}
								data-sveltekit-preload-data="tap"
							>
								{record.level?.name}
							</a>
						</div>
					</Table.Cell>
					<Table.Cell class="text-center">
						{#if record.timestamp}
							{new Date(record.timestamp).toLocaleString('vi-VN')}
						{:else}
							-
						{/if}
					</Table.Cell>
					<Table.Cell class="text-center">
						{record.mobile ? 'Mobile' : 'PC'}
						{#if record.refreshRate}
							<br />({record.refreshRate}fps)
						{/if}
					</Table.Cell>
					<Table.Cell class="text-center">
						{formatPoint(record.point)}
					</Table.Cell>
					{#if isPlatformer}
						<Table.Cell class="text-center">{getTimeString(record.progress)}</Table.Cell>
					{:else}
						<Table.Cell class="text-center">{record.progress}%</Table.Cell>
					{/if}
				</Table.Row>
			{/each}
		</Table.Body>
	</Table.Root>
	{:else}
		<div class="emptyState">No accepted records on this list yet.</div>
	{/if}
{/if}

<style lang="scss">
	.levelBG {
		padding-right: 10px;
		mask-image: linear-gradient(
			90deg,
			rgba(0, 0, 0, 0) 0%,
			rgba(0, 0, 0, 1) 20%,
			rgba(0, 0, 0, 1) 50%,
			rgba(0, 0, 0, 0) 90%,
			rgba(0, 0, 0, 0) 100%
		);
		opacity: 0.5;
		transition: opacity 0.3s;
	}

	.levelBG:hover {
		opacity: 1;
	}

	.levelName {
		text-shadow: 0px 1px 2px var(--textColorInverted);
	}

	.summaryCard,
	.emptyState {
		border-radius: var(--radius);
		border: 1px solid var(--border1);
		background: hsl(var(--muted) / 0.4);
		padding: 16px;
		margin-bottom: 16px;
	}

	.summaryCard {
		display: flex;
		justify-content: space-between;
		gap: 16px;
		flex-wrap: wrap;
	}

	.summaryEyebrow {
		font-size: 12px;
		text-transform: uppercase;
		letter-spacing: 0.12em;
		color: var(--textColorDimmed);
		margin-bottom: 6px;
	}

	.summaryTitle {
		font-size: 20px;
		font-weight: 700;
		margin-bottom: 4px;
	}

	.summaryMeta,
	.emptyState {
		color: var(--textColorDimmed);
	}

	@media screen and (max-width: 1200px) {
		.summaryCard {
			flex-direction: column;
		}
	}
</style>
