<script lang="ts">
	import * as Table from '$lib/components/ui/table';
	import * as Select from '$lib/components/ui/select';
	import RecordDetail from '$lib/components/recordDetail.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Switch } from '$lib/components/ui/switch';
	import { _ } from 'svelte-i18n';
	import type { PlayerListRecordEntry } from '$lib/types/playerRankedList';

	type SelectOption = {
		value: string;
		label: string;
	};

	type PlatformFilterValue = 'all' | 'pc' | 'mobile';

	const allListsValue = '';

	export let data: any;

	let recordDetailOpened = false;
	let selectedRecord: PlayerListRecordEntry | null = null;
	let draftLevelId = '';
	let draftListIdentifier = allListsValue;
	let draftPlatform: PlatformFilterValue = 'all';
	let draftShowAcceptedManually = true;
	let draftShowAcceptedAuto = true;
	let showAcceptedManually = true;
	let showAcceptedAuto = true;
	let appliedLevelId = '';
	let appliedListIdentifier = '';
	let appliedPlatform: PlatformFilterValue = 'all';

	$: allListsOption = {
		value: allListsValue,
		label: $_('player.filter.all_lists')
	};
	$: platformOptions = [
		{ value: 'all', label: $_('player.filter.all_platforms') },
		{ value: 'pc', label: $_('player.filter.platform_pc') },
		{ value: 'mobile', label: $_('player.filter.platform_mobile') }
	] satisfies Array<SelectOption & { value: PlatformFilterValue }>;
	$: recordsResponse = data.allListRecords ?? data.selectedListRecords;
	$: records = recordsResponse?.data || [];
	$: listOptions = getListOptions(records, data.selectedList);
	$: selectedListOption =
		listOptions.find((option) => option.value === draftListIdentifier) ?? allListsOption;
	$: selectedPlatformOption =
		platformOptions.find((option) => option.value === draftPlatform) ?? platformOptions[0];
	$: acceptedRecords = records.filter((record: PlayerListRecordEntry) => isAcceptedRecord(record));
	$: filteredRecords = acceptedRecords.filter(
		(record: PlayerListRecordEntry) =>
			matchesAcceptanceFilter(record, showAcceptedManually, showAcceptedAuto) &&
			matchesLevelIdFilter(record, appliedLevelId) &&
			matchesListFilter(record, appliedListIdentifier, data.selectedList?.identifier ?? '') &&
			matchesPlatformFilter(record, appliedPlatform)
	);
	$: acceptedRecordTotal = acceptedRecords.length;
	$: hasPlatformerRecords = filteredRecords.some((record: PlayerListRecordEntry) => isPlatformerRecord(record));
	$: hasClassicRecords = filteredRecords.some((record: PlayerListRecordEntry) => !isPlatformerRecord(record));
	$: resultColumnLabel = hasPlatformerRecords && hasClassicRecords
		? $_('player.table.result')
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

		return String(Math.round(value));
	}

	function isAcceptedRecord(record: PlayerListRecordEntry) {
		return Boolean(record?.acceptedManually) || Boolean(record?.acceptedAuto);
	}

	function getListOptions(records: PlayerListRecordEntry[], selectedList: any): SelectOption[] {
		const optionsByValue = new Map<string, SelectOption>();

		for (const record of records) {
			const value = record.rankedList?.identifier ?? selectedList?.identifier;
			const label = record.rankedList?.title ?? selectedList?.title;

			if (!value || !label || optionsByValue.has(value)) {
				continue;
			}

			optionsByValue.set(value, { value, label });
		}

		return Array.from(optionsByValue.values()).sort((left, right) => left.label.localeCompare(right.label));
	}

	function matchesAcceptanceFilter(
		record: PlayerListRecordEntry,
		acceptedManuallyEnabled: boolean,
		acceptedAutoEnabled: boolean
	) {
		const acceptedManually = Boolean(record?.acceptedManually);
		const acceptedAuto = Boolean(record?.acceptedAuto);

		return (acceptedManuallyEnabled && acceptedManually) || (acceptedAutoEnabled && acceptedAuto);
	}

	function matchesLevelIdFilter(record: PlayerListRecordEntry, levelIdFilter: string) {
		if (!levelIdFilter) {
			return true;
		}

		return String(record.level?.id ?? record.levelId ?? '') === levelIdFilter;
	}

	function matchesListFilter(
		record: PlayerListRecordEntry,
		listIdentifierFilter: string,
		selectedListIdentifier: string
	) {
		if (!listIdentifierFilter) {
			return true;
		}

		return (record.rankedList?.identifier ?? selectedListIdentifier) === listIdentifierFilter;
	}

	function matchesPlatformFilter(record: PlayerListRecordEntry, platformFilter: PlatformFilterValue) {
		if (platformFilter === 'all') {
			return true;
		}

		const isMobile = Boolean(record.mobile);
		return platformFilter === 'mobile' ? isMobile : !isMobile;
	}

	function isPlatformerRecord(record: PlayerListRecordEntry) {
		return Boolean(record.level?.isPlatformer ?? record.rankedList?.isPlatformer);
	}

	function applyFilters() {
		appliedLevelId = draftLevelId.trim();
		appliedListIdentifier = draftListIdentifier;
		appliedPlatform = draftPlatform;
		showAcceptedManually = draftShowAcceptedManually;
		showAcceptedAuto = draftShowAcceptedAuto;
	}

	function handleListSelection(option: { value?: string } | undefined) {
		draftListIdentifier = option?.value ?? allListsValue;
	}

	function handlePlatformSelection(option: { value?: string } | undefined) {
		draftPlatform = (option?.value as PlatformFilterValue) ?? 'all';
	}

	function handleFilterKeydown(event: KeyboardEvent) {
		if (event.key !== 'Enter') {
			return;
		}

		event.preventDefault();
		applyFilters();
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
			<div class="filterField">
				<Label for="record-level-id-filter">{$_('player.filter.level_id')}</Label>
				<Input
					id="record-level-id-filter"
					bind:value={draftLevelId}
					placeholder={$_('player.filter.level_id_placeholder')}
					inputmode="numeric"
					class="w-full min-w-[180px]"
					on:keydown={handleFilterKeydown}
				/>
			</div>
			<div class="filterField">
				<Label for="record-list-filter">{$_('player.filter.list')}</Label>
				<Select.Root selected={selectedListOption} onSelectedChange={handleListSelection}>
					<Select.Trigger id="record-list-filter" class="w-full min-w-[220px]">
						<Select.Value placeholder={$_('player.filter.all_lists')} />
					</Select.Trigger>
					<Select.Content>
						<Select.Item value="" label={$_('player.filter.all_lists')}>
							{$_('player.filter.all_lists')}
						</Select.Item>
						{#each listOptions as listOption}
							<Select.Item value={listOption.value} label={listOption.label}>
								{listOption.label}
							</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>
			</div>
			<div class="filterField">
				<Label for="record-platform-filter">{$_('player.filter.platform')}</Label>
				<Select.Root selected={selectedPlatformOption} onSelectedChange={handlePlatformSelection}>
					<Select.Trigger id="record-platform-filter" class="w-full min-w-[180px]">
						<Select.Value placeholder={$_('player.filter.all_platforms')} />
					</Select.Trigger>
					<Select.Content>
						{#each platformOptions as platformOption}
							<Select.Item value={platformOption.value} label={platformOption.label}>
								{platformOption.label}
							</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>
			</div>
			<div class="filterToggle">
				<Label for="accepted-manually-filter">{$_('player.filter.accepted_manually')}</Label>
				<Switch id="accepted-manually-filter" bind:checked={draftShowAcceptedManually} />
			</div>
			<div class="filterToggle">
				<Label for="accepted-auto-filter">{$_('player.filter.accepted_automatically')}</Label>
				<Switch id="accepted-auto-filter" bind:checked={draftShowAcceptedAuto} />
			</div>
		</div>
		<div class="filterActions">
			<Button type="button" on:click={applyFilters}>{$_('player.filter.apply')}</Button>
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
				{$_('player.filter.no_matches')}
			{:else}
				{$_('player.filter.no_records')}
			{/if}
		</div>
	{/if}
	{:else}
	<div class="emptyState">{$_('player.filter.no_records')}</div>
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

	.filterField {
		display: flex;
		flex: 1 1 180px;
		flex-direction: column;
		gap: 8px;
		min-width: 180px;
	}

	.filterToggle {
		display: flex;
		align-items: center;
		gap: 8px;
		border-radius: var(--radius);
		border: 1px solid var(--border1);
		padding: 8px 12px;
		background: hsl(var(--background) / 0.6);
	}

	.filterActions {
		display: flex;
		justify-content: flex-end;
		margin-top: 16px;
	}

	.emptyState {
		color: var(--textColorDimmed);
	}

	@media screen and (max-width: 1200px) {
		.filterGroup {
			align-items: flex-start;
			justify-content: flex-start;
		}

		.filterActions {
			justify-content: stretch;
		}

		.filterActions :global(button) {
			width: 100%;
		}
	}
</style>
