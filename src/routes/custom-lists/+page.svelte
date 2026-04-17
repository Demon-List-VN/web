<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Badge } from '$lib/components/ui/badge';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { user } from '$lib/client';
	import { toast } from 'svelte-sonner';
	import { Plus, Link as LinkIcon, ListPlus } from 'lucide-svelte';

	type CustomList = {
		id: number;
		title: string;
		description: string;
		visibility: 'private' | 'unlisted' | 'public';
		tags: string[];
		levelCount: number;
		updated_at: string;
	};

	const createForm = {
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

	let lists: CustomList[] = [];
	let loading = true;
	let creating = false;
	let actionListId: number | null = null;
	let loadKey = '';

	function getQuickLevelId() {
		const raw = $page.url.searchParams.get('levelId');
		const parsed = raw ? Number.parseInt(raw, 10) : Number.NaN;
		return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
	}

	$: quickLevelId = getQuickLevelId();

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

	async function fetchOwnLists() {
		if (!$user.loggedIn) {
			lists = [];
			loading = false;
			return;
		}

		loading = true;

		try {
			const res = await fetch(`${import.meta.env.VITE_API_URL}/custom-lists/me`, {
				headers: {
					Authorization: `Bearer ${await $user.token()}`
				}
			});

			if (!res.ok) {
				throw new Error('Failed to load your custom lists');
			}

			lists = await res.json();
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Failed to load your custom lists');
		} finally {
			loading = false;
		}
	}

	async function addLevelToList(listId: number, levelId: number) {
		actionListId = listId;

		try {
			const res = await fetch(`${import.meta.env.VITE_API_URL}/custom-lists/${listId}/levels`, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${await $user.token()}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ levelId })
			});

			const payload = await res.json();

			if (!res.ok) {
				throw new Error(payload.error || 'Failed to add level to list');
			}

			toast.success('Level added to list');
			goto(`/custom-lists/${listId}`);
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Failed to add level to list');
		} finally {
			actionListId = null;
		}
	}

	async function createList() {
		if (!createForm.title.trim()) {
			toast.error('Title is required');
			return;
		}

		creating = true;

		try {
			const res = await fetch(`${import.meta.env.VITE_API_URL}/custom-lists`, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${await $user.token()}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					title: createForm.title,
					description: createForm.description,
					visibility: createForm.visibility,
					tags: parseTags(createForm.tags)
				})
			});

			const payload = await res.json();

			if (!res.ok) {
				throw new Error(payload.error || 'Failed to create custom list');
			}

			const createdList = payload as CustomList;

			createForm.title = '';
			createForm.description = '';
			createForm.visibility = 'private';
			createForm.tags = '';

			if (quickLevelId) {
				await addLevelToList(createdList.id, quickLevelId);
				return;
			}

			lists = [createdList, ...lists];
			toast.success('Custom list created');
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Failed to create custom list');
		} finally {
			creating = false;
		}
	}

	$: if ($user.checked) {
		const nextKey = $user.loggedIn ? $user.data?.uid || 'authed' : 'guest';
		if (nextKey !== loadKey) {
			loadKey = nextKey;
			fetchOwnLists();
		}
	}
</script>

<svelte:head>
	<title>Custom Lists - Geometry Dash Việt Nam</title>
</svelte:head>

