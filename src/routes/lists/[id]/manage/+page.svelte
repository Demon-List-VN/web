<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Badge } from '$lib/components/ui/badge';
	import { Switch } from '$lib/components/ui/switch';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { user } from '$lib/client';
	import { toast } from 'svelte-sonner';
	import {
		ArrowLeft,
		Plus,
		Trash2,
		GripVertical,
		Eye,
		Globe2,
		EyeOff,
		Lock,
		Layers,
		Clock,
		Star,
		ListOrdered,
		Save,
		AlertTriangle
	} from 'lucide-svelte';
	import { _ } from 'svelte-i18n';

	export let data: any;

	type CustomListItem = {
		id: number;
		levelId: number;
		created_at: string;
		minProgress: number | null;
		rating: number;
		position: number | null;
		level: {
			id: number;
			name: string | null;
			creator: string | null;
			difficulty: string | null;
			isPlatformer: boolean;
			minProgress: number | null;
		} | null;
	};

	type CustomList = {
		id: number;
		owner: string;
		title: string;
		description: string;
		isPlatformer: boolean;
		visibility: 'private' | 'unlisted' | 'public';
		mode: 'rating' | 'top';
		tags: string[];
		levelCount: number;
		updated_at: string;
		items: CustomListItem[];
	};

	// SSR data - hydrate into reactive local state
	let list: CustomList | null = data?.list ?? null;
	const loadingError = data?.error ?? '';

	let savingMetadata = false;
	let addingLevel = false;
	let mutatingLevelId: number | null = null;
	let draggedIndex: number | null = null;
	let dragOverIndex: number | null = null;
	let editingRatingItemId: number | null = null;
	let editingRatingValue = '';
	let editingMinProgressItemId: number | null = null;
	let editingMinProgressValue: string | number | undefined = '';
	let savingLevelItemId: number | null = null;
	let savingReorder = false;
	let initialSyncDone = false;

	const editForm = {
		title: '',
		description: '',
		isPlatformer: false,
		visibility: 'private' as 'private' | 'unlisted' | 'public',
		tags: '',
		mode: 'rating' as 'rating' | 'top'
	};

	const visibilityOptions: Array<'private' | 'unlisted' | 'public'> = ['private', 'unlisted', 'public'];

	let levelIdInput = '';

	function getQuickLevelId() {
		const raw = $page.url.searchParams.get('levelId');
		const parsed = raw ? Number.parseInt(raw, 10) : Number.NaN;
		return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
	}

	$: quickLevelId = getQuickLevelId();
	$: if (quickLevelId && !levelIdInput) {
		levelIdInput = String(quickLevelId);
	}

	function syncForm() {
		if (!list) return;
		editForm.title = list.title;
		editForm.description = list.description;
		editForm.isPlatformer = list.isPlatformer;
		editForm.visibility = list.visibility;
		editForm.tags = list.tags.join(', ');
		editForm.mode = list.mode;
	}

	// Sync form when list changes from SSR data
	$: if (list && !initialSyncDone) {
		initialSyncDone = true;
		syncForm();
	}

	// Re-fetch with auth once user is available (to get private list data)
	$: if ($user.checked && $user.loggedIn && data?.list) {
		refetchWithAuth();
	}

	let authFetchKey = '';
	async function refetchWithAuth() {
		const key = `${$page.params.id}:${$user.data?.uid}`;
		if (key === authFetchKey) return;
		authFetchKey = key;

		try {
			const res = await fetch(`${import.meta.env.VITE_API_URL}/lists/${$page.params.id}`, {
				headers: { Authorization: `Bearer ${await $user.token()}` }
			});
			const payload = await res.json().catch(() => null);
			if (res.ok && payload) {
				list = payload as CustomList;
				syncForm();
			}
		} catch {
			// silently fail, we already have SSR data
		}
	}

	function parseTags(tags: string) {
		return tags.split(',').map((tag) => tag.trim()).filter(Boolean);
	}

	function formatVisibility(visibility: string) {
		if (visibility === 'public') return $_('custom_lists.visibility.public');
		if (visibility === 'unlisted') return $_('custom_lists.visibility.unlisted');
		return $_('custom_lists.visibility.private');
	}

	function formatListType(isPlatformer: boolean) {
		return isPlatformer ? $_('custom_lists.type.platformer') : $_('custom_lists.type.classic');
	}

	function formatDate(value: string) {
		return new Date(value).toLocaleDateString('vi-VN', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}

	function getTimeString(ms: number) {
		const minutes = Math.floor(ms / 60000);
		const seconds = Math.floor((ms % 60000) / 1000);
		const milliseconds = ms % 1000;
		return `${minutes}:${seconds.toString().padStart(2, '0')}.${milliseconds}`;
	}

	function getEffectiveMinProgress(item: CustomListItem) {
		return item.minProgress ?? item.level?.minProgress ?? null;
	}

	function getMinProgressLabel(item: CustomListItem) {
		const minProgress = getEffectiveMinProgress(item);
		if (minProgress == null) return $_('custom_lists.detail.levels.min_progress_label');
		const value = list?.isPlatformer
			? `${getTimeString(minProgress)} Base`
			: `${minProgress}% Min`;
		return item.minProgress == null ? value : `${value} *`;
	}

	function getVisibilityIcon(v: string) {
		if (v === 'public') return Globe2;
		if (v === 'unlisted') return EyeOff;
		return Lock;
	}

	// Mutations
	async function saveMetadata() {
		if (!list) return;
		if (!editForm.title.trim()) {
			toast.error($_('custom_lists.toast.title_required'));
			return;
		}

		savingMetadata = true;
		try {
			const res = await fetch(`${import.meta.env.VITE_API_URL}/lists/${list.id}`, {
				method: 'PATCH',
				headers: {
					Authorization: `Bearer ${await $user.token()}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					title: editForm.title,
					description: editForm.description,
					isPlatformer: editForm.isPlatformer,
					visibility: editForm.visibility,
					tags: parseTags(editForm.tags),
					mode: editForm.mode
				})
			});
			const payload = await res.json();
			if (!res.ok) throw new Error(payload.error || $_('custom_lists.toast.failed_update'));
			list = payload;
			syncForm();
			toast.success($_('custom_lists.toast.list_updated'));
		} catch (error) {
			toast.error(error instanceof Error ? error.message : $_('custom_lists.toast.failed_update'));
		} finally {
			savingMetadata = false;
		}
	}

	async function deleteList() {
		if (!list) return;
		if (!confirm($_('custom_lists.detail.delete_confirm'))) return;

		try {
			const res = await fetch(`${import.meta.env.VITE_API_URL}/lists/${list.id}`, {
				method: 'DELETE',
				headers: { Authorization: `Bearer ${await $user.token()}` }
			});
			if (!res.ok) {
				const payload = await res.json().catch(() => null);
				throw new Error(payload?.error || $_('custom_lists.toast.failed_delete'));
			}
			toast.success($_('custom_lists.toast.list_deleted'));
			goto('/lists');
		} catch (error) {
			toast.error(error instanceof Error ? error.message : $_('custom_lists.toast.failed_delete'));
		}
	}

	async function addLevel() {
		if (!list) return;
		const levelId = Number.parseInt(levelIdInput, 10);
		if (!Number.isInteger(levelId) || levelId <= 0) {
			toast.error($_('custom_lists.toast.level_id_invalid'));
			return;
		}

		addingLevel = true;
		try {
			const res = await fetch(`${import.meta.env.VITE_API_URL}/lists/${list.id}/levels`, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${await $user.token()}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ levelId })
			});
			const payload = await res.json();
			if (!res.ok) throw new Error(payload.error || $_('custom_lists.toast.failed_add_level'));
			list = payload;
			levelIdInput = '';
			toast.success($_('custom_lists.toast.level_added'));
		} catch (error) {
			toast.error(error instanceof Error ? error.message : $_('custom_lists.toast.failed_add_level'));
		} finally {
			addingLevel = false;
		}
	}

	async function removeLevel(levelId: number) {
		if (!list) return;
		mutatingLevelId = levelId;
		try {
			const res = await fetch(`${import.meta.env.VITE_API_URL}/lists/${list.id}/levels/${levelId}`, {
				method: 'DELETE',
				headers: { Authorization: `Bearer ${await $user.token()}` }
			});
			const payload = await res.json();
			if (!res.ok) throw new Error(payload.error || $_('custom_lists.toast.failed_remove_level'));
			list = payload;
			toast.success($_('custom_lists.toast.level_removed'));
		} catch (error) {
			toast.error(error instanceof Error ? error.message : $_('custom_lists.toast.failed_remove_level'));
		} finally {
			mutatingLevelId = null;
		}
	}

	function startRatingEdit(item: CustomListItem) {
		editingRatingItemId = item.id;
		editingRatingValue = String(item.rating ?? 5);
	}

	function startMinProgressEdit(item: CustomListItem) {
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

	async function updateLevelItem(levelId: number, patch: { rating?: number; minProgress?: number | null }) {
		if (!list) return;
		savingLevelItemId = levelId;
		try {
			const res = await fetch(`${import.meta.env.VITE_API_URL}/lists/${list.id}/levels/${levelId}`, {
				method: 'PATCH',
				headers: {
					Authorization: `Bearer ${await $user.token()}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(patch)
			});
			const payload = await res.json();
			if (!res.ok) throw new Error(payload.error || $_('custom_lists.toast.failed_update_level'));
			list = payload;
			toast.success($_('custom_lists.toast.level_updated'));
		} catch (error) {
			toast.error(error instanceof Error ? error.message : $_('custom_lists.toast.failed_update_level'));
		} finally {
			savingLevelItemId = null;
		}
	}

	// Drag & drop reorder
	function onDragStart(e: DragEvent, index: number) {
		draggedIndex = index;
		if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
	}

	function onDragOver(e: DragEvent, index: number) {
		e.preventDefault();
		if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
		dragOverIndex = index;
	}

	function onDragEnd() {
		draggedIndex = null;
		dragOverIndex = null;
	}

	function onDrop(e: DragEvent, targetIndex: number) {
		e.preventDefault();
		if (draggedIndex === null || draggedIndex === targetIndex || !list) {
			draggedIndex = null;
			dragOverIndex = null;
			return;
		}
		const newItems = [...list.items];
		const [moved] = newItems.splice(draggedIndex, 1);
		newItems.splice(targetIndex, 0, moved);
		list = { ...list, items: newItems };
		draggedIndex = null;
		dragOverIndex = null;
		reorderLevels(newItems.map((item) => item.levelId));
	}

	async function reorderLevels(levelIds: number[]) {
		if (!list) return;
		savingReorder = true;
		try {
			const res = await fetch(`${import.meta.env.VITE_API_URL}/lists/${list.id}/reorder`, {
				method: 'PATCH',
				headers: {
					Authorization: `Bearer ${await $user.token()}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ levelIds })
			});
			const payload = await res.json();
			if (!res.ok) throw new Error(payload.error || $_('custom_lists.toast.failed_reorder'));
			list = payload;
			toast.success($_('custom_lists.toast.reordered'));
		} catch (error) {
			toast.error(error instanceof Error ? error.message : $_('custom_lists.toast.failed_reorder'));
		} finally {
			savingReorder = false;
		}
	}

	$: isOwner = Boolean(list && $user.loggedIn && list.owner === $user.data?.uid);
</script>

<svelte:head>
	<title>{list ? `Quản lý danh sách - ${list.title} - Geometry Dash Việt Nam` : 'Danh sách - Geometry Dash Việt Nam'}</title>
</svelte:head>

<div class="page">
	<!-- Navigation -->
	<div class="navRow">
		<Button variant="outline" size="sm" on:click={() => goto('/lists')}>
			<ArrowLeft class="mr-2 h-4 w-4" />
			{$_('custom_lists.back')}
		</Button>
		{#if list}
			<Button variant="outline" size="sm" on:click={() => goto(`/lists/${$page.params.id}`)}>
				<Eye class="mr-2 h-4 w-4" />
				{$_('custom_lists.actions.view')}
			</Button>
		{/if}
	</div>

	{#if loadingError}
		<div class="emptyState">
			<AlertTriangle class="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
			<h3>{$_('custom_lists.detail.error_title')}</h3>
			<p>{loadingError}</p>
		</div>
	{:else if list}
		<!-- Hero Summary -->
		<div class="hero">
			<div class="heroTop">
				<div class="heroInfo">
					<h1>{list.title}</h1>
					<p class="heroDesc">{list.description || $_('custom_lists.detail.no_description')}</p>
				</div>
				<div class="heroChips">
					<span class="chip">
						<svelte:component this={getVisibilityIcon(list.visibility)} class="h-3.5 w-3.5" />
						{formatVisibility(list.visibility)}
					</span>
					<span class="chip">
						<Layers class="h-3.5 w-3.5" />
						{formatListType(list.isPlatformer)}
					</span>
					<span class="chip">
						{list.mode === 'top' ? '🔢' : '⭐'}
						{list.mode === 'rating' ? $_('custom_lists.detail.edit.mode_rating') : $_('custom_lists.detail.edit.mode_top')}
					</span>
					<span class="chip">
						{$_('custom_lists.detail.levels_badge', { values: { count: list.levelCount } })}
					</span>
				</div>
			</div>
			{#if list.tags?.length}
				<div class="tagRow">
					{#each list.tags as tag}
						<Badge variant="outline">{tag}</Badge>
					{/each}
				</div>
			{/if}
			<p class="updatedAt">
				<Clock class="h-3.5 w-3.5" />
				{$_('custom_lists.detail.updated', { values: { date: formatDate(list.updated_at) } })}
			</p>
		</div>

		{#if isOwner}
			<!-- Owner Tools -->
			<div class="ownerTools">
				<!-- Edit Metadata -->
				<div class="toolCard">
					<h2 class="toolHeading">{$_('custom_lists.detail.edit.heading')}</h2>
					<div class="formGrid">
						<div class="field">
							<label for="list-title">{$_('custom_lists.detail.edit.title_label')}</label>
							<Input id="list-title" bind:value={editForm.title} maxlength={100} />
						</div>
						<div class="field">
							<label for="list-description">{$_('custom_lists.detail.edit.description_label')}</label>
							<Textarea id="list-description" bind:value={editForm.description} rows={3} />
						</div>
						<div class="field">
							<div class="switchRow">
								<div>
									<label for="list-platformer">{$_('custom_lists.detail.edit.type_label')}</label>
									<p class="hint">{$_('custom_lists.detail.edit.type_hint')}</p>
								</div>
								<div class="switchControl">
									<span class="switchLabel">{formatListType(editForm.isPlatformer)}</span>
									<Switch id="list-platformer" bind:checked={editForm.isPlatformer} />
								</div>
							</div>
						</div>
						<div class="field">
							<span class="fieldLabel">{$_('custom_lists.detail.edit.visibility_label')}</span>
							<div class="optionRow">
								{#each visibilityOptions as v}
									<button
										type="button"
										class="optionBtn"
										class:selected={editForm.visibility === v}
										on:click={() => (editForm.visibility = v)}
									>
										<svelte:component this={getVisibilityIcon(v)} class="h-3.5 w-3.5" />
										{formatVisibility(v)}
									</button>
								{/each}
							</div>
						</div>
						<div class="field">
							<span class="fieldLabel">{$_('custom_lists.detail.edit.mode_label')}</span>
							<div class="optionRow">
								{#each ['rating', 'top'] as m}
									<button
										type="button"
										class="optionBtn"
										class:selected={editForm.mode === m}
										on:click={() => (editForm.mode = m === 'rating' ? 'rating' : 'top')}
									>
										{#if m === 'rating'}<Star class="h-3.5 w-3.5" />{:else}<ListOrdered class="h-3.5 w-3.5" />{/if}
										{m === 'rating' ? $_('custom_lists.detail.edit.mode_rating') : $_('custom_lists.detail.edit.mode_top')}
									</button>
								{/each}
							</div>
							<p class="hint">{editForm.mode === 'rating' ? $_('custom_lists.detail.edit.mode_rating_hint') : $_('custom_lists.detail.edit.mode_top_hint')}</p>
						</div>
						<div class="field">
							<label for="list-tags">{$_('custom_lists.detail.edit.tags_label')}</label>
							<Input id="list-tags" bind:value={editForm.tags} placeholder="challenge, favorite" />
						</div>
					</div>
					<div class="formActions">
						<Button on:click={saveMetadata} disabled={savingMetadata}>
							<Save class="mr-2 h-4 w-4" />
							{$_('custom_lists.detail.edit.save')}
						</Button>
						<Button variant="destructive" on:click={deleteList}>
							<Trash2 class="mr-2 h-4 w-4" />
							{$_('custom_lists.detail.edit.delete')}
						</Button>
					</div>
				</div>

				<!-- Add Level -->
				<div class="toolCard">
					<h2 class="toolHeading">{$_('custom_lists.detail.add_level.heading')}</h2>
					<div class="field">
						<label for="level-id">{$_('custom_lists.detail.add_level.id_label')}</label>
						<Input id="level-id" bind:value={levelIdInput} inputmode="numeric" />
					</div>
					<p class="hint">{$_('custom_lists.detail.add_level.hint')}</p>
					<div class="formActions">
						<Button on:click={addLevel} disabled={addingLevel}>
							<Plus class="mr-2 h-4 w-4" />
							{$_('custom_lists.detail.add_level.button')}
						</Button>
					</div>
				</div>
			</div>
		{/if}

		<!-- Levels List -->
		<div class="levelsSection">
			<div class="sectionHeader">
				<h2>{$_('custom_lists.detail.levels.heading')}</h2>
				<div class="sectionMeta">
					{#if list.mode === 'rating'}
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
					<Badge variant="outline">{list.items.length}</Badge>
				</div>
			</div>

			{#if list.items.length === 0}
				<div class="emptyState slim">
					<h3>{$_('custom_lists.detail.levels.empty_title')}</h3>
					<p>{isOwner ? $_('custom_lists.detail.levels.empty_owner') : $_('custom_lists.detail.levels.empty_visitor')}</p>
				</div>
			{:else}
				<div class="levelList">
					{#each list.items as item, i}
						<div
							class="levelItem"
							class:isDraggable={isOwner && list.mode === 'top' && !savingReorder}
							class:dragOver={isOwner && list.mode === 'top' && dragOverIndex === i}
							class:dragging={isOwner && list.mode === 'top' && draggedIndex === i}
							role="listitem"
							draggable={isOwner && list.mode === 'top' && !savingReorder}
							on:dragstart={(e) => { if (isOwner && list?.mode === 'top' && !savingReorder) onDragStart(e, i); }}
							on:dragover={(e) => { if (isOwner && list?.mode === 'top' && !savingReorder) onDragOver(e, i); }}
							on:drop={(e) => { if (isOwner && list?.mode === 'top' && !savingReorder) onDrop(e, i); }}
							on:dragend={() => { if (isOwner && list?.mode === 'top') onDragEnd(); }}
						>
							<div class="levelRow">
								{#if isOwner && list.mode === 'top'}
									<div class="dragHandle" title={$_('custom_lists.detail.levels.drag_hint')}>
										<GripVertical class="h-5 w-5" />
									</div>
								{/if}

								<div class="rankBadge">#{i + 1}</div>

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
									{#if list.mode === 'rating'}
										{#if isOwner && editingRatingItemId === item.id}
											<input
												class="inlineInput ratingInput"
												type="number"
												min="1"
												max="10"
												bind:value={editingRatingValue}
												on:blur={() => saveRatingEdit(item.levelId)}
												on:keydown={(e) => e.key === 'Enter' && saveRatingEdit(item.levelId)}
											/>
										{:else}
											<button
												class="chipBtn"
												class:editable={isOwner}
												type="button"
												on:click={isOwner ? () => startRatingEdit(item) : undefined}
												title={isOwner ? $_('custom_lists.detail.levels.rating_edit_hint') : undefined}
											>
												★ {item.rating ?? 5}
											</button>
										{/if}
									{/if}

									{#if isOwner && editingMinProgressItemId === item.id}
										<input
											class="inlineInput minProgressInput"
											type="number"
											min="0"
											max={list.isPlatformer ? undefined : '100'}
											placeholder={item.level?.minProgress != null ? String(item.level.minProgress) : undefined}
											bind:value={editingMinProgressValue}
											on:blur={handleMinProgressBlur}
											on:keydown={(e) => {
												if (e.key === 'Enter') {
													e.preventDefault();
													saveMinProgressEdit(item.levelId);
												}
												if (e.key === 'Escape') {
													e.preventDefault();
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
											class:editable={isOwner}
											type="button"
											on:click={isOwner ? () => startMinProgressEdit(item) : undefined}
											title={isOwner ? $_('custom_lists.detail.levels.min_progress_edit_hint') : undefined}
										>
											{getMinProgressLabel(item)}
										</button>
									{/if}

									<Badge variant="outline">{$_('custom_lists.detail.levels.id_badge', { values: { id: item.levelId } })}</Badge>

									{#if isOwner}
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
	{/if}
</div>

<style lang="scss">
	.page {
		max-width: 1100px;
		margin: 0 auto;
		padding: 24px 16px 48px;
		display: flex;
		flex-direction: column;
		gap: 20px;
	}

	/* Nav */
	.navRow {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
	}

	/* Hero */
	.hero {
		background: hsl(var(--card));
		border: 1px solid hsl(var(--border));
		border-radius: 12px;
		padding: 24px;
		display: flex;
		flex-direction: column;
		gap: 14px;
	}

	.heroTop {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 16px;
		flex-wrap: wrap;
	}

	.heroInfo h1 {
		margin: 0;
		font-size: 1.4rem;
		font-weight: 700;
	}

	.heroDesc {
		margin: 4px 0 0;
		color: hsl(var(--muted-foreground));
		font-size: 0.9rem;
	}

	.heroChips {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}

	.chip {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		font-size: 0.8rem;
		color: hsl(var(--muted-foreground));
		background: hsl(var(--muted) / 0.4);
		padding: 4px 10px;
		border-radius: 999px;
		white-space: nowrap;
	}

	.tagRow {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}

	.updatedAt {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		margin: 0;
		font-size: 0.8rem;
		color: hsl(var(--muted-foreground));
	}

	/* Owner Tools */
	.ownerTools {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
		gap: 16px;
	}

	.toolCard {
		background: hsl(var(--card));
		border: 1px solid hsl(var(--border));
		border-radius: 12px;
		padding: 22px;
		display: flex;
		flex-direction: column;
		gap: 14px;
	}

	.toolHeading {
		margin: 0;
		font-size: 1.1rem;
		font-weight: 600;
	}

	.formGrid {
		display: grid;
		gap: 14px;
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	label, .fieldLabel {
		font-size: 0.9rem;
		font-weight: 500;
	}

	.hint {
		font-size: 0.8rem;
		color: hsl(var(--muted-foreground));
		margin: 0;
	}

	.optionRow {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}

	.optionBtn {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		border: 1px solid hsl(var(--border));
		background: transparent;
		color: hsl(var(--foreground));
		padding: 7px 14px;
		border-radius: 999px;
		cursor: pointer;
		font-size: 0.85rem;
		transition: background 0.15s ease, border-color 0.15s ease;
	}

	.optionBtn:hover {
		background: hsl(var(--muted) / 0.5);
	}

	.optionBtn.selected {
		background: hsl(var(--primary) / 0.12);
		border-color: hsl(var(--primary));
	}

	.switchRow {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		flex-wrap: wrap;
	}

	.switchControl {
		display: flex;
		align-items: center;
		gap: 10px;
	}

	.switchLabel {
		font-size: 0.9rem;
		font-weight: 500;
	}

	.formActions {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
		margin-top: 4px;
	}

	/* Levels Section */
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

	/* Empty State */
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

	/* Responsive */
	@media (max-width: 760px) {
		.heroTop {
			flex-direction: column;
		}

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

		.ownerTools {
			grid-template-columns: 1fr;
		}
	}

	@media (max-width: 480px) {
		.hero {
			padding: 18px 16px;
		}

		.heroInfo h1 {
			font-size: 1.2rem;
		}

		.toolCard {
			padding: 16px;
		}

		.levelItem {
			padding: 12px 14px;
		}

		.optionBtn {
			padding: 6px 12px;
			font-size: 0.8rem;
		}
	}
</style>
