<script lang="ts">
	import * as Table from '$lib/components/ui/table';
	import RecordDetail from '$lib/components/recordDetail.svelte';
	import { Label } from '$lib/components/ui/label';
	import { Switch } from '$lib/components/ui/switch';
	import { _ } from 'svelte-i18n';
	import type { PlayerListRecordEntry } from '$lib/types/playerRankedList';

	export let data: any;

	let recordDetailOpened = false;
	let selectedRecord: PlayerListRecordEntry | null = null;
	let showAcceptedManually = true;
	let showAcceptedAuto = true;

	$: recordsResponse = data.allListRecords ?? data.selectedListRecords;
	$: records = recordsResponse?.data || [];
	$: acceptedRecords = records.filter((record: PlayerListRecordEntry) => isAcceptedRecord(record));
	$: filteredRecords = acceptedRecords.filter((record: PlayerListRecordEntry) => matchesAcceptanceFilter(record));
	$: acceptedRecordTotal = acceptedRecords.length;
	$: hasPlatformerRecords = filteredRecords.some((record: PlayerListRecordEntry) => isPlatformerRecord(record));
	$: hasClassicRecords = filteredRecords.some((record: PlayerListRecordEntry) => !isPlatformerRecord(record));
	$: resultColumnLabel = hasPlatformerRecords && hasClassicRecords
		? 'Result'
		: hasPlatformerRecords
			? $_('player.table.time')
			: $_('player.table.progress');

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

	function isAcceptedRecord(record: PlayerListRecordEntry) {
		return Boolean(record?.acceptedManually) || Boolean(record?.acceptedAuto);
	}

	function matchesAcceptanceFilter(record: PlayerListRecordEntry) {
		const acceptedManually = Boolean(record?.acceptedManually);
		const acceptedAuto = Boolean(record?.acceptedAuto);

		return (showAcceptedManually && acceptedManually) || (showAcceptedAuto && acceptedAuto);
	}

	function isPlatformerRecord(record: PlayerListRecordEntry) {
		return Boolean(record.level?.isPlatformer ?? record.rankedList?.isPlatformer);
	}

	function getSubmittedAt(record: PlayerListRecordEntry) {
		if (record.createdAt) {
			return new Date(record.createdAt).toLocaleString('vi-VN');
		}

		if (record.timestamp) {
			return new Date(record.timestamp).toLocaleString('vi-VN');
		}

		return '-';
	}
</script>

{#if selectedRecord}
	<RecordDetail
		bind:open={recordDetailOpened}
		bind:uid={selectedRecord.uid}
		bind:levelID={selectedRecord.levelId}
	/>
{/if}


{#if acceptedRecordTotal}
	<div class="filterBar">
		<div class="filterGroup">
			<div class="filterItem">
				<Label for="accepted-manually-filter">Accepted manually</Label>
				<Switch id="accepted-manually-filter" bind:checked={showAcceptedManually} />
			</div>
			<div class="filterItem">
				<Label for="accepted-auto-filter">Accepted automatically</Label>
				<Switch id="accepted-auto-filter" bind:checked={showAcceptedAuto} />
			</div>
		</div>
	</div>

	{#if filteredRecords.length}
	<Table.Root>
		<Table.Caption>
			{$_('player.table.total_record')}: {filteredRecords.length} / {acceptedRecordTotal}
		</Table.Caption>
		<Table.Header>
			<Table.Row>
				<Table.Head>{$_('player.table.level')}</Table.Head>
				<Table.Head class="w-[100px] text-center">{$_('player.table.submitted_on')}</Table.Head>
				<Table.Head class="w-[100px] text-center">{$_('player.table.device')}</Table.Head>
				<Table.Head class="w-[80px] text-center">{$_('player.table.point')}</Table.Head>
				<Table.Head class="w-[80px] text-center">{resultColumnLabel}</Table.Head>
			</Table.Row>
		</Table.Header>
		<Table.Body>
			{#each filteredRecords as record}
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
						{getSubmittedAt(record)}
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
					{#if isPlatformerRecord(record)}
						<Table.Cell class="text-center">{getTimeString(record.progress)}</Table.Cell>
					{:else}
						<Table.Cell class="text-center">{record.progress}%</Table.Cell>
					{/if}
				</Table.Row>
			{/each}
		</Table.Body>
	</Table.Root>
	{:else}
		<div class="emptyState">
			{#if acceptedRecordTotal}
				No accepted records match the current filters.
			{:else}
				No accepted ranked-list records yet.
			{/if}
		</div>
	{/if}
	{:else}
	<div class="emptyState">No accepted ranked-list records yet.</div>
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

	.filterBar,
	.emptyState {
		border-radius: var(--radius);
		border: 1px solid var(--border1);
		background: hsl(var(--muted) / 0.4);
		padding: 16px;
		margin-bottom: 16px;
	}

	.filterGroup {
		display: flex;
		flex-wrap: wrap;
		gap: 12px;
	}

	.filterItem {
		display: flex;
		align-items: center;
		gap: 8px;
		border-radius: var(--radius);
		border: 1px solid var(--border1);
		padding: 8px 12px;
		background: hsl(var(--background) / 0.6);
	}

	.emptyState {
		color: var(--textColorDimmed);
	}

	@media screen and (max-width: 1200px) {
		.filterGroup {
			align-items: flex-start;
			justify-content: flex-start;
		}
	}
</style>