<div class="page">
	<div class="header">
		<div>
			<h1>Custom Lists</h1>
			<p>Create personal level collections and manage them without touching record flow yet.</p>
		</div>
	</div>

	{#if !$user.checked || loading}
		<div class="emptyState">Loading your custom lists...</div>
	{:else if !$user.loggedIn}
		<div class="emptyState">
			<h2>Sign in to manage custom lists</h2>
			<p>You need an account to create and edit your own lists.</p>
		</div>
	{:else}
		{#if quickLevelId}
			<Card.Root class="quickCard">
				<Card.Content>
					<div class="quickHeader">
						<div>
							<h3>Quick add from level #{quickLevelId}</h3>
							<p>Create a new list below or add this level to one of your existing lists.</p>
						</div>
						<Badge variant="outline">Level {quickLevelId}</Badge>
					</div>
				</Card.Content>
			</Card.Root>
		{/if}

		<Card.Root class="createCard">
			<Card.Content>
				<div class="sectionHeader">
					<h2>Create a new list</h2>
					<Plus class="icon" />
				</div>
				<div class="formGrid">
					<div class="field full">
						<label for="custom-list-title">Title</label>
						<Input id="custom-list-title" bind:value={createForm.title} maxlength={100} />
					</div>
					<div class="field full">
						<label for="custom-list-description">Description</label>
						<Textarea id="custom-list-description" bind:value={createForm.description} rows={4} />
					</div>
					<div class="field full">
						<span class="fieldLabel">Visibility</span>
						<div class="visibilityRow">
							{#each visibilityOptions as visibility}
								<button
									type="button"
									class:selected={createForm.visibility === visibility}
									on:click={() => (createForm.visibility = visibility)}
								>
									{formatVisibility(visibility)}
								</button>
							{/each}
						</div>
					</div>
					<div class="field full">
						<label for="custom-list-tags">Tags</label>
						<Input
							id="custom-list-tags"
							bind:value={createForm.tags}
							placeholder="challenge, favorite, platformer"
						/>
						<p class="hint">Separate tags with commas.</p>
					</div>
				</div>
				<div class="actionRow">
					<Button on:click={createList} disabled={creating}>
						{#if quickLevelId}
							<ListPlus class="mr-2 h-4 w-4" />
							Create and add level
						{:else}
							Create list
						{/if}
					</Button>
				</div>
			</Card.Content>
		</Card.Root>

		<div class="sectionHeader listSectionHeader">
			<h2>Your lists</h2>
			<Badge variant="outline">{lists.length}</Badge>
		</div>

		{#if lists.length === 0}
			<div class="emptyState slim">
				<h2>No custom lists yet</h2>
				<p>Create your first list above to start organizing levels.</p>
			</div>
		{:else}
			<div class="listGrid">
				{#each lists as list}
					<Card.Root class="listCard">
						<Card.Content>
							<div class="listCardHead">
								<div>
									<h3>{list.title}</h3>
									<p>{list.description || 'No description yet.'}</p>
								</div>
								<Badge variant="outline">{formatVisibility(list.visibility)}</Badge>
							</div>

							<div class="metaRow">
								<span>{list.levelCount} levels</span>
								<span>Updated {formatDate(list.updated_at)}</span>
							</div>

							{#if list.tags?.length}
								<div class="tagRow">
									{#each list.tags as tag}
										<Badge variant="outline">{tag}</Badge>
									{/each}
								</div>
							{/if}

							<div class="actionRow compact">
								<Button variant="outline" on:click={() => goto(`/custom-lists/${list.id}`)}>
									Open list
								</Button>
								{#if quickLevelId}
									<Button on:click={() => addLevelToList(list.id, quickLevelId)} disabled={actionListId === list.id}>
										<LinkIcon class="mr-2 h-4 w-4" />
										Add current level
									</Button>
								{/if}
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

	.header h1,
	.sectionHeader h2,
	.quickHeader h3,
	.listCardHead h3,
	.emptyState h2 {
		margin: 0;
	}

	.header p,
	.quickHeader p,
	.listCardHead p,
	.emptyState p,
	.hint {
		color: hsl(var(--muted-foreground));
	}

	:global(.createCard),
	:global(.quickCard),
	:global(.listCard) {
		border: 1px solid hsl(var(--border));
	}

	.sectionHeader {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
	}

	.listSectionHeader {
		margin-top: 8px;
	}

	.quickHeader,
	.listCardHead {
		display: flex;
		justify-content: space-between;
		gap: 16px;
	}

	.formGrid {
		display: grid;
		gap: 16px;
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
		transition: background 0.2s ease, border-color 0.2s ease;
	}

	.visibilityRow button.selected {
		background: hsl(var(--primary) / 0.12);
		border-color: hsl(var(--primary));
	}

	.actionRow {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
		margin-top: 16px;
	}

	.actionRow.compact {
		margin-top: 14px;
	}

	.metaRow,
	.tagRow {
		display: flex;
		flex-wrap: wrap;
		gap: 8px 12px;
		margin-top: 12px;
	}

	.metaRow {
		font-size: 0.92rem;
		color: hsl(var(--muted-foreground));
	}

	.listGrid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
		gap: 16px;
	}

	.emptyState {
		border: 1px dashed hsl(var(--border));
		border-radius: 16px;
		padding: 32px 20px;
		text-align: center;
		background: hsl(var(--muted) / 0.18);
	}

	.emptyState.slim {
		padding: 28px 20px;
	}

	@media screen and (max-width: 700px) {
		.quickHeader,
		.listCardHead {
			flex-direction: column;
		}
	}
</style>