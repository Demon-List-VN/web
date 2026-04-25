<script lang="ts">
	import * as Table from '$lib/components/ui/table';
	import * as Select from '$lib/components/ui/select';
	import { goto } from '$app/navigation';
	import AcceptanceBadge from '$lib/components/AcceptanceBadge.svelte';
	import ListSelector, { type ListSelectorOption } from '$lib/components/listSelector.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Switch } from '$lib/components/ui/switch';
	import InfoCircled from 'svelte-radix/InfoCircled.svelte';
	import { _ } from 'svelte-i18n';
	import type {
		PlayerListRecordEntry,
		PlayerListRecordsResponse,
		PlayerRankedListSummary
	} from '$lib/types/playerRankedList';

	type SelectOption<TValue extends string = string> = {
		value: TValue;
		label: string;
		disabled?: boolean;
	};

	type PlatformFilterValue = 'all' | 'pc' | 'mobile';
	type RecordSortValue = 'date_submitted' | 'point' | 'progress';
	type RecordSortDirection = 'desc' | 'asc';

	export let data: any;

	let draftLevelId = '';
	let draftListId: number | null = null;
	let draftPlatform: PlatformFilterValue = 'all';
	let draftSortBy: RecordSortValue = 'date_submitted';
	let draftSortDirection: RecordSortDirection = 'desc';
	let draftShowAcceptedManually = true;
	let draftShowAcceptedAuto = true;
	let showAcceptedManually = true;
	let showAcceptedAuto = true;
	let appliedLevelId = '';
	let appliedListId: number | null = null;
	let appliedPlatform: PlatformFilterValue = 'all';
	let appliedSortBy: RecordSortValue = 'date_submitted';
	let appliedSortDirection: RecordSortDirection = 'desc';
	let selectedListRecordsResponse: PlayerListRecordsResponse | null = null;
	let selectedListRecordsLoadedForId: number | null = null;
	let selectedListRecordsRequestId = 0;
	let isLoadingSelectedListRecords = false;

	$: platformOptions = [
		{ value: 'all', label: $_('player.filter.all_platforms') },
		{ value: 'pc', label: $_('player.filter.platform_pc') },
		{ value: 'mobile', label: $_('player.filter.platform_mobile') }
	] satisfies Array<SelectOption<PlatformFilterValue>>;
	$: sortOptions = [
		{ value: 'date_submitted', label: $_('player.filter.date_submitted') },
		{ value: 'progress', label: $_('player.table.progress') },
		{ value: 'point', label: $_('player.filter.point'), disabled: draftListId === null }
	] satisfies Array<SelectOption<RecordSortValue>>;
	$: sortDirectionOptions = [
		{ value: 'desc', label: $_('player.filter.descending') },
		{ value: 'asc', label: $_('player.filter.ascending') }
	] satisfies Array<SelectOption<RecordSortDirection>>;
	$: if (draftListId === null && draftSortBy === 'point') {
		draftSortBy = 'date_submitted';
	}
	$: baseRecordsResponse = data.playerRecords ?? data.selectedListRecords ?? data.allListRecords;
	$: listRecordsResponse = data.allListRecords ?? data.selectedListRecords ?? data.playerRecords;
	$: selectedListFallback = data.selectedList;
	$: listSearchUrl = `${import.meta.env.VITE_API_URL}/lists`;
	$: baseRecords = baseRecordsResponse?.data || [];
	$: listRecords = listRecordsResponse?.data || [];
	$: selectedListRecords =
		appliedListId !== null && selectedListRecordsLoadedForId === appliedListId
			? selectedListRecordsResponse?.data || []
			: listRecords;
	$: records = getDisplayRecords(
		baseRecords,
		selectedListRecords,
		appliedListId,
		data.listSummaries || [],
		selectedListFallback
	);
	$: listOptions = getListOptions(data.listSummaries || [], listRecordsResponse?.data || []);
	$: selectedPlatformOption =
		platformOptions.find((option) => option.value === draftPlatform) ?? platformOptions[0];
	$: selectedSortOption =
		sortOptions.find((option) => option.value === draftSortBy) ?? sortOptions[0];
	$: selectedSortDirectionOption =
		sortDirectionOptions.find((option) => option.value === draftSortDirection) ??
		sortDirectionOptions[0];
	$: acceptedRecords = records.filter((record: PlayerListRecordEntry) => isAcceptedRecord(record));
	$: matchingRecords = acceptedRecords.filter(
		(record: PlayerListRecordEntry) =>
			matchesAcceptanceFilter(record, showAcceptedManually, showAcceptedAuto) &&
			matchesLevelIdFilter(record, appliedLevelId) &&
			matchesPlatformFilter(record, appliedPlatform)
	);
	$: filteredRecords = sortRecords(
		matchingRecords,
		appliedSortBy,
		appliedSortDirection,
		appliedListId !== null
	);
	$: acceptedRecordTotal = acceptedRecords.length;
	$: showRecordControls =
		acceptedRecordTotal > 0 || appliedListId !== null || baseRecords.length > 0;
	$: isLoadingAppliedListRecords =
		appliedListId !== null &&
		isLoadingSelectedListRecords &&
		selectedListRecordsLoadedForId !== appliedListId &&
		!records.length;
	$: showPointColumn = appliedListId !== null;
	$: hasPlatformerRecords = filteredRecords.some((record: PlayerListRecordEntry) =>
		isPlatformerRecord(record)
	);
	$: hasClassicRecords = filteredRecords.some(
		(record: PlayerListRecordEntry) => !isPlatformerRecord(record)
	);
	$: resultColumnLabel =
		hasPlatformerRecords && hasClassicRecords
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

	function getRecordDetailHref(record: PlayerListRecordEntry) {
		const recordQuery = record.id ? `?id=${record.id}` : '';
		return `/record/${record.uid}/${record.levelId}${recordQuery}`;
	}

	function isAcceptedRecord(record: PlayerListRecordEntry) {
		return Boolean(record?.acceptedManually) || Boolean(record?.acceptedAuto);
	}

	function getListOptions(
		listSummaries: PlayerRankedListSummary[],
		records: PlayerListRecordEntry[]
	): ListSelectorOption[] {
		const optionsById = new Map<number, ListSelectorOption>();

		for (const list of listSummaries) {
			if (!Number.isFinite(list.id) || optionsById.has(list.id)) {
				continue;
			}

			optionsById.set(list.id, {
				id: list.id,
				title: list.title,
				identifier: list.identifier,
				subtitle: list.isOfficial ? 'Official' : list.isVerified ? 'Verified' : null
			});
		}

		for (const record of records) {
			const list = record.rankedList;

			if (!list?.id || !list.title || optionsById.has(list.id)) {
				continue;
			}

			optionsById.set(list.id, {
				id: list.id,
				title: list.title,
				identifier: list.identifier
			});
		}

		return Array.from(optionsById.values()).sort((left, right) =>
			left.title.localeCompare(right.title)
		);
	}

	function toRankedListReference(
		list:
			| Pick<PlayerRankedListSummary, 'id' | 'identifier' | 'title' | 'isPlatformer'>
			| null
			| undefined
	): PlayerListRecordEntry['rankedList'] {
		if (!list) {
			return null;
		}

		return {
			id: list.id,
			identifier: list.identifier,
			title: list.title,
			isPlatformer: list.isPlatformer
		};
	}

	function getSelectedListReference(
		listId: number,
		listSummaries: PlayerRankedListSummary[],
		selectedList: PlayerRankedListSummary | null | undefined,
		records: PlayerListRecordEntry[]
	): PlayerListRecordEntry['rankedList'] {
		const summary = listSummaries.find((list) => list.id === listId);

		if (summary) {
			return toRankedListReference(summary);
		}

		if (selectedList?.id === listId) {
			return toRankedListReference(selectedList);
		}

		return records.find((record) => record.rankedList?.id === listId)?.rankedList ?? null;
	}

	function getPayloadListReference(value: unknown, fallbackId: number) {
		if (!value || typeof value !== 'object') {
			return null;
		}

		const list = value as Record<string, unknown>;
		const id = Number(list.id ?? fallbackId);
		const title = typeof list.title === 'string' ? list.title : '';

		if (!Number.isFinite(id) || !title) {
			return null;
		}

		const identifier =
			typeof list.identifier === 'string'
				? list.identifier
				: typeof list.slug === 'string'
					? list.slug
					: String(id);

		return {
			id,
			identifier,
			title,
			isPlatformer: Boolean(list.isPlatformer)
		} satisfies PlayerListRecordEntry['rankedList'];
	}

	function normalizeListRecordsPayload(
		payload: unknown,
		listId: number
	): PlayerListRecordsResponse {
		const response = payload && typeof payload === 'object' ? (payload as any) : {};
		const listReference = getPayloadListReference(response.list, listId);
		const records = Array.isArray(response.data)
			? response.data.map((record: PlayerListRecordEntry) => ({
					...record,
					rankedList: record.rankedList ?? listReference
				}))
			: [];

		return {
			list: response.list ?? null,
			data: records,
			total: typeof response.total === 'number' ? response.total : records.length,
			lastRefreshedAt:
				typeof response.lastRefreshedAt === 'string' || response.lastRefreshedAt === null
					? response.lastRefreshedAt
					: null
		};
	}

	function getRecordIdentityKey(record: PlayerListRecordEntry) {
		if (record.id !== null && record.id !== undefined) {
			return `record:${record.id}`;
		}

		return `level:${record.uid}:${record.levelId}:${record.rankedList?.id ?? ''}`;
	}

	function getRecordLevelKey(record: PlayerListRecordEntry) {
		return `${record.uid}:${record.levelId}`;
	}

	function mergeWithListRecord(
		record: PlayerListRecordEntry,
		listRecord: PlayerListRecordEntry | undefined,
		listReference: PlayerListRecordEntry['rankedList']
	) {
		if (!listRecord) {
			return {
				...record,
				rankedList: record.rankedList ?? listReference
			};
		}

		return {
			...record,
			point: listRecord.point,
			no: listRecord.no,
			formulaScope: listRecord.formulaScope ?? record.formulaScope,
			rankedList: listRecord.rankedList ?? record.rankedList ?? listReference
		};
	}

	function getDisplayRecords(
		playerRecords: PlayerListRecordEntry[],
		allListRecords: PlayerListRecordEntry[],
		listId: number | null,
		listSummaries: PlayerRankedListSummary[],
		selectedList: PlayerRankedListSummary | null | undefined
	) {
		if (listId === null) {
			return playerRecords;
		}

		const listReference = getSelectedListReference(
			listId,
			listSummaries,
			selectedList,
			allListRecords
		);
		const listMatches = allListRecords
			.filter((record) => matchesListFilter(record, listId, listReference?.id ?? null))
			.map((record) => ({
				...record,
				rankedList: record.rankedList ?? listReference
			}));
		const listRecordById = new Map(
			listMatches
				.filter((record) => record.id !== null && record.id !== undefined)
				.map((record) => [record.id, record])
		);
		const listRecordByLevel = new Map(
			listMatches.map((record) => [getRecordLevelKey(record), record])
		);
		const mergedPlayerRecords = playerRecords
			.filter((record) => record.rankedList?.id === listId)
			.map((record) =>
				mergeWithListRecord(
					record,
					record.id !== null && record.id !== undefined
						? listRecordById.get(record.id)
						: listRecordByLevel.get(getRecordLevelKey(record)),
					listReference
				)
			);
		const mergedRecordKeys = new Set(mergedPlayerRecords.map(getRecordIdentityKey));
		const remainingListRecords = listMatches.filter(
			(record) => !mergedRecordKeys.has(getRecordIdentityKey(record))
		);

		return [...mergedPlayerRecords, ...remainingListRecords];
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
		listIdFilter: number | null,
		selectedListId: number | null
	) {
		if (listIdFilter === null) {
			return true;
		}

		return (record.rankedList?.id ?? selectedListId) === listIdFilter;
	}

	function matchesPlatformFilter(
		record: PlayerListRecordEntry,
		platformFilter: PlatformFilterValue
	) {
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
		const nextListId = draftListId;

		appliedLevelId = draftLevelId.trim();
		appliedListId = nextListId;
		appliedPlatform = draftPlatform;
		appliedSortBy = nextListId === null && draftSortBy === 'point' ? 'date_submitted' : draftSortBy;
		appliedSortDirection = draftSortDirection;
		showAcceptedManually = draftShowAcceptedManually;
		showAcceptedAuto = draftShowAcceptedAuto;

		if (nextListId !== null) {
			void loadSelectedListRecords(nextListId);
		} else {
			selectedListRecordsResponse = null;
			selectedListRecordsLoadedForId = null;
		}
	}

	async function loadSelectedListRecords(listId: number) {
		if (selectedListRecordsLoadedForId === listId && selectedListRecordsResponse) {
			return;
		}

		const requestId = ++selectedListRecordsRequestId;
		isLoadingSelectedListRecords = true;

		try {
			const response = await fetch(
				`${import.meta.env.VITE_API_URL}/lists/${listId}/records?uid=${data.player.uid}&end=5000&ignoreRecordSettings=true`
			);

			if (!response.ok) {
				throw new Error(response.statusText);
			}

			const payload = await response.json();

			if (requestId !== selectedListRecordsRequestId) {
				return;
			}

			selectedListRecordsResponse = normalizeListRecordsPayload(payload, listId);
			selectedListRecordsLoadedForId = listId;
		} catch {
			if (requestId === selectedListRecordsRequestId) {
				selectedListRecordsResponse = null;
				selectedListRecordsLoadedForId = listId;
			}
		} finally {
			if (requestId === selectedListRecordsRequestId) {
				isLoadingSelectedListRecords = false;
			}
		}
	}

	function handleListSelection(event: CustomEvent<ListSelectorOption | null>) {
		draftListId = event.detail?.id ?? null;
	}

	function handlePlatformSelection(option: { value?: string } | undefined) {
		draftPlatform = (option?.value as PlatformFilterValue) ?? 'all';
	}

	function handleSortSelection(option: { value?: string } | undefined) {
		const nextSort = (option?.value as RecordSortValue) ?? 'date_submitted';
		draftSortBy = draftListId === null && nextSort === 'point' ? 'date_submitted' : nextSort;
	}

	function handleSortDirectionSelection(option: { value?: string } | undefined) {
		draftSortDirection = (option?.value as RecordSortDirection) ?? 'desc';
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

	function getSubmittedAtTime(record: PlayerListRecordEntry) {
		if (record.createdAt) {
			return new Date(record.createdAt).getTime();
		}

		return record.timestamp ?? 0;
	}

	function formatPoint(value: number | null | undefined) {
		if (typeof value !== 'number' || !Number.isFinite(value)) {
			return '-';
		}

		return String(Math.round(value * 1000) / 1000);
	}

	function compareBySubmittedAt(
		left: PlayerListRecordEntry,
		right: PlayerListRecordEntry,
		sortDirection: RecordSortDirection
	) {
		const submittedAtDiff = getSubmittedAtTime(right) - getSubmittedAtTime(left);

		return sortDirection === 'asc' ? -submittedAtDiff : submittedAtDiff;
	}

	function compareByProgress(
		left: PlayerListRecordEntry,
		right: PlayerListRecordEntry,
		sortDirection: RecordSortDirection
	) {
		const leftProgress = Number(left.progress);
		const rightProgress = Number(right.progress);

		if (!Number.isFinite(leftProgress) && !Number.isFinite(rightProgress)) {
			return 0;
		}

		if (!Number.isFinite(leftProgress)) {
			return 1;
		}

		if (!Number.isFinite(rightProgress)) {
			return -1;
		}

		const leftIsPlatformer = isPlatformerRecord(left);
		const rightIsPlatformer = isPlatformerRecord(right);

		if (leftIsPlatformer && rightIsPlatformer) {
			const progressDiff = leftProgress - rightProgress;

			return sortDirection === 'asc' ? -progressDiff : progressDiff;
		}

		const progressDiff = rightProgress - leftProgress;

		return sortDirection === 'asc' ? -progressDiff : progressDiff;
	}

	function sortRecords(
		recordsToSort: PlayerListRecordEntry[],
		sortBy: RecordSortValue,
		sortDirection: RecordSortDirection,
		canUsePointSort: boolean
	) {
		const nextRecords = [...recordsToSort];
		const compareByManualAcceptance = (
			left: PlayerListRecordEntry,
			right: PlayerListRecordEntry
		) => {
			if (left.acceptedManually === right.acceptedManually) {
				return 0;
			}

			return left.acceptedManually ? -1 : 1;
		};

		if (sortBy === 'point' && canUsePointSort) {
			return nextRecords.sort((left, right) => {
				const acceptanceDiff = compareByManualAcceptance(left, right);

				if (acceptanceDiff !== 0) {
					return acceptanceDiff;
				}

				const pointDiff =
					sortDirection === 'asc'
						? (left.point ?? 0) - (right.point ?? 0)
						: (right.point ?? 0) - (left.point ?? 0);

				if (pointDiff !== 0) {
					return pointDiff;
				}

				return compareBySubmittedAt(left, right, sortDirection);
			});
		}

		if (sortBy === 'progress') {
			return nextRecords.sort((left, right) => {
				const acceptanceDiff = compareByManualAcceptance(left, right);

				if (acceptanceDiff !== 0) {
					return acceptanceDiff;
				}

				const progressDiff = compareByProgress(left, right, sortDirection);

				if (progressDiff !== 0) {
					return progressDiff;
				}

				return compareBySubmittedAt(left, right, sortDirection);
			});
		}

		return nextRecords.sort((left, right) => {
			const acceptanceDiff = compareByManualAcceptance(left, right);

			if (acceptanceDiff !== 0) {
				return acceptanceDiff;
			}

			return compareBySubmittedAt(left, right, sortDirection);
		});
	}
</script>
{#if showRecordControls}
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
				<ListSelector
					id="record-list-filter"
					selectedId={draftListId}
					options={listOptions}
					searchUrl={listSearchUrl}
					placeholder={$_('player.filter.all_lists')}
					searchPlaceholder={$_('list_selector.search_placeholder')}
					emptyLabel={$_('list_selector.no_results')}
					loadingLabel={`${$_('general.loading')}...`}
					allowClear
					clearLabel={$_('player.filter.all_lists')}
					triggerClass="min-w-[220px]"
					on:select={handleListSelection}
				/>
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
			<div class="filterField">
				<Label for="record-sort-filter">{$_('player.filter.sort_by')}</Label>
				<Select.Root selected={selectedSortOption} onSelectedChange={handleSortSelection}>
					<Select.Trigger id="record-sort-filter" class="w-full min-w-[180px]">
						<Select.Value placeholder={$_('player.filter.date_submitted')} />
					</Select.Trigger>
					<Select.Content>
						{#each sortOptions as sortOption}
							<Select.Item
								value={sortOption.value}
								label={sortOption.label}
								disabled={sortOption.disabled}
							>
								{sortOption.label}
							</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>
			</div>
			<div class="filterField">
				<Label for="record-sort-direction-filter">{$_('player.filter.sort_order')}</Label>
				<Select.Root
					selected={selectedSortDirectionOption}
					onSelectedChange={handleSortDirectionSelection}
				>
					<Select.Trigger id="record-sort-direction-filter" class="w-full min-w-[160px]">
						<Select.Value placeholder={$_('player.filter.descending')} />
					</Select.Trigger>
					<Select.Content>
						{#each sortDirectionOptions as sortDirectionOption}
							<Select.Item value={sortDirectionOption.value} label={sortDirectionOption.label}>
								{sortDirectionOption.label}
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

	{#if isLoadingAppliedListRecords}
		<div class="emptyState">{$_('general.loading')}...</div>
	{:else if filteredRecords.length}
		<Table.Root>
			<Table.Caption>
				{$_('player.table.total_record')}: {filteredRecords.length} / {acceptedRecordTotal}
			</Table.Caption>
			<Table.Header>
				<Table.Row>
					<Table.Head>{$_('player.table.level')}</Table.Head>
					<Table.Head class="w-[100px] text-center">{$_('player.table.submitted_on')}</Table.Head>
					<Table.Head class="w-[70px] text-center">{$_('acceptance.short_label')}</Table.Head>
					<Table.Head class="w-[100px] text-center">{$_('player.table.device')}</Table.Head>
					{#if showPointColumn}
						<Table.Head class="w-[90px] text-center">{$_('player.table.point')}</Table.Head>
					{/if}
					<Table.Head class="w-[80px] text-center">{resultColumnLabel}</Table.Head>
					<Table.Head class="w-[56px] text-center"></Table.Head>
				</Table.Row>
			</Table.Header>
			<Table.Body>
				{#each filteredRecords as record}
					<Table.Row
						on:click={(e) => {
							const target = e.target;
							if (target instanceof HTMLElement && target.closest('a, button')) {
								return;
							}

							goto(getRecordDetailHref(record));
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
							<AcceptanceBadge
								acceptedManually={record.acceptedManually}
								acceptedAuto={record.acceptedAuto}
								compact
							/>
						</Table.Cell>
						<Table.Cell class="text-center">
							{record.mobile ? 'Mobile' : 'PC'}
							{#if record.refreshRate}
								<br />({record.refreshRate}fps)
							{/if}
						</Table.Cell>
						{#if showPointColumn}
							<Table.Cell class="text-center">{formatPoint(record.point)}</Table.Cell>
						{/if}
						{#if isPlatformerRecord(record)}
							<Table.Cell class="text-center">{getTimeString(record.progress)}</Table.Cell>
						{:else}
							<Table.Cell class="text-center">{record.progress}%</Table.Cell>
						{/if}
						<Table.Cell class="text-center">
							<a
								class="recordDetailButton"
								href={getRecordDetailHref(record)}
								title="View detail"
								aria-label="View detail"
								data-sveltekit-preload-data="tap"
							>
								<InfoCircled class="h-4 w-4" />
							</a>
						</Table.Cell>
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

	.recordDetailButton {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		height: 32px;
		width: 32px;
		border-radius: 9999px;
		color: hsl(var(--muted-foreground));
		transition:
			background-color 0.15s ease,
			color 0.15s ease;

		&:hover {
			background-color: hsl(var(--muted));
			color: hsl(var(--foreground));
		}
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
