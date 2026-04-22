<script lang="ts">
	import { page } from '$app/stores';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import * as Collapsible from '$lib/components/ui/collapsible';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import { toast } from 'svelte-sonner';
	import { ChevronRight, GripVertical, ListOrdered, Plus, Save, Star, Trash2 } from 'lucide-svelte';
	import { _ } from 'svelte-i18n';

	type BatchAddLevelInput = {
		levelId: number;
		createdAt?: string;
		rating?: number;
		top?: number;
		minProgress?: number;
		videoId?: string;
	};

	type BatchAddLevelsResult = {
		added: number;
		updated: number;
		skipped: number;
		failed: Array<{
			levelId: number;
			message: string;
		}>;
		aborted: boolean;
	};

	type BatchAddProgress = {
		total: number;
		completed: number;
		added: number;
		updated: number;
		skipped: number;
		failed: number;
		phase: 'adding' | 'updating' | 'reordering';
		currentLevelId: number | null;
		retrying: boolean;
		retryElapsedMs: number;
		aborted: boolean;
	};

	export let list: any = null;
	export let canEditLevels = false;
	export let addingLevel = false;
	export let batchAddProgress: BatchAddProgress | null = null;
	export let abortBatchAddImport: () => void | Promise<void> = async () => {};
	export let mutatingLevelId: number | null = null;
	export let savingLevelItemId: number | null = null;
	export let savingReorder = false;
	export let addLevel: (levelId: number) => boolean | Promise<boolean> = async () => false;
	export let addLevels: (levelInputs: BatchAddLevelInput[]) => BatchAddLevelsResult | Promise<BatchAddLevelsResult> = async () => ({
		added: 0,
		updated: 0,
		skipped: 0,
		failed: [],
		aborted: false
	});
	export let removeLevel: (levelId: number) => void | Promise<void> = async () => {};
	export let updateLevelItem: (levelId: number, patch: { rating?: number; minProgress?: number | null; videoID?: string | null; createdAt?: string }) => void | Promise<void> = async () => {};
	export let reorderLevels: (levelIds: number[]) => void | Promise<void> = async () => {};

	let displayedItems: any[] = [];
	let levelIdInput = '';
	let csvInput = '';
	let quickLevelId: number | null = null;
	let draggedIndex: number | null = null;
	let dragOverIndex: number | null = null;
	let editingRatingItemId: number | null = null;
	let editingRatingValue = '';
	let editingMinProgressItemId: number | null = null;
	let editingMinProgressValue: string | number | undefined = '';
	let editingVideoIdItemId: number | null = null;
	let editingVideoIdValue = '';
	let csvFileInput: HTMLInputElement | null = null;
	let csvAddSummary: (BatchAddLevelsResult & { invalidRows: number }) | null = null;
	let addToolsOpen = false;
	const csvExampleColumns = ['levelId', 'createdAt', 'top', 'rating', 'minProgress', 'videoId'];
	const csvExampleRows = [
		['128', '2024-01-05T12:00:00Z', '3', '5', '47', 'dQw4w9WgXcQ'],
		['13519', '2024-02-18T09:30:00Z', '9', '10', '100', 'M7lc1UVf-VE'],
		['65742217', '2024-03-01T00:00:00Z', '1', '7', '22', 'rYEDA3JcQqw']
	];

	$: displayedItems = list?.items ? [...list.items] : [];
	$: canDragReorder = canEditLevels && list?.mode === 'top' && list?.itemSort !== 'created_at' && !savingReorder;
	$: quickLevelId = getQuickLevelId();
	$: csvProgressPercent = batchAddProgress?.total
		? Math.min((batchAddProgress.completed / batchAddProgress.total) * 100, 100)
		: 0;
	$: if (quickLevelId && !levelIdInput) {
		levelIdInput = String(quickLevelId);
	}

	function getCsvProgressPhaseLabel(phase: BatchAddProgress['phase']) {
		if (phase === 'adding') return $_('custom_lists.detail.add_level.csv_progress_phase_adding');
		if (phase === 'updating') return $_('custom_lists.detail.add_level.csv_progress_phase_updating');
		return $_('custom_lists.detail.add_level.csv_progress_phase_reordering');
	}

	function getCsvProgressCurrentLabel(progress: BatchAddProgress) {
		const phase = getCsvProgressPhaseLabel(progress.phase);

		if (progress.currentLevelId) {
			return $_('custom_lists.detail.add_level.csv_progress_current', {
				values: {
					phase,
					levelId: progress.currentLevelId
				}
			});
		}

		return $_('custom_lists.detail.add_level.csv_progress_current_no_level', {
			values: { phase }
		});
	}
	function getQuickLevelId() {
		const raw = $page.url.searchParams.get('levelId');
		const parsed = raw ? Number.parseInt(raw, 10) : Number.NaN;
		return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
	}

	function getTimeString(ms: number) {
		const minutes = Math.floor(ms / 60000);
		const seconds = Math.floor((ms % 60000) / 1000);
		const milliseconds = ms % 1000;
		return `${minutes}:${seconds.toString().padStart(2, '0')}.${milliseconds}`;
	}

	function getEffectiveMinProgress(item: any) {
		return item.minProgress ?? item.level?.minProgress ?? null;
	}

	function getMinProgressLabel(item: any) {
		const minProgress = getEffectiveMinProgress(item);
		if (minProgress == null) return $_('custom_lists.detail.levels.min_progress_label');
		const value = list?.isPlatformer
			? `${getTimeString(minProgress)} Base`
			: `${minProgress}% Min`;
		return item.minProgress == null ? value : `${value} *`;
	}

	function getEffectiveVideoId(item: any) {
		return item.videoID ?? item.level?.videoID ?? null;
	}

	function getVideoIdLabel(item: any) {
		const videoId = getEffectiveVideoId(item);

		if (!videoId) {
			return $_('custom_lists.detail.levels.video_id_label');
		}

		const suffix = item.videoID == null ? '' : ' *';
		return `${$_('custom_lists.detail.levels.video_id_label')}: ${videoId}${suffix}`;
	}

	function getListItemTop(item: any, index: number) {
		if (item.position == null) {
			return index + 1;
		}

		return list?.isOfficial ? Number(item.position) : Number(item.position) + 1;
	}

	function normalizeVideoIdValue(value: string) {
		const trimmed = value.trim();
		const patterns = [
			/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
			/^([a-zA-Z0-9_-]{11})$/
		];

		for (const pattern of patterns) {
			const match = trimmed.match(pattern);
			if (match) return match[1];
		}

		return null;
	}

	function startRatingEdit(item: any) {
		if (!canEditLevels) return;
		editingRatingItemId = item.id;
		editingRatingValue = String(item.rating ?? 5);
	}

	function startMinProgressEdit(item: any) {
		if (!canEditLevels) return;
		editingMinProgressItemId = item.id;
		editingMinProgressValue = item.minProgress == null ? '' : String(item.minProgress);
	}

	function startVideoIdEdit(item: any) {
		if (!canEditLevels) return;
		editingVideoIdItemId = item.id;
		editingVideoIdValue = item.videoID ?? '';
	}

	function cancelMinProgressEdit() {
		editingMinProgressItemId = null;
		editingMinProgressValue = '';
	}

	function cancelVideoIdEdit() {
		editingVideoIdItemId = null;
		editingVideoIdValue = '';
	}

	function handleMinProgressBlur(event: FocusEvent) {
		const nextTarget = event.relatedTarget;
		if (nextTarget instanceof HTMLElement && nextTarget.dataset.minProgressAction) {
			return;
		}

		cancelMinProgressEdit();
	}

	function handleVideoIdBlur(event: FocusEvent) {
		const nextTarget = event.relatedTarget;
		if (nextTarget instanceof HTMLElement && nextTarget.dataset.videoIdAction) {
			return;
		}

		cancelVideoIdEdit();
	}

	async function saveRatingEdit(levelId: number) {
		const rating = Number.parseInt(editingRatingValue, 10);
		editingRatingItemId = null;
		if (!Number.isInteger(rating) || rating < 1 || rating > 10) {
			toast.error($_('custom_lists.toast.rating_invalid'));
			return;
		}
		await updateLevelItem(levelId, { rating });
	}

	async function saveMinProgressEdit(levelId: number) {
		if (!list) return;
		const rawValue = editingMinProgressValue == null ? '' : String(editingMinProgressValue).trim();
		editingMinProgressItemId = null;

		if (!rawValue.length) {
			await updateLevelItem(levelId, { minProgress: null });
			return;
		}

		const minProgress = Number.parseInt(rawValue, 10);
		if (!Number.isInteger(minProgress) || minProgress < 0 || (!list.isPlatformer && minProgress > 100)) {
			toast.error($_('custom_lists.toast.min_progress_invalid'));
			return;
		}
		await updateLevelItem(levelId, { minProgress });
	}

	async function saveVideoIdEdit(levelId: number) {
		const rawValue = editingVideoIdValue.trim();
		editingVideoIdItemId = null;

		if (!rawValue.length) {
			await updateLevelItem(levelId, { videoID: null });
			return;
		}

		const videoID = normalizeVideoIdValue(rawValue);

		if (!videoID) {
			toast.error($_('custom_lists.toast.video_id_invalid'));
			return;
		}

		await updateLevelItem(levelId, { videoID });
	}

	function onDragStart(event: DragEvent, index: number) {
		draggedIndex = index;
		if (event.dataTransfer) {
			event.dataTransfer.effectAllowed = 'move';
		}
	}

	function onDragOver(event: DragEvent, index: number) {
		event.preventDefault();
		if (event.dataTransfer) {
			event.dataTransfer.dropEffect = 'move';
		}
		dragOverIndex = index;
	}

	function onDragEnd() {
		draggedIndex = null;
		dragOverIndex = null;
	}

	function onDrop(event: DragEvent, targetIndex: number) {
		event.preventDefault();
		if (draggedIndex === null || draggedIndex === targetIndex) {
			onDragEnd();
			return;
		}

		const nextItems = [...displayedItems];
		const [moved] = nextItems.splice(draggedIndex, 1);
		nextItems.splice(targetIndex, 0, moved);
		displayedItems = nextItems;
		onDragEnd();
		reorderLevels(nextItems.map((item) => item.levelId));
	}

	async function submitAddLevel() {
		const levelId = Number.parseInt(levelIdInput, 10);
		if (!Number.isInteger(levelId) || levelId <= 0) {
			toast.error($_('custom_lists.toast.level_id_invalid'));
			return;
		}

		const added = await addLevel(levelId);
		if (added) {
			levelIdInput = '';
		}
	}

	function parseDelimitedLine(line: string, delimiter: string) {
		const values: string[] = [];
		let value = '';
		let inQuotes = false;

		for (let index = 0; index < line.length; index += 1) {
			const char = line[index];

			if (char === '"') {
				if (inQuotes && line[index + 1] === '"') {
					value += '"';
					index += 1;
					continue;
				}

				inQuotes = !inQuotes;
				continue;
			}

			if (!inQuotes && char === delimiter) {
				values.push(value.trim());
				value = '';
				continue;
			}

			value += char;
		}

		values.push(value.trim());
		return values;
	}

	function countDelimiter(line: string, delimiter: string) {
		let count = 0;
		let inQuotes = false;

		for (let index = 0; index < line.length; index += 1) {
			const char = line[index];

			if (char === '"') {
				if (inQuotes && line[index + 1] === '"') {
					index += 1;
					continue;
				}

				inQuotes = !inQuotes;
				continue;
			}

			if (!inQuotes && char === delimiter) {
				count += 1;
			}
		}

		return count;
	}

	function detectCsvDelimiter(lines: string[]) {
		const firstLine = lines.find((line) => line.trim().length > 0) || '';
		const delimiters: Array<',' | ';' | '\t'> = [',', ';', '\t'];

		return delimiters.reduce((selected, delimiter) => (
			countDelimiter(firstLine, delimiter) > countDelimiter(firstLine, selected) ? delimiter : selected
		), ',');
	}

	function normalizeColumnName(value: string) {
		return value.trim().toLowerCase().replace(/[\s_-]+/g, '');
	}

	function getCsvColumnIndexes(cells: string[]) {
		const indexes: { levelId?: number; createdAt?: number; top?: number; rating?: number; minProgress?: number; videoId?: number } = {};

		cells.forEach((cell, index) => {
			const normalizedCell = normalizeColumnName(cell);

			if (indexes.levelId === undefined && ['levelid', 'id', 'level'].includes(normalizedCell)) {
				indexes.levelId = index;
			}

			if (indexes.top === undefined && ['top', 'rank', 'position', 'listtop'].includes(normalizedCell)) {
				indexes.top = index;
			}

			if (indexes.createdAt === undefined && ['createdat', 'created', 'createdtime', 'createddate', 'datecreated'].includes(normalizedCell)) {
				indexes.createdAt = index;
			}

			if (indexes.rating === undefined && ['rating', 'rate'].includes(normalizedCell)) {
				indexes.rating = index;
			}

			if (indexes.minProgress === undefined && ['minprogress', 'minimumprogress', 'basetime'].includes(normalizedCell)) {
				indexes.minProgress = index;
			}

			if (indexes.videoId === undefined && ['videoid', 'video', 'youtubeid', 'youtubevideoid'].includes(normalizedCell)) {
				indexes.videoId = index;
			}
		});

		return indexes.levelId === undefined ? null : indexes as { levelId: number; createdAt?: number; top?: number; rating?: number; minProgress?: number; videoId?: number };
	}

	function parsePositiveIntegerCell(value: string | undefined) {
		const normalizedValue = value?.replace(/^\uFEFF/, '').trim();
		if (!normalizedValue?.length || !/^\d+$/.test(normalizedValue)) {
			return null;
		}

		const parsedValue = Number.parseInt(normalizedValue, 10);
		return Number.isInteger(parsedValue) && parsedValue > 0 ? parsedValue : null;
	}

	function parseOptionalIntegerCell(value: string | undefined) {
		const normalizedValue = value?.trim();
		if (!normalizedValue?.length) {
			return undefined;
		}

		if (!/^\d+$/.test(normalizedValue)) {
			return Number.NaN;
		}

		return Number.parseInt(normalizedValue, 10);
	}

	function parseOptionalVideoIdCell(value: string | undefined) {
		const normalizedValue = value?.trim();
		if (!normalizedValue?.length) {
			return undefined;
		}

		return normalizeVideoIdValue(normalizedValue);
	}

	function parseOptionalCreatedAtCell(value: string | undefined) {
		const normalizedValue = value?.trim();
		if (!normalizedValue?.length) {
			return undefined;
		}

		const timestamp = Date.parse(normalizedValue);
		if (Number.isNaN(timestamp)) {
			return null;
		}

		return new Date(timestamp).toISOString();
	}

	function parseSingleLineIds(input: string) {
		const tokens = input.split(/[\s,;\t]+/).map((token) => token.trim()).filter(Boolean);
		const levelInputs: BatchAddLevelInput[] = [];
		let invalidRows = 0;

		for (const token of tokens) {
			if (!/^\d+$/.test(token)) {
				invalidRows += 1;
				continue;
			}

			const levelId = Number.parseInt(token, 10);
			if (!Number.isInteger(levelId) || levelId <= 0) {
				invalidRows += 1;
				continue;
			}

			levelInputs.push({ levelId });
		}

		return { levelInputs, invalidRows };
	}

	function parseCsvLevelInputs(rawInput: string) {
		const input = rawInput.replace(/^\uFEFF/, '').trim();
		if (!input) {
			return {
				levelInputs: [],
				invalidRows: 0
			};
		}

		if (!input.includes('\n') && /^[\d\s,;\t]+$/.test(input)) {
			return parseSingleLineIds(input);
		}

		const lines = input.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
		const delimiter = detectCsvDelimiter(lines);
		const headerIndexes = lines.length ? getCsvColumnIndexes(parseDelimitedLine(lines[0], delimiter)) : null;
		const startIndex = headerIndexes ? 1 : 0;
		const levelInputs: BatchAddLevelInput[] = [];
		let invalidRows = 0;

		for (let index = startIndex; index < lines.length; index += 1) {
			const cells = parseDelimitedLine(lines[index], delimiter);
			if (!cells.some((cell) => cell.length)) {
				continue;
			}

			const levelIdCell = headerIndexes ? cells[headerIndexes.levelId] : cells[0];
			const createdAtCell = headerIndexes
				? (headerIndexes.createdAt === undefined ? undefined : cells[headerIndexes.createdAt])
				: cells[1];
			const ratingCell = headerIndexes
				? (headerIndexes.rating === undefined ? undefined : cells[headerIndexes.rating])
				: (list?.mode === 'top' ? cells[3] : cells[2]);
			const topCell = headerIndexes
				? (headerIndexes.top === undefined ? undefined : cells[headerIndexes.top])
				: (list?.mode === 'top' ? cells[2] : undefined);
			const minProgressCell = headerIndexes
				? (headerIndexes.minProgress === undefined ? undefined : cells[headerIndexes.minProgress])
				: (list?.mode === 'top' ? cells[4] : cells[3]);
			const videoIdCell = headerIndexes
				? (headerIndexes.videoId === undefined ? undefined : cells[headerIndexes.videoId])
				: (list?.mode === 'top' ? cells[5] : cells[4]);

			const levelId = parsePositiveIntegerCell(levelIdCell);
			const createdAt = parseOptionalCreatedAtCell(createdAtCell);
			const rating = parseOptionalIntegerCell(ratingCell);
			const top = parseOptionalIntegerCell(topCell);
			const minProgress = parseOptionalIntegerCell(minProgressCell);
			const videoId = parseOptionalVideoIdCell(videoIdCell);

			if (levelId === null) {
				invalidRows += 1;
				continue;
			}

			if (rating !== undefined && (!Number.isInteger(rating) || rating < 1 || rating > 10)) {
				invalidRows += 1;
				continue;
			}

			if (top !== undefined && (!Number.isInteger(top) || top < 1)) {
				invalidRows += 1;
				continue;
			}

			if (
				minProgress !== undefined
				&& (
					!Number.isInteger(minProgress)
					|| minProgress < 0
					|| (!list?.isPlatformer && minProgress > 100)
				)
			) {
				invalidRows += 1;
				continue;
			}

			if (videoId === null) {
				invalidRows += 1;
				continue;
			}

			if (createdAt === null) {
				invalidRows += 1;
				continue;
			}

			const levelInput: BatchAddLevelInput = { levelId };

			if (typeof createdAt === 'string' && createdAt.length) {
				levelInput.createdAt = createdAt;
			}

			if (Number.isInteger(rating)) {
				levelInput.rating = rating;
			}

			if (Number.isInteger(top)) {
				levelInput.top = top;
			}

			if (Number.isInteger(minProgress)) {
				levelInput.minProgress = minProgress;
			}

			if (typeof videoId === 'string' && videoId.length) {
				levelInput.videoId = videoId;
			}

			levelInputs.push(levelInput);
		}

		return {
			levelInputs,
			invalidRows
		};
	}

	async function handleCsvFileChange(event: Event) {
		const input = event.currentTarget as HTMLInputElement | null;
		const file = input?.files?.[0];
		if (!file) return;

		try {
			csvInput = await file.text();
			csvAddSummary = null;
		} catch {
			toast.error($_('custom_lists.toast.failed_read_csv'));
		} finally {
			if (input) {
				input.value = '';
			}
		}
	}

	async function submitAddCsvLevels() {
		const { levelInputs, invalidRows } = parseCsvLevelInputs(csvInput);

		if (!levelInputs.length) {
			csvAddSummary = {
				added: 0,
				updated: 0,
				skipped: 0,
				failed: [],
				aborted: false,
				invalidRows
			} as BatchAddLevelsResult & { invalidRows: number };
			toast.error($_('custom_lists.toast.level_csv_invalid'));
			return;
		}

		const summary = await addLevels(levelInputs);
		csvAddSummary = {
			...summary,
			invalidRows
		};

		const resultMessage = $_(
			summary.aborted
				? 'custom_lists.detail.add_level.csv_result_aborted'
				: 'custom_lists.detail.add_level.csv_result',
			{
			values: {
				added: summary.added,
				updated: summary.updated,
				skipped: summary.skipped,
				failed: summary.failed.length,
				invalid: invalidRows
			}
			}
		);

		if (summary.aborted) {
			toast.info($_('custom_lists.detail.add_level.csv_aborted_toast'));
			return;
		}

		if ((summary.added > 0 || summary.updated > 0) && summary.failed.length === 0 && invalidRows === 0) {
			toast.success(resultMessage);
			csvInput = '';
			return;
		}

		if (summary.added > 0 || summary.updated > 0) {
			toast.info(resultMessage);
			return;
		}

		toast.error(resultMessage);
	}
</script>

<div class="tabContent">
	{#if canEditLevels}
		<Collapsible.Root bind:open={addToolsOpen}>
			<div class="toolCard addToolsCard">
				<Button
					type="button"
					variant="ghost"
					class="h-auto w-full justify-between p-0 text-left hover:bg-transparent hover:text-current focus-visible:ring-0 focus-visible:ring-offset-0"
					aria-expanded={addToolsOpen}
					aria-controls="csv-add-tools-panel"
					on:click={() => {
						addToolsOpen = !addToolsOpen;
					}}
				>
					<div class="addToolsTriggerText">
						<h2 class="toolHeading">{$_('custom_lists.detail.add_level.heading')}</h2>
						<p class="addToolsSummaryHint">{$_('custom_lists.detail.add_level.hint')}</p>
					</div>
					<span class="addToolsIndicator" aria-hidden="true" class:isOpen={addToolsOpen}>
						<ChevronRight class="h-4 w-4" />
					</span>
				</Button>

				<Collapsible.Content id="csv-add-tools-panel">
					<div class="addToolsBody">
				<div class="field">
					<label for="level-id">{$_('custom_lists.detail.add_level.id_label')}</label>
					<Input id="level-id" bind:value={levelIdInput} inputmode="numeric" />
				</div>
				<div class="formActions">
					<Button type="button" on:click={submitAddLevel} disabled={addingLevel}>
						<Plus class="mr-2 h-4 w-4" />
						{$_('custom_lists.detail.add_level.button')}
					</Button>
				</div>

				<div class="toolDivider"></div>

				<div class="field">
					<label for="level-csv">{$_('custom_lists.detail.add_level.csv_label')}</label>
					<div class="csvInputWrap">
						<Textarea
							id="level-csv"
							rows={6}
							bind:value={csvInput}
							placeholder={$_('custom_lists.detail.add_level.csv_placeholder')}
							on:input={() => {
								csvAddSummary = null;
							}}
						/>
					</div>
				</div>
				<p class="hint">{$_('custom_lists.detail.add_level.csv_hint')}</p>
				<div class="csvExampleCard">
					<p class="csvExampleTitle">{$_('custom_lists.detail.add_level.csv_example_title')}</p>
					<p class="csvExampleHint">{$_('custom_lists.detail.add_level.csv_example_hint')}</p>
					<div class="csvExampleTableWrap">
						<table class="csvExampleTable">
							<thead>
								<tr>
									{#each csvExampleColumns as column}
										<th scope="col">{column}</th>
									{/each}
								</tr>
							</thead>
							<tbody>
								{#each csvExampleRows as row}
									<tr>
										{#each row as cell}
											<td>{cell}</td>
										{/each}
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				</div>
				<div class="formActions">
					<input
						bind:this={csvFileInput}
						class="csvFileInput"
						id="level-csv-file"
						type="file"
						accept=".csv,text/csv"
						on:change={handleCsvFileChange}
					/>
					<Button
						type="button"
						variant="outline"
						on:click={() => csvFileInput?.click()}
						disabled={addingLevel}
					>
						{$_('custom_lists.detail.add_level.csv_file_button')}
					</Button>
					<Button type="button" on:click={submitAddCsvLevels} disabled={addingLevel}>
						<Plus class="mr-2 h-4 w-4" />
						{$_('custom_lists.detail.add_level.csv_button')}
					</Button>
				</div>

				{#if batchAddProgress}
					<div class="csvProgress" aria-live="polite">
						<div class="csvProgressHeader">
							<div class="csvProgressHeaderCopy">
								<p class="csvProgressTitle">{$_('custom_lists.detail.add_level.csv_progress_label')}</p>
								<p class="csvProgressValue">{batchAddProgress.completed}/{batchAddProgress.total}</p>
							</div>
							{#if addingLevel}
								<Button type="button" variant="outline" size="sm" on:click={() => abortBatchAddImport()}>
									{$_('custom_lists.detail.add_level.csv_abort_button')}
								</Button>
							{/if}
						</div>
						<div
							class="csvProgressBar"
							role="progressbar"
							aria-valuemin="0"
							aria-valuemax={batchAddProgress.total}
							aria-valuenow={batchAddProgress.completed}
						>
							<div class="csvProgressFill" style={`width: ${csvProgressPercent}%`}></div>
						</div>
						<p class="csvProgressStats">
							{$_('custom_lists.detail.add_level.csv_progress_status', {
								values: {
									completed: batchAddProgress.completed,
									total: batchAddProgress.total,
									added: batchAddProgress.added,
									updated: batchAddProgress.updated,
									skipped: batchAddProgress.skipped,
									failed: batchAddProgress.failed
								}
							})}
						</p>
						<p class="csvProgressWarning">{$_('custom_lists.detail.add_level.csv_progress_warning')}</p>
						<p class="csvProgressCurrent">
							{batchAddProgress.aborted
								? $_('custom_lists.detail.add_level.csv_progress_aborted')
								: addingLevel
									? getCsvProgressCurrentLabel(batchAddProgress)
									: $_('custom_lists.detail.add_level.csv_progress_complete')}
						</p>
						{#if batchAddProgress.retrying}
							<p class="csvProgressRetry">
								{$_('custom_lists.detail.add_level.csv_progress_retry')}
							</p>
						{/if}
					</div>
				{/if}

				{#if csvAddSummary}
					<div
						class="csvSummary"
						class:hasIssues={csvAddSummary.failed.length > 0 || csvAddSummary.invalidRows > 0}
					>
						<p>
							{$_(csvAddSummary.aborted
								? 'custom_lists.detail.add_level.csv_result_aborted'
								: 'custom_lists.detail.add_level.csv_result', {
								values: {
									added: csvAddSummary.added,
									updated: csvAddSummary.updated,
									skipped: csvAddSummary.skipped,
									failed: csvAddSummary.failed.length,
									invalid: csvAddSummary.invalidRows
								}
							})}
						</p>
						{#if csvAddSummary.failed.length > 0}
							<p class="csvSummaryHeading">{$_('custom_lists.detail.add_level.csv_failures')}</p>
							<ul class="csvFailureList">
								{#each csvAddSummary.failed.slice(0, 5) as failure}
									<li>#{failure.levelId}: {failure.message}</li>
								{/each}
								{#if csvAddSummary.failed.length > 5}
									<li>
										{$_('custom_lists.detail.add_level.csv_failure_more', {
											values: { count: csvAddSummary.failed.length - 5 }
										})}
									</li>
								{/if}
							</ul>
						{/if}
					</div>
				{/if}
					</div>
				</Collapsible.Content>
			</div>
		</Collapsible.Root>
	{/if}

	<div class="levelsSection">
		<div class="sectionHeader">
			<h2>{$_('custom_lists.detail.levels.heading')}</h2>
			<div class="sectionMeta">
				{#if list?.mode === 'rating'}
					<Badge variant="secondary">
						<Star class="mr-1 h-3 w-3" />
						{$_('custom_lists.detail.edit.mode_rating')}
					</Badge>
				{:else}
					<Badge variant="secondary">
						<ListOrdered class="mr-1 h-3 w-3" />
						{$_('custom_lists.detail.edit.mode_top')}
					</Badge>
				{/if}
				<Badge variant="outline">{displayedItems.length}</Badge>
			</div>
		</div>

		{#if displayedItems.length === 0}
			<div class="emptyState slim">
				<h3>{$_('custom_lists.detail.levels.empty_title')}</h3>
				<p>{canEditLevels ? $_('custom_lists.detail.levels.empty_owner') : $_('custom_lists.detail.levels.empty_visitor')}</p>
			</div>
		{:else}
			<div class="levelList">
				{#each displayedItems as item, index}
					<div
						class="levelItem"
						class:isDraggable={canDragReorder}
						class:dragOver={canDragReorder && dragOverIndex === index}
						class:dragging={canDragReorder && draggedIndex === index}
						role="listitem"
						draggable={canDragReorder}
						on:dragstart={(event) => {
							if (canDragReorder) {
								onDragStart(event, index);
							}
						}}
						on:dragover={(event) => {
							if (canDragReorder) {
								onDragOver(event, index);
							}
						}}
						on:drop={(event) => {
							if (canDragReorder) {
								onDrop(event, index);
							}
						}}
						on:dragend={() => {
							if (canDragReorder) {
								onDragEnd();
							}
						}}
					>
						<div class="levelRow">
							{#if canDragReorder}
								<div class="dragHandle" title={$_('custom_lists.detail.levels.drag_hint')}>
									<GripVertical class="h-5 w-5" />
								</div>
							{/if}

							<div class="rankBadge">#{getListItemTop(item, index)}</div>

							<div class="levelBody">
								{#if item.level}
									<a class="levelLink" href={`/level/${item.levelId}`}>{item.level.name || `Level #${item.levelId}`}</a>
									<p class="levelMeta">
										{$_('custom_lists.detail.levels.by')} {item.level.creator || 'Unknown'}
										{#if item.level.difficulty} • {item.level.difficulty}{/if}
										{#if item.level.isPlatformer} • {$_('custom_lists.detail.levels.platformer')}{/if}
									</p>
								{:else}
									<span class="levelLink missing">{$_('custom_lists.detail.levels.unavailable', { values: { id: item.levelId } })}</span>
									<p class="levelMeta">{$_('custom_lists.detail.levels.unavailable_desc')}</p>
								{/if}
							</div>

							<div class="levelActions">
								{#if list?.mode === 'rating'}
									{#if canEditLevels && editingRatingItemId === item.id}
										<input
											class="inlineInput ratingInput"
											type="number"
											min="1"
											max="10"
											bind:value={editingRatingValue}
											on:blur={() => saveRatingEdit(item.levelId)}
											on:keydown={(event) => event.key === 'Enter' && saveRatingEdit(item.levelId)}
										/>
									{:else}
										<button
											class="chipBtn"
											class:editable={canEditLevels}
											type="button"
											on:click={canEditLevels ? () => startRatingEdit(item) : undefined}
											title={canEditLevels ? $_('custom_lists.detail.levels.rating_edit_hint') : undefined}
										>
											★ {item.rating ?? 5}
										</button>
									{/if}
								{/if}

								{#if canEditLevels && editingMinProgressItemId === item.id}
									<input
										class="inlineInput minProgressInput"
										type="number"
										min="0"
										max={list?.isPlatformer ? undefined : '100'}
										placeholder={item.level?.minProgress != null ? String(item.level.minProgress) : undefined}
										bind:value={editingMinProgressValue}
										on:blur={handleMinProgressBlur}
										on:keydown={(event) => {
											if (event.key === 'Enter') {
												event.preventDefault();
												saveMinProgressEdit(item.levelId);
											}
											if (event.key === 'Escape') {
												event.preventDefault();
												cancelMinProgressEdit();
											}
										}}
									/>
									<div class="inlineEditActions">
										<button
											type="button"
											class="inlineEditBtn inlineEditBtnPrimary"
											data-min-progress-action="save"
											on:mousedown|preventDefault
											on:click={() => saveMinProgressEdit(item.levelId)}
											disabled={savingLevelItemId === item.levelId}
										>
											<Save class="mr-1.5 h-3.5 w-3.5" />
											{$_('custom_lists.detail.levels.save_button')}
										</button>
										<button
											type="button"
											class="inlineEditBtn inlineEditBtnSecondary"
											data-min-progress-action="cancel"
											on:mousedown|preventDefault
											on:click={cancelMinProgressEdit}
											disabled={savingLevelItemId === item.levelId}
										>
											{$_('custom_lists.detail.levels.cancel_button')}
										</button>
									</div>
								{:else}
									<button
										class="chipBtn"
										class:editable={canEditLevels}
										type="button"
										on:click={canEditLevels ? () => startMinProgressEdit(item) : undefined}
										title={canEditLevels ? $_('custom_lists.detail.levels.min_progress_edit_hint') : undefined}
									>
										{getMinProgressLabel(item)}
									</button>
								{/if}

									{#if canEditLevels && editingVideoIdItemId === item.id}
										<input
											class="inlineInput videoIdInput"
											type="text"
											placeholder={item.videoID == null && item.level?.videoID ? item.level.videoID : undefined}
											bind:value={editingVideoIdValue}
											on:blur={handleVideoIdBlur}
											on:keydown={(event) => {
												if (event.key === 'Enter') {
													event.preventDefault();
													saveVideoIdEdit(item.levelId);
												}
												if (event.key === 'Escape') {
													event.preventDefault();
													cancelVideoIdEdit();
												}
											}}
										/>
										<div class="inlineEditActions">
											<button
												type="button"
												class="inlineEditBtn inlineEditBtnPrimary"
												data-video-id-action="save"
												on:mousedown|preventDefault
												on:click={() => saveVideoIdEdit(item.levelId)}
												disabled={savingLevelItemId === item.levelId}
											>
												<Save class="mr-1.5 h-3.5 w-3.5" />
												{$_('custom_lists.detail.levels.save_button')}
											</button>
											<button
												type="button"
												class="inlineEditBtn inlineEditBtnSecondary"
												data-video-id-action="cancel"
												on:mousedown|preventDefault
												on:click={cancelVideoIdEdit}
												disabled={savingLevelItemId === item.levelId}
											>
												{$_('custom_lists.detail.levels.cancel_button')}
											</button>
										</div>
									{:else}
										<button
											class="chipBtn"
											class:editable={canEditLevels}
											type="button"
											on:click={canEditLevels ? () => startVideoIdEdit(item) : undefined}
											title={canEditLevels ? $_('custom_lists.detail.levels.video_id_edit_hint') : undefined}
										>
											{getVideoIdLabel(item)}
										</button>
									{/if}

								<Badge variant="outline">{$_('custom_lists.detail.levels.id_badge', { values: { id: item.levelId } })}</Badge>

								{#if canEditLevels}
									<Button
										variant="destructive"
										size="sm"
										on:click={() => removeLevel(item.levelId)}
										disabled={mutatingLevelId === item.levelId}
									>
										<Trash2 class="mr-1.5 h-3.5 w-3.5" />
										{$_('custom_lists.detail.levels.remove')}
									</Button>
								{/if}
							</div>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>
</div>

<style lang="scss">
	.tabContent {
		display: flex;
		flex-direction: column;
		gap: 16px;
		margin-top: 16px;
	}

	.toolCard {
		background: hsl(var(--card));
		border: 1px solid hsl(var(--border));
		border-radius: 12px;
		padding: 22px;
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.toolHeading {
		margin: 0;
		font-size: 1.1rem;
		font-weight: 600;
	}

	.addToolsCard {
		overflow: hidden;
	}

	.addToolsSummaryHint {
		margin: 6px 0 0;
		font-size: 0.82rem;
		color: hsl(var(--muted-foreground));
	}

	.addToolsTriggerText {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		min-width: 0;
	}

	.addToolsIndicator {
		width: 32px;
		height: 32px;
		border-radius: 999px;
		border: 1px solid hsl(var(--border));
		display: inline-flex;
		align-items: center;
		justify-content: center;
		transition: transform 0.15s ease;
		flex-shrink: 0;
	}

	.addToolsIndicator :global(svg) {
		transition: transform 0.15s ease;
	}

	.addToolsIndicator.isOpen :global(svg) {
		transform: rotate(90deg);
	}

	.addToolsBody {
		margin-top: 16px;
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.toolDivider {
		height: 1px;
		background: hsl(var(--border));
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	label {
		font-size: 0.9rem;
		font-weight: 500;
	}

	.hint {
		font-size: 0.8rem;
		color: hsl(var(--muted-foreground));
		margin: 0;
	}

	.formActions {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
		margin-top: 4px;
	}

	.csvInputWrap :global(textarea) {
		min-height: 140px;
		resize: vertical;
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
	}

	.csvFileInput {
		display: none;
	}

	.csvSummary {
		border: 1px solid hsl(var(--border));
		border-radius: 10px;
		background: hsl(var(--muted) / 0.12);
		padding: 14px 16px;
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.csvSummary.hasIssues {
		border-color: hsl(var(--primary));
		background: hsl(var(--primary) / 0.08);
	}

	.csvSummary p {
		margin: 0;
		font-size: 0.9rem;
	}

	.csvProgress {
		border: 1px solid hsl(var(--border));
		border-radius: 10px;
		background: hsl(var(--muted) / 0.08);
		padding: 14px 16px;
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.csvProgressHeader {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
	}

	.csvProgressHeaderCopy {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.csvProgressTitle,
	.csvProgressValue,
	.csvProgressStats,
	.csvProgressCurrent,
	.csvProgressRetry {
		margin: 0;
	}

	.csvProgressTitle {
		font-size: 0.9rem;
		font-weight: 600;
	}

	.csvProgressValue {
		font-size: 0.82rem;
		color: hsl(var(--muted-foreground));
	}

	.csvProgressBar {
		height: 10px;
		border-radius: 999px;
		background: hsl(var(--muted));
		overflow: hidden;
	}

	.csvProgressFill {
		height: 100%;
		background: linear-gradient(90deg, hsl(var(--primary)), hsl(var(--primary) / 0.65));
		transition: width 0.2s ease;
	}

	.csvProgressStats,
	.csvProgressCurrent,
	.csvProgressRetry {
		font-size: 0.85rem;
	}

	.csvProgressCurrent,
	.csvProgressRetry {
		color: hsl(var(--muted-foreground));
	}

	.csvSummaryHeading {
		font-weight: 600;
	}

	.csvExampleCard {
		border: 1px solid hsl(var(--border));
		border-radius: 10px;
		background: hsl(var(--muted) / 0.08);
		padding: 14px 16px;
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.csvExampleTitle,
	.csvExampleHint {
		margin: 0;
	}

	.csvExampleTitle {
		font-size: 0.9rem;
		font-weight: 600;
	}

	.csvExampleHint {
		font-size: 0.82rem;
		color: hsl(var(--muted-foreground));
	}

	.csvExampleTableWrap {
		overflow-x: auto;
	}

	.csvExampleTable {
		width: 100%;
		min-width: 280px;
		border-collapse: collapse;
		background: hsl(var(--background));
		border: 1px solid hsl(var(--border));
		border-radius: 8px;
		overflow: hidden;
	}

	.csvExampleTable th,
	.csvExampleTable td {
		padding: 10px 12px;
		border-bottom: 1px solid hsl(var(--border));
		font-size: 0.8rem;
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
	}

	.csvExampleTable th {
		text-align: left;
		font-weight: 700;
		background: hsl(var(--muted) / 0.22);
	}

	.csvExampleTable tbody tr:last-child td {
		border-bottom: 0;
	}

	.csvFailureList {
		margin: 0;
		padding-left: 18px;
		font-size: 0.85rem;
		color: hsl(var(--muted-foreground));
	}

	.csvFailureList li + li {
		margin-top: 4px;
	}

	.levelsSection {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.sectionHeader {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
	}

	.sectionHeader h2 {
		margin: 0;
		font-size: 1.2rem;
		font-weight: 600;
	}

	.sectionMeta {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.levelList {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.levelItem {
		background: hsl(var(--card));
		border: 1px solid hsl(var(--border));
		border-radius: 10px;
		padding: 14px 18px;
		transition: opacity 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
	}

	.levelItem.isDraggable {
		cursor: grab;
	}

	.levelItem.isDraggable:active {
		cursor: grabbing;
	}

	.levelItem.dragging {
		opacity: 0.4;
	}

	.levelItem.dragOver {
		border-color: hsl(var(--primary));
		box-shadow: 0 0 0 2px hsl(var(--primary) / 0.25);
	}

	.levelRow {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.dragHandle {
		color: hsl(var(--muted-foreground));
		flex-shrink: 0;
		display: flex;
		align-items: center;
	}

	.rankBadge {
		font-size: 0.85rem;
		font-weight: 700;
		color: hsl(var(--muted-foreground));
		min-width: 28px;
		text-align: center;
		flex-shrink: 0;
	}

	.levelBody {
		display: flex;
		flex-direction: column;
		gap: 2px;
		flex: 1;
		min-width: 0;
	}

	.levelLink {
		font-weight: 600;
		text-decoration: none;
		color: hsl(var(--foreground));
		font-size: 0.95rem;
	}

	.levelLink:hover {
		text-decoration: underline;
	}

	.levelLink.missing {
		color: hsl(var(--destructive));
	}

	.levelMeta {
		margin: 0;
		font-size: 0.8rem;
		color: hsl(var(--muted-foreground));
	}

	.levelActions {
		display: flex;
		align-items: center;
		gap: 8px;
		flex-wrap: wrap;
		flex-shrink: 0;
	}

	.chipBtn {
		background: hsl(var(--muted));
		border: 1px solid hsl(var(--border));
		color: hsl(var(--foreground));
		font-size: 0.8rem;
		font-weight: 600;
		padding: 4px 10px;
		border-radius: 999px;
		cursor: default;
		white-space: nowrap;
	}

	.chipBtn.editable {
		cursor: pointer;
		transition: background 0.15s ease, border-color 0.15s ease;
	}

	.chipBtn.editable:hover {
		background: hsl(var(--primary) / 0.12);
		border-color: hsl(var(--primary));
	}

	.inlineInput {
		padding: 4px 8px;
		border: 1px solid hsl(var(--primary));
		border-radius: 6px;
		background: hsl(var(--background));
		color: hsl(var(--foreground));
		font-size: 0.85rem;
		text-align: center;
	}

	.ratingInput {
		width: 60px;
	}

	.minProgressInput {
		width: 120px;
	}

	.videoIdInput {
		width: 170px;
		text-align: left;
	}

	.inlineEditActions {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.inlineEditBtn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 6px;
		min-height: 32px;
		padding: 0 12px;
		border-radius: 8px;
		border: 1px solid hsl(var(--border));
		font-size: 0.8rem;
		font-weight: 600;
		cursor: pointer;
		transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
	}

	.inlineEditBtn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.inlineEditBtnPrimary {
		background: hsl(var(--primary));
		border-color: hsl(var(--primary));
		color: hsl(var(--primary-foreground));
	}

	.inlineEditBtnPrimary:hover:not(:disabled) {
		background: hsl(var(--primary) / 0.9);
	}

	.inlineEditBtnSecondary {
		background: hsl(var(--background));
		color: hsl(var(--foreground));
	}

	.inlineEditBtnSecondary:hover:not(:disabled) {
		background: hsl(var(--muted) / 0.5);
	}

	.emptyState {
		border: 1px dashed hsl(var(--border));
		border-radius: 12px;
		padding: 40px 24px;
		text-align: center;
		background: hsl(var(--muted) / 0.12);
	}

	.emptyState.slim {
		padding: 28px 20px;
	}

	.emptyState h3 {
		margin: 0 0 6px;
		font-size: 1.05rem;
		font-weight: 600;
	}

	.emptyState p {
		margin: 0;
		color: hsl(var(--muted-foreground));
		font-size: 0.9rem;
	}

	@media (max-width: 760px) {
		.levelRow {
			flex-direction: column;
			align-items: flex-start;
		}

		.levelActions {
			width: 100%;
		}

		.sectionHeader {
			flex-direction: column;
			align-items: flex-start;
		}
	}

	@media (max-width: 480px) {
		.toolCard {
			padding: 16px;
		}

		.levelItem {
			padding: 12px 14px;
		}
	}
</style>