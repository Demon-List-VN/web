<script lang="ts">
	import { page } from '$app/stores';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { toast } from 'svelte-sonner';
	import { GripVertical, ListOrdered, Plus, Save, Star, Trash2 } from 'lucide-svelte';
	import { _ } from 'svelte-i18n';

	export let list: any = null;
	export let canEditLevels = false;
	export let addingLevel = false;
	export let mutatingLevelId: number | null = null;
	export let savingLevelItemId: number | null = null;
	export let savingReorder = false;
	export let addLevel: (levelId: number) => boolean | Promise<boolean> = async () => false;
	export let removeLevel: (levelId: number) => void | Promise<void> = async () => {};
	export let updateLevelItem: (levelId: number, patch: { rating?: number; minProgress?: number | null }) => void | Promise<void> = async () => {};
	export let reorderLevels: (levelIds: number[]) => void | Promise<void> = async () => {};

	let displayedItems: any[] = [];
	let levelIdInput = '';
	let quickLevelId: number | null = null;
	let draggedIndex: number | null = null;
	let dragOverIndex: number | null = null;
	let editingRatingItemId: number | null = null;
	let editingRatingValue = '';
	let editingMinProgressItemId: number | null = null;
	let editingMinProgressValue: string | number | undefined = '';

	$: displayedItems = list?.items ? [...list.items] : [];
	$: quickLevelId = getQuickLevelId();
	$: if (quickLevelId && !levelIdInput) {
		levelIdInput = String(quickLevelId);
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

	function cancelMinProgressEdit() {
		editingMinProgressItemId = null;
		editingMinProgressValue = '';
	}

	function handleMinProgressBlur(event: FocusEvent) {
		const nextTarget = event.relatedTarget;
		if (nextTarget instanceof HTMLElement && nextTarget.dataset.minProgressAction) {
			return;
		}

		cancelMinProgressEdit();
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
</script>

<div class="tabContent">
	{#if canEditLevels}
		<div class="toolCard">
			<h2 class="toolHeading">{$_('custom_lists.detail.add_level.heading')}</h2>
			<div class="field">
				<label for="level-id">{$_('custom_lists.detail.add_level.id_label')}</label>
				<Input id="level-id" bind:value={levelIdInput} inputmode="numeric" />
			</div>
			<p class="hint">{$_('custom_lists.detail.add_level.hint')}</p>
			<div class="formActions">
				<Button on:click={submitAddLevel} disabled={addingLevel}>
					<Plus class="mr-2 h-4 w-4" />
					{$_('custom_lists.detail.add_level.button')}
				</Button>
			</div>
		</div>
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
						class:isDraggable={canEditLevels && list?.mode === 'top' && !savingReorder}
						class:dragOver={canEditLevels && list?.mode === 'top' && dragOverIndex === index}
						class:dragging={canEditLevels && list?.mode === 'top' && draggedIndex === index}
						role="listitem"
						draggable={canEditLevels && list?.mode === 'top' && !savingReorder}
						on:dragstart={(event) => {
							if (canEditLevels && list?.mode === 'top' && !savingReorder) {
								onDragStart(event, index);
							}
						}}
						on:dragover={(event) => {
							if (canEditLevels && list?.mode === 'top' && !savingReorder) {
								onDragOver(event, index);
							}
						}}
						on:drop={(event) => {
							if (canEditLevels && list?.mode === 'top' && !savingReorder) {
								onDrop(event, index);
							}
						}}
						on:dragend={() => {
							if (canEditLevels && list?.mode === 'top') {
								onDragEnd();
							}
						}}
					>
						<div class="levelRow">
							{#if canEditLevels && list?.mode === 'top'}
								<div class="dragHandle" title={$_('custom_lists.detail.levels.drag_hint')}>
									<GripVertical class="h-5 w-5" />
								</div>
							{/if}

							<div class="rankBadge">#{index + 1}</div>

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