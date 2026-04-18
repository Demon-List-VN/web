<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Badge } from '$lib/components/ui/badge';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { user } from '$lib/client';
	import { toast } from 'svelte-sonner';
	import { ArrowLeft, Plus, Trash2, GripVertical } from 'lucide-svelte';
	import { _ } from 'svelte-i18n';

	type CustomListItem = {
		id: number;
		levelId: number;
		created_at: string;
		rating: number;
		position: number | null;
		level: {
			id: number;
			name: string | null;
			creator: string | null;
			difficulty: string | null;
			isPlatformer: boolean;
		} | null;
	};

	type CustomList = {
		id: number;
		owner: string;
		title: string;
		description: string;
		visibility: 'private' | 'unlisted' | 'public';
		mode: 'rating' | 'top';
		tags: string[];
		levelCount: number;
		updated_at: string;
		items: CustomListItem[];
	};

	let list: CustomList | null = null;
	let loading = true;
	let loadingError = '';
	let loadKey = '';
	let savingMetadata = false;
	let addingLevel = false;
	let mutatingLevelId: number | null = null;
	let draggedIndex: number | null = null;
	let dragOverIndex: number | null = null;
	let editingRatingItemId: number | null = null;
	let editingRatingValue = '';
	let savingReorder = false;

	const editForm = {
		title: '',
		description: '',
		visibility: 'private' as 'private' | 'unlisted' | 'public',
		tags: '',
		mode: 'rating' as 'rating' | 'top'
	};
	const visibilityOptions: Array<'private' | 'unlisted' | 'public'> = [
		'private',
		'unlisted',
		'public'
	];

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
		if (!list) {
			return;
		}

		editForm.title = list.title;
		editForm.description = list.description;
		editForm.visibility = list.visibility;
		editForm.tags = list.tags.join(', ');
		editForm.mode = list.mode;
	}

	function parseTags(tags: string) {
		return tags
			.split(',')
			.map((tag) => tag.trim())
			.filter(Boolean);
	}

	function formatVisibility(visibility: string) {
		if (visibility === 'public') return $_('custom_lists.visibility.public');
		if (visibility === 'unlisted') return $_('custom_lists.visibility.unlisted');
		return $_('custom_lists.visibility.private');
	}

	function formatDate(value: string) {
		return new Date(value).toLocaleString('vi-VN');
	}

	async function fetchList() {
		loading = true;
		loadingError = '';

		try {
			const headers: Record<string, string> = {};
			if ($user.loggedIn) {
				headers.Authorization = `Bearer ${await $user.token()}`;
			}

			const res = await fetch(`${import.meta.env.VITE_API_URL}/lists/${$page.params.id}`, {
				headers
			});

			const payload = await res.json().catch(() => null);

			if (!res.ok) {
				throw new Error(payload?.error || $_('custom_lists.toast.failed_load'));
			}

			list = payload as CustomList;
			syncForm();
		} catch (error) {
			loadingError = error instanceof Error ? error.message : $_('custom_lists.toast.failed_load');
			list = null;
		} finally {
			loading = false;
		}
	}

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
					visibility: editForm.visibility,
					tags: parseTags(editForm.tags),
					mode: editForm.mode
				})
			});

			const payload = await res.json();

			if (!res.ok) {
				throw new Error(payload.error || $_('custom_lists.toast.failed_update'));
			}

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
		if (!confirm($_('custom_lists.detail.delete_confirm'))) {
			return;
		}

		try {
			const res = await fetch(`${import.meta.env.VITE_API_URL}/lists/${list.id}`, {
				method: 'DELETE',
				headers: {
					Authorization: `Bearer ${await $user.token()}`
				}
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

			if (!res.ok) {
				throw new Error(payload.error || $_('custom_lists.toast.failed_add_level'));
			}

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
			const res = await fetch(
				`${import.meta.env.VITE_API_URL}/lists/${list.id}/levels/${levelId}`,
				{
					method: 'DELETE',
					headers: {
						Authorization: `Bearer ${await $user.token()}`
					}
				}
			);

			const payload = await res.json();

			if (!res.ok) {
				throw new Error(payload.error || $_('custom_lists.toast.failed_remove_level'));
			}

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

	async function saveRatingEdit(levelId: number) {
		const rating = Number.parseInt(editingRatingValue, 10);
		editingRatingItemId = null;
		if (!Number.isInteger(rating) || rating < 1 || rating > 10) {
			toast.error($_('custom_lists.toast.rating_invalid'));
			return;
		}
		await updateLevelItem(levelId, { rating });
	}

	async function updateLevelItem(levelId: number, patch: { rating?: number }) {
		if (!list) return;
		try {
			const res = await fetch(
				`${import.meta.env.VITE_API_URL}/lists/${list.id}/levels/${levelId}`,
				{
					method: 'PATCH',
					headers: {
						Authorization: `Bearer ${await $user.token()}`,
						'Content-Type': 'application/json'
					},
					body: JSON.stringify(patch)
				}
			);
			const payload = await res.json();
			if (!res.ok) {
				throw new Error(payload.error || $_('custom_lists.toast.failed_update_level'));
			}
			list = payload;
			toast.success($_('custom_lists.toast.level_updated'));
		} catch (error) {
			toast.error(error instanceof Error ? error.message : $_('custom_lists.toast.failed_update_level'));
		}
	}

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
			if (!res.ok) {
				throw new Error(payload.error || $_('custom_lists.toast.failed_reorder'));
			}
			list = payload;
			toast.success($_('custom_lists.toast.reordered'));
		} catch (error) {
			toast.error(error instanceof Error ? error.message : $_('custom_lists.toast.failed_reorder'));
		} finally {
			savingReorder = false;
		}
	}

	$: isOwner = Boolean(list && $user.loggedIn && list.owner === $user.data?.uid);
	$: if ($user.checked) {
		const viewerKey = $user.loggedIn ? $user.data?.uid || 'authed' : 'guest';
		const nextKey = `${$page.params.id}:${viewerKey}`;
		if (nextKey !== loadKey) {
			loadKey = nextKey;
			fetchList();
		}
	}
</script>

<svelte:head>
	<title>{list ? `${list.title} - ${$_('custom_lists.page_title')}` : $_('custom_lists.index.title')} - Geometry Dash Việt Nam</title>
</svelte:head>

<div class="page">
	<div class="navRow">
		<Button variant="outline" on:click={() => goto('/lists')}>
			<ArrowLeft class="mr-2 h-4 w-4" />
			{$_('custom_lists.back')}
		</Button>
		{#if list}
			<Button variant="outline" on:click={() => goto(`/lists/${$page.params.id}`)}>
				{$_('custom_lists.actions.view')}
			</Button>
		{/if}
	</div>

	{#if loading}
		<div class="emptyState">{$_('custom_lists.detail.loading')}</div>
	{:else if loadingError}
		<div class="emptyState">
			<h2>{$_('custom_lists.detail.error_title')}</h2>
			<p>{loadingError}</p>
		</div>
	{:else if list}
		<Card.Root class="heroCard">
			<Card.Content class="pt-6">
				<div class="heroHead">
					<div>
						<h1>{list.title}</h1>
						<p>{list.description || $_('custom_lists.detail.no_description')}</p>
					</div>
					<div class="heroMeta">
						<Badge variant="outline">{formatVisibility(list.visibility)}</Badge>
						<Badge variant="outline">{$_('custom_lists.detail.levels_badge', { values: { count: list.levelCount } })}</Badge>
					</div>
				</div>

				{#if list.tags?.length}
					<div class="tagRow">
						{#each list.tags as tag}
							<Badge variant="outline">{tag}</Badge>
						{/each}
					</div>
				{/if}

				<p class="updatedAt">{$_('custom_lists.detail.updated', { values: { date: formatDate(list.updated_at) } })}</p>
			</Card.Content>
		</Card.Root>

		{#if isOwner}
			<div class="ownerGrid">
				<Card.Root>
					<Card.Content class="pt-6">
						<h2>{$_('custom_lists.detail.edit.heading')}</h2>
						<div class="formGrid">
							<div class="field">
								<label for="list-title">{$_('custom_lists.detail.edit.title_label')}</label>
								<Input id="list-title" bind:value={editForm.title} maxlength={100} />
							</div>
							<div class="field">
								<label for="list-description">{$_('custom_lists.detail.edit.description_label')}</label>
								<Textarea id="list-description" bind:value={editForm.description} rows={4} />
							</div>
							<div class="field">
								<span class="fieldLabel">{$_('custom_lists.detail.edit.visibility_label')}</span>
								<div class="visibilityRow">
									{#each visibilityOptions as visibility}
										<button
											type="button"
											class:selected={editForm.visibility === visibility}
											on:click={() => (editForm.visibility = visibility)}
										>
											{formatVisibility(visibility)}
										</button>
									{/each}
								</div>
							</div>
							<div class="field">
								<span class="fieldLabel">{$_('custom_lists.detail.edit.mode_label')}</span>
								<div class="visibilityRow">
									{#each ['rating', 'top'] as m}
										<button
											type="button"
											class:selected={editForm.mode === m}
											on:click={() => (editForm.mode = m === 'rating' ? 'rating' : 'top')}
										>
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
						<div class="actionRow">
							<Button on:click={saveMetadata} disabled={savingMetadata}>{$_('custom_lists.detail.edit.save')}</Button>
							<Button variant="destructive" on:click={deleteList}>{$_('custom_lists.detail.edit.delete')}</Button>
						</div>
					</Card.Content>
				</Card.Root>

				<Card.Root>
					<Card.Content class="pt-6">
						<h2>{$_('custom_lists.detail.add_level.heading')}</h2>
						<div class="field">
							<label for="level-id">{$_('custom_lists.detail.add_level.id_label')}</label>
							<Input id="level-id" bind:value={levelIdInput} inputmode="numeric" />
						</div>
						<p class="hint">{$_('custom_lists.detail.add_level.hint')}</p>
						<div class="actionRow">
							<Button on:click={addLevel} disabled={addingLevel}>
								<Plus class="mr-2 h-4 w-4" />
								{$_('custom_lists.detail.add_level.button')}
							</Button>
						</div>
					</Card.Content>
				</Card.Root>
			</div>
		{/if}

		<div class="sectionHeader">
			<h2>{$_('custom_lists.detail.levels.heading')}</h2>
			<div class="sectionMeta">
				{#if list.mode === 'rating'}
					<Badge variant="secondary">{$_('custom_lists.detail.edit.mode_rating')}</Badge>
				{:else}
					<Badge variant="secondary">{$_('custom_lists.detail.edit.mode_top')}</Badge>
				{/if}
				<Badge variant="outline">{list.items.length}</Badge>
			</div>
		</div>

		{#if list.items.length === 0}
			<div class="emptyState slim">
				<h2>{$_('custom_lists.detail.levels.empty_title')}</h2>
				<p>{isOwner ? $_('custom_lists.detail.levels.empty_owner') : $_('custom_lists.detail.levels.empty_visitor')}</p>
			</div>
		{:else}
			<div class="levelList">
				{#each list.items as item, i}
					<!-- svelte-ignore a11y-no-static-element-interactions -->
					<div
						class="levelDragWrapper"
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
						<Card.Root class="levelCard">
							<Card.Content class="pt-6">
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
											<p>
												{$_('custom_lists.detail.levels.by')} {item.level.creator || 'Unknown'}
												{#if item.level.difficulty} • {item.level.difficulty}{/if}
												{#if item.level.isPlatformer} • {$_('custom_lists.detail.levels.platformer')}{/if}
											</p>
										{:else}
											<span class="levelLink missing">{$_('custom_lists.detail.levels.unavailable', { values: { id: item.levelId } })}</span>
											<p>{$_('custom_lists.detail.levels.unavailable_desc')}</p>
										{/if}
									</div>
									<div class="levelActions">
										{#if list.mode === 'rating'}
											{#if isOwner && editingRatingItemId === item.id}
												<input
													class="ratingInput"
													type="number"
													min="1"
													max="10"
													bind:value={editingRatingValue}
													on:blur={() => saveRatingEdit(item.levelId)}
													on:keydown={(e) => e.key === 'Enter' && saveRatingEdit(item.levelId)}
												/>
											{:else}
												<button
													class="ratingBadge"
													class:ownerEditable={isOwner}
													type="button"
													on:click={isOwner ? () => startRatingEdit(item) : undefined}
													title={isOwner ? $_('custom_lists.detail.levels.rating_edit_hint') : undefined}
												>
													★ {item.rating ?? 5}
												</button>
											{/if}
										{/if}
										<Badge variant="outline">{$_('custom_lists.detail.levels.id_badge', { values: { id: item.levelId } })}</Badge>
										{#if isOwner}
											<Button
												variant="destructive"
												size="sm"
												on:click={() => removeLevel(item.levelId)}
												disabled={mutatingLevelId === item.levelId}
											>
												<Trash2 class="mr-2 h-4 w-4" />
												{$_('custom_lists.detail.levels.remove')}
											</Button>
										{/if}
									</div>
								</div>
							</Card.Content>
						</Card.Root>
					</div>
				{/each}
			</div>
		{/if}
	{/if}
</div>

<style lang="scss">
	.page {
		max-width: 1100px;
		margin: 0 auto;
		padding: 24px 16px 48px;
		display: flex;
		flex-direction: column;
		gap: 18px;
	}

	h1,
	h2,
	.emptyState h2 {
		margin: 0;
	}

	:global(.heroCard),
	:global(.levelCard) {
		border: 1px solid hsl(var(--border));
	}

	.navRow {
		display: flex;
		flex-wrap: wrap;
		gap: 12px;
	}

	.sectionMeta {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.heroHead,
	.levelRow,
	.sectionHeader,
	.actionRow,
	.tagRow,
	.levelActions,
	.ownerGrid {
		display: flex;
		gap: 12px;
	}

	.heroHead,
	.levelRow,
	.sectionHeader {
		justify-content: space-between;
	}

	.heroHead,
	.levelRow,
	.sectionHeader,
	.levelActions {
		align-items: center;
	}

	.heroHead p,
	.levelBody p,
	.updatedAt,
	.hint,
	.emptyState p {
		color: hsl(var(--muted-foreground));
	}

	.ownerGrid {
		align-items: stretch;
		flex-wrap: wrap;
	}

	.ownerGrid :global(.card) {
		flex: 1 1 320px;
	}

	.formGrid {
		display: grid;
		gap: 14px;
		margin-top: 12px;
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.fieldLabel {
		font-size: 0.95rem;
		font-weight: 500;
	}

	.visibilityRow {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}

	.visibilityRow button {
		border: 1px solid hsl(var(--border));
		background: transparent;
		color: hsl(var(--foreground));
		padding: 8px 12px;
		border-radius: 999px;
		cursor: pointer;
	}

	.visibilityRow button.selected {
		background: hsl(var(--primary) / 0.12);
		border-color: hsl(var(--primary));
	}

	.levelList {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.levelDragWrapper {
		transition: opacity 0.15s ease;
	}

	.levelDragWrapper.isDraggable {
		cursor: grab;
	}

	.levelDragWrapper.isDraggable:active {
		cursor: grabbing;
	}

	.levelDragWrapper.dragging :global(.levelCard) {
		opacity: 0.4;
	}

	.levelDragWrapper.dragOver :global(.levelCard) {
		border-color: hsl(var(--primary));
		box-shadow: 0 0 0 2px hsl(var(--primary) / 0.25);
	}

	.rankBadge {
		font-size: 0.85rem;
		font-weight: 700;
		color: hsl(var(--muted-foreground));
		min-width: 28px;
		text-align: center;
		flex-shrink: 0;
	}

	.dragHandle {
		color: hsl(var(--muted-foreground));
		flex-shrink: 0;
		display: flex;
		align-items: center;
	}

	.ratingBadge {
		background: hsl(var(--muted));
		border: 1px solid hsl(var(--border));
		color: hsl(var(--foreground));
		font-size: 0.85rem;
		font-weight: 600;
		padding: 4px 10px;
		border-radius: 999px;
		cursor: default;
		white-space: nowrap;
	}

	.ratingBadge.ownerEditable {
		cursor: pointer;
		transition: background 0.15s ease, border-color 0.15s ease;
	}

	.ratingBadge.ownerEditable:hover {
		background: hsl(var(--primary) / 0.12);
		border-color: hsl(var(--primary));
	}

	.ratingInput {
		width: 64px;
		padding: 4px 8px;
		border: 1px solid hsl(var(--primary));
		border-radius: 6px;
		background: hsl(var(--background));
		color: hsl(var(--foreground));
		font-size: 0.9rem;
		text-align: center;
	}

	.levelBody {
		display: flex;
		flex-direction: column;
		gap: 4px;
		flex: 1;
		min-width: 0;
	}

	.levelLink {
		font-weight: 600;
		text-decoration: none;
		color: hsl(var(--foreground));
	}

	.levelLink.missing {
		color: hsl(var(--destructive));
	}

	.emptyState {
		border: 1px dashed hsl(var(--border));
		border-radius: 16px;
		padding: 32px 20px;
		text-align: center;
		background: hsl(var(--muted) / 0.18);
	}

	.emptyState.slim {
		padding: 24px 18px;
	}

	@media screen and (max-width: 760px) {
		.heroHead,
		.levelRow,
		.sectionHeader,
		.levelActions {
			flex-direction: column;
			align-items: flex-start;
		}
	}
</style>