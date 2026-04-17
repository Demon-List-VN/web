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
	import { ArrowLeft, Plus, Trash2 } from 'lucide-svelte';

	type CustomListItem = {
		id: number;
		levelId: number;
		created_at: string;
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

	let editForm = {
		title: '',
		description: '',
		visibility: 'private' as 'private' | 'unlisted' | 'public',
		tags: ''
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
	}

	function parseTags(tags: string) {
		return tags
			.split(',')
			.map((tag) => tag.trim())
			.filter(Boolean);
	}

	function formatVisibility(visibility: string) {
		if (visibility === 'public') return 'Public';
		if (visibility === 'unlisted') return 'Unlisted';
		return 'Private';
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
				throw new Error(payload?.error || 'Failed to load list');
			}

			list = payload as CustomList;
			syncForm();
		} catch (error) {
			loadingError = error instanceof Error ? error.message : 'Failed to load list';
			list = null;
		} finally {
			loading = false;
		}
	}

	async function saveMetadata() {
		if (!list) return;
		if (!editForm.title.trim()) {
			toast.error('Title is required');
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
					tags: parseTags(editForm.tags)
				})
			});

			const payload = await res.json();

			if (!res.ok) {
				throw new Error(payload.error || 'Failed to update list');
			}

			list = payload;
			syncForm();
			toast.success('List updated');
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Failed to update list');
		} finally {
			savingMetadata = false;
		}
	}

	async function deleteList() {
		if (!list) return;
		if (!confirm('Delete this list? This cannot be undone.')) {
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
				throw new Error(payload?.error || 'Failed to delete list');
			}

			toast.success('List deleted');
			goto('/lists');
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Failed to delete list');
		}
	}

	async function addLevel() {
		if (!list) return;
		const levelId = Number.parseInt(levelIdInput, 10);

		if (!Number.isInteger(levelId) || levelId <= 0) {
			toast.error('Enter a valid level ID');
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
				throw new Error(payload.error || 'Failed to add level');
			}

			list = payload;
			levelIdInput = '';
			toast.success('Level added to list');
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Failed to add level');
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
				throw new Error(payload.error || 'Failed to remove level');
			}

			list = payload;
			toast.success('Level removed from list');
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Failed to remove level');
		} finally {
			mutatingLevelId = null;
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
	<title>{list ? `${list.title} - Lists` : 'List'} - Geometry Dash Việt Nam</title>
</svelte:head>

<div class="page">
	<Button variant="outline" on:click={() => goto('/lists')}>
		<ArrowLeft class="mr-2 h-4 w-4" />
		Back to lists
	</Button>

	{#if loading}
		<div class="emptyState">Loading list...</div>
	{:else if loadingError}
		<div class="emptyState">
			<h2>Unable to open this list</h2>
			<p>{loadingError}</p>
		</div>
	{:else if list}
		<Card.Root class="heroCard">
			<Card.Content>
				<div class="heroHead">
					<div>
						<h1>{list.title}</h1>
						<p>{list.description || 'No description yet.'}</p>
					</div>
					<div class="heroMeta">
						<Badge variant="outline">{formatVisibility(list.visibility)}</Badge>
						<Badge variant="outline">{list.levelCount} levels</Badge>
					</div>
				</div>

				{#if list.tags?.length}
					<div class="tagRow">
						{#each list.tags as tag}
							<Badge variant="outline">{tag}</Badge>
						{/each}
					</div>
				{/if}

				<p class="updatedAt">Updated {formatDate(list.updated_at)}</p>
			</Card.Content>
		</Card.Root>

		{#if isOwner}
			<div class="ownerGrid">
				<Card.Root>
					<Card.Content>
						<h2>Edit metadata</h2>
						<div class="formGrid">
							<div class="field">
								<label for="list-title">Title</label>
								<Input id="list-title" bind:value={editForm.title} maxlength={100} />
							</div>
							<div class="field">
								<label for="list-description">Description</label>
								<Textarea id="list-description" bind:value={editForm.description} rows={4} />
							</div>
							<div class="field">
								<span class="fieldLabel">Visibility</span>
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
								<label for="list-tags">Tags</label>
								<Input id="list-tags" bind:value={editForm.tags} placeholder="challenge, favorite" />
							</div>
						</div>
						<div class="actionRow">
							<Button on:click={saveMetadata} disabled={savingMetadata}>Save changes</Button>
							<Button variant="destructive" on:click={deleteList}>Delete list</Button>
						</div>
					</Card.Content>
				</Card.Root>

				<Card.Root>
					<Card.Content>
						<h2>Add a level</h2>
						<div class="field">
							<label for="level-id">Geometry Dash Level ID</label>
							<Input id="level-id" bind:value={levelIdInput} inputmode="numeric" />
						</div>
						<p class="hint">Only official Geometry Dash level IDs are accepted.</p>
						<div class="actionRow">
							<Button on:click={addLevel} disabled={addingLevel}>
								<Plus class="mr-2 h-4 w-4" />
								Add level
							</Button>
						</div>
					</Card.Content>
				</Card.Root>
			</div>
		{/if}

		<div class="sectionHeader">
			<h2>Levels</h2>
			<Badge variant="outline">{list.items.length}</Badge>
		</div>

		{#if list.items.length === 0}
			<div class="emptyState slim">
				<h2>No levels yet</h2>
				<p>{isOwner ? 'Add your first level using the form above.' : 'This list has no levels yet.'}</p>
			</div>
		{:else}
			<div class="levelList">
				{#each list.items as item}
					<Card.Root class="levelCard">
						<Card.Content>
							<div class="levelRow">
								<div class="levelBody">
									{#if item.level}
										<a class="levelLink" href={`/level/${item.levelId}`}>{item.level.name || `Level #${item.levelId}`}</a>
										<p>
											by {item.level.creator || 'Unknown'}
											{#if item.level.difficulty}
												• {item.level.difficulty}
											{/if}
											{#if item.level.isPlatformer}
												• Platformer
											{/if}
										</p>
									{:else}
										<span class="levelLink missing">Unavailable level #{item.levelId}</span>
										<p>The level entry still exists in this list, but local metadata is unavailable.</p>
									{/if}
								</div>
								<div class="levelActions">
									<Badge variant="outline">ID {item.levelId}</Badge>
									{#if isOwner}
										<Button
											variant="destructive"
											size="sm"
											on:click={() => removeLevel(item.levelId)}
											disabled={mutatingLevelId === item.levelId}
										>
											<Trash2 class="mr-2 h-4 w-4" />
											Remove
										</Button>
									{/if}
								</div>
							</div>
						</Card.Content>
					</Card.Root>
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

	.levelBody {
		display: flex;
		flex-direction: column;
		gap: 4px;
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