<script lang="ts">
	import Title from '$lib/components/Title.svelte';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Button } from '$lib/components/ui/button';
	import { Switch } from '$lib/components/ui/switch';
	import * as Alert from '$lib/components/ui/alert';
	import { user } from '$lib/client';
	import { toast } from 'svelte-sonner';
	import { Tag, Plus, X, Palette, Link, Trash2 } from 'lucide-svelte';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';

	// Active tab
	let activeTab: 'level' | 'tags' | 'variants' = 'level';

	let state = 0;
	let level: any = {
		id: NaN,
		name: '',
		creator: '',
		videoID: '',
		minProgress: NaN,
		flTop: NaN,
		rating: NaN,
		insaneTier: NaN,
		isPlatformer: false,
		isNonList: false
	};

	// Tag management state
	let allTags: any[] = [];
	let newTagName = '';
	let newTagColor = '#3b82f6';
	let creatingTag = false;

	// Level tag assignment state
	let levelTags: any[] = [];
	let savingLevelTags = false;

	// Reactive set of selected tag IDs for efficient lookup
	$: selectedTagIds = new Set(levelTags?.map((t) => t.id) || []);

	// Variant management state
	let variants: any[] = [];
	let newVariantId = NaN;
	let addingVariant = false;

	async function getHeaders() {
		const token = await $user.token();
		return {
			Authorization: `Bearer ${token}`,
			'Content-Type': 'application/json'
		};
	}

	// Tag CRUD
	async function fetchAllTags() {
		try {
			const res = await fetch(`${import.meta.env.VITE_API_URL}/levels/tags`);
			if (res.ok) allTags = await res.json();
		} catch {}
	}

	async function createTag() {
		if (!newTagName.trim()) return;
		creatingTag = true;
		try {
			const res = await fetch(`${import.meta.env.VITE_API_URL}/levels/tags`, {
				method: 'POST',
				headers: await getHeaders(),
				body: JSON.stringify({ name: newTagName.trim(), color: newTagColor })
			});
			if (res.ok) {
				newTagName = '';
				newTagColor = '#3b82f6';
				await fetchAllTags();
				toast.success('Tag created');
			} else if (res.status === 409) {
				toast.error('Tag already exists');
			} else {
				toast.error('Failed to create tag');
			}
		} catch {
			toast.error('Failed to create tag');
		} finally {
			creatingTag = false;
		}
	}

	async function deleteTag(tagId: number) {
		if (!confirm('Delete this tag? It will be removed from all levels.')) return;
		try {
			const res = await fetch(`${import.meta.env.VITE_API_URL}/levels/tags/${tagId}`, {
				method: 'DELETE',
				headers: await getHeaders()
			});
			if (res.ok) {
				await fetchAllTags();
				toast.success('Tag deleted');
			}
		} catch {
			toast.error('Failed to delete tag');
		}
	}

	// Level tag assignment
	async function fetchLevelTags() {
		if (isNaN(level.id)) return;
		try {
			const res = await fetch(`${import.meta.env.VITE_API_URL}/levels/${level.id}/tags`);
			if (res.ok) {
				const data = await res.json();
				levelTags = data.map((t: any) => t.level_tags || t);
			}
		} catch {}
	}

	function isTagSelected(tagId: number) {
		return selectedTagIds.has(tagId);
	}

	function toggleLevelTag(tag: any) {
		if (isTagSelected(tag.id)) {
			levelTags = levelTags.filter((t) => t.id !== tag.id);
		} else {
			levelTags = [...levelTags, tag];
		}
	}

	async function saveLevelTags() {
		if (!levelTags || !Array.isArray(levelTags)) {
			toast.error('Invalid level tags data');
			return;
		}
		savingLevelTags = true;
		try {
			const res = await fetch(`${import.meta.env.VITE_API_URL}/levels/${level.id}/tags`, {
				method: 'PUT',
				headers: await getHeaders(),
				body: JSON.stringify({ tag_ids: levelTags.map((t) => t.id) })
			});
			if (res.ok) {
				toast.success('Level tags updated');
			} else {
				toast.error('Failed to update tags');
			}
		} catch {
			toast.error('Failed to update tags');
		} finally {
			savingLevelTags = false;
		}
	}

	// Variant management
	async function fetchVariants() {
		if (isNaN(level.id)) return;
		try {
			const res = await fetch(`${import.meta.env.VITE_API_URL}/levels/${level.id}/variants`);
			if (res.ok) variants = await res.json();
		} catch {}
	}

	async function addVariant() {
		if (isNaN(newVariantId)) return;
		addingVariant = true;
		try {
			const res = await fetch(`${import.meta.env.VITE_API_URL}/levels/${level.id}/variants`, {
				method: 'POST',
				headers: await getHeaders(),
				body: JSON.stringify({ variantLevelId: newVariantId })
			});
			if (res.ok) {
				newVariantId = NaN;
				await fetchVariants();
				toast.success('Variant added');
			} else {
				const err = await res.text();
				toast.error(err || 'Failed to add variant');
			}
		} catch {
			toast.error('Failed to add variant');
		} finally {
			addingVariant = false;
		}
	}

	async function removeVariant(variantId: number) {
		if (!confirm('Remove this variant?')) return;
		try {
			const res = await fetch(
				`${import.meta.env.VITE_API_URL}/levels/${level.id}/variants/${variantId}`,
				{
					method: 'DELETE',
					headers: await getHeaders()
				}
			);
			if (res.ok) {
				await fetchVariants();
				toast.success('Variant removed');
			}
		} catch {
			toast.error('Failed to remove variant');
		}
	}

	onMount(() => {
		const tab = $page.url.searchParams.get('tab');
		if (tab === 'tags' || tab === 'variants') activeTab = tab;
		if (activeTab === 'tags') fetchAllTags();
	});

	async function fetchLevel() {
		fetch(`${import.meta.env.VITE_API_URL}/levels/${level.id}`)
			.then((res) => res.json())
			.then((res: any) => {
				level = res;
				state = 1;
				fetchLevelTags();
				fetchVariants();
				if (allTags.length === 0) fetchAllTags();
			})
			.catch((err) => {
				fetch(`${import.meta.env.VITE_API_URL}/levels/${level.id}?fromGD=1`)
					.then((res) => res.json())
					.then((res: any) => {
						level.name = res.name;
						level.creator = res.author;
						state = 2;
					})
					.catch((err) => (state = 3));
			});
	}

	async function updateLevel() {
		if (!level.isPlatformer) {
			level.isPlatformer = false;
		}

		for (const i in level) {
			// @ts-ignore
			if (level[i] === '') {
				// @ts-ignore
				level[i] = null;
			}
		}

		fetch(`${import.meta.env.VITE_API_URL}/levels`, {
			method: 'PUT',
			body: JSON.stringify(level),
			headers: {
				Authorization: `Bearer ${await $user.token()}`,
				'Content-Type': 'application/json'
			}
		}).then((res) => {
			if (!res.ok) {
				alert('An error occured');
				return;
			}

			alert('Success!');
			window.location.reload();
		});
	}

	async function deleteLevel() {
		if (!confirm("This level and all of it's record will be deleted. Proceed?")) {
			return;
		}

		fetch(`${import.meta.env.VITE_API_URL}/levels/${level.id}`, {
			method: 'DELETE',
			headers: {
				Authorization: `Bearer ${await $user.token()}`
			}
		}).then((res) => {
			if (!res.ok) {
				alert('An error occured');
				return;
			}

			alert('Success!');
			window.location.reload();
		});
	}
</script>

<Title value="Level manager" />

<div class="wrapper">
	<div class="tabBar">
		<button class="tab" class:active={activeTab === 'level'} on:click={() => (activeTab = 'level')}
			>Level Manager</button
		>
		<button
			class="tab"
			class:active={activeTab === 'tags'}
			on:click={() => {
				activeTab = 'tags';
				fetchAllTags();
			}}>Level Tags</button
		>
	</div>

	{#if activeTab === 'tags'}
		<!-- Tag Management -->
		<div class="section">
			<h3 class="sectionTitle"><Tag class="h-4 w-4" /> Create New Tag</h3>
			<div class="createTagRow">
				<Input placeholder="Tag name" bind:value={newTagName} class="w-[200px]" />
				<div class="colorPickerWrap">
					<Palette class="h-4 w-4" />
					<input type="color" bind:value={newTagColor} class="colorInput" />
				</div>
				<span
					class="tagPreview"
					style="background: {newTagColor}18; color: {newTagColor}; border: 1px solid {newTagColor}30"
				>
					{newTagName || 'Preview'}
				</span>
				<Button on:click={createTag} disabled={creatingTag || !newTagName.trim()} size="sm">
					<Plus class="mr-1 h-3.5 w-3.5" />
					{creatingTag ? 'Creating...' : 'Create'}
				</Button>
			</div>
		</div>

		<div class="section">
			<h3 class="sectionTitle">All Level Tags</h3>
			{#if allTags.length === 0}
				<p class="muted">No tags yet. Create one above.</p>
			{:else}
				<div class="tagGrid">
					{#each allTags as tag}
						<div class="tagItem">
							<span
								class="tagBadge"
								style="background: {tag.color || '#666'}18; color: {tag.color ||
									'#666'}; border: 1px solid {tag.color || '#666'}30"
							>
								{tag.name}
							</span>
							<button class="deleteTagBtn" on:click={() => deleteTag(tag.id)} title="Delete tag">
								<Trash2 class="h-3.5 w-3.5" />
							</button>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	{/if}

	{#if activeTab === 'level' || activeTab === 'variants'}
		<div class="input">
			<Label for="id" class="w-[100px]">Level's ID</Label>
			<Input id="id" type="number" inputmode="numeric" class="w-[300px]" bind:value={level.id} />
			<Button on:click={fetchLevel}>Fetch</Button>
		</div>
		{#if state == 2}
			<Alert.Root class="w-[500px]">
				<Alert.Title>Attention!</Alert.Title>
				<Alert.Description
					>No level found in DLVN but exist on GD server. Some detail has been autofilled for you.</Alert.Description
				>
			</Alert.Root>
		{/if}
		{#if state == 3}
			<Alert.Root class="w-[500px]">
				<Alert.Title>Attention!</Alert.Title>
				<Alert.Description
					>No level found on GD server. Please recheck the level's ID.</Alert.Description
				>
			</Alert.Root>
		{/if}
		{#if state == 1 || state == 2}
			<div class="input mt-[50px]">
				<Label for="name" class="w-[100px]">Name</Label>
				<Input
					id="name"
					class="w-[300px]"
					placeholder="Required"
					required
					bind:value={level.name}
				/>
			</div>
			<div class="input">
				<Label for="creator" class="w-[100px]">Creator</Label>
				<Input
					id="creator"
					class="w-[300px]"
					placeholder="Required"
					required
					bind:value={level.creator}
				/>
			</div>
			<div class="input">
				<Label for="videoID" class="w-[100px]">Video ID</Label>
				<Input
					id="videoID"
					class="w-[300px]"
					placeholder="Required"
					required
					bind:value={level.videoID}
				/>
			</div>
			<div class="input">
				<Label for="flTop" class="w-[100px]">FL Top</Label>
				<Input
					id="flTop"
					type="number"
					inputmode="numeric"
					class="w-[300px]"
					bind:value={level.flTop}
				/>
			</div>
			<div class="input">
				<Label for="minProgress" class="w-[100px]">Minimum progress</Label>
				<Input
					id="minProgress"
					type="number"
					inputmode="numeric"
					class="w-[300px]"
					placeholder="Required"
					required
					bind:value={level.minProgress}
				/>
			</div>
			<div class="input">
				<Label for="rating" class="w-[100px]">Rating</Label>
				<Input
					id="rating"
					type="number"
					inputmode="numeric"
					class="w-[300px]"
					bind:value={level.rating}
				/>
			</div>
			<div class="input">
				<Label for="rating" class="w-[100px]">Insane Tier</Label>
				<Input
					id="rating"
					type="number"
					inputmode="numeric"
					class="w-[300px]"
					bind:value={level.insaneTier}
					placeholder="Enter a number for tier"
				/>
				0: D, 1: C, 2: B, 3: A, 4: S, 5: SS
			</div>
			<div class="input">
				<Label for="rating" class="w-[100px]">Platformer</Label>
				<Switch bind:checked={level.isPlatformer}></Switch>
			</div>
			<div class="input">
				<Label for="rating" class="w-[100px]">Non List</Label>
				<Switch bind:checked={level.isNonList}></Switch>
			</div>
			<div class="flex w-[150px] flex-col gap-[15px]">
				<Button on:click={updateLevel}>{state == 1 ? 'Update' : 'Add new level'}</Button>
				{#if state == 1}
					<Button on:click={deleteLevel} variant="destructive" class="mt-[100px]">Delete</Button>
				{/if}
			</div>

			{#if state === 1}
				<!-- Level Tags Assignment -->
				<div class="section mt-8">
					<h3 class="sectionTitle"><Tag class="h-4 w-4" /> Level Tags</h3>
					{#if allTags.length > 0}
						<div class="tagPickerRow">
							{#each allTags as tag}
								{#key levelTags}
									<button
										class="tagChipBtn"
										class:selected={isTagSelected(tag.id)}
										style="--tag-color: {tag.color || '#666'}"
										on:click={() => toggleLevelTag(tag)}
									>
										{tag.name}
									</button>
								{/key}
							{/each}
						</div>
						<Button on:click={saveLevelTags} disabled={savingLevelTags} size="sm" class="mt-2">
							{savingLevelTags ? 'Saving...' : 'Save Tags'}
						</Button>
					{:else}
						<p class="muted">
							No tags available. <button
								class="linkBtn"
								on:click={() => {
									activeTab = 'tags';
									fetchAllTags();
								}}>Create tags first</button
							>
						</p>
					{/if}
				</div>

				<!-- Variants Section -->
				<div class="section mt-8">
					<h3 class="sectionTitle"><Link class="h-4 w-4" /> Low Detail Variants</h3>
					<div class="createTagRow mb-3">
						<Input
							placeholder="Variant Level ID"
							type="number"
							inputmode="numeric"
							bind:value={newVariantId}
							class="w-[200px]"
						/>
						<Button on:click={addVariant} disabled={addingVariant || isNaN(newVariantId)} size="sm">
							<Plus class="mr-1 h-3.5 w-3.5" />
							{addingVariant ? 'Adding...' : 'Add Variant'}
						</Button>
					</div>
					{#if variants.length === 0}
						<p class="muted">No variants for this level.</p>
					{:else}
						<div class="variantList">
							{#each variants as variant}
								<div class="variantItem">
									<div class="variantInfo">
										<a href="/level/{variant.id}" target="_blank" class="variantLink">
											<b>{variant.name || variant.id}</b>
										</a>
										{#if variant.creator}
											<span class="muted">by {variant.creator}</span>
										{/if}
										<span class="muted">ID: {variant.id}</span>
									</div>
									<button
										class="deleteTagBtn"
										on:click={() => removeVariant(variant.id)}
										title="Remove variant"
									>
										<Trash2 class="h-3.5 w-3.5" />
									</button>
								</div>
							{/each}
						</div>
					{/if}
				</div>
			{/if}
		{/if}
	{/if}
</div>

<style lang="scss">
	.wrapper {
		padding-inline: 75px;
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.input {
		display: flex;
		align-items: center;
		gap: 10px;
	}

	.tabBar {
		display: flex;
		gap: 2px;
		border-bottom: 1px solid hsl(var(--border));
		margin-bottom: 20px;
	}

	.tab {
		padding: 8px 16px;
		border: none;
		background: transparent;
		cursor: pointer;
		font-size: 14px;
		font-weight: 500;
		color: hsl(var(--muted-foreground));
		border-bottom: 2px solid transparent;
		transition: all 0.15s;

		&:hover {
			color: hsl(var(--foreground));
		}

		&.active {
			color: hsl(var(--primary));
			border-bottom-color: hsl(var(--primary));
		}
	}

	.section {
		padding: 12px 0;
	}

	.sectionTitle {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 16px;
		font-weight: 600;
		margin-bottom: 12px;
	}

	.createTagRow {
		display: flex;
		align-items: center;
		gap: 10px;
		flex-wrap: wrap;
	}

	.colorPickerWrap {
		display: flex;
		align-items: center;
		gap: 4px;
	}

	.colorInput {
		width: 36px;
		height: 36px;
		border: 1px solid hsl(var(--border));
		border-radius: 6px;
		cursor: pointer;
		padding: 2px;
		background: transparent;
	}

	.tagPreview {
		display: inline-flex;
		align-items: center;
		padding: 4px 12px;
		border-radius: 12px;
		font-size: 13px;
		font-weight: 600;
	}

	.tagGrid {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}

	.tagItem {
		display: flex;
		align-items: center;
		gap: 6px;
	}

	.tagBadge {
		display: inline-flex;
		align-items: center;
		padding: 4px 12px;
		border-radius: 12px;
		font-size: 13px;
		font-weight: 600;
	}

	.deleteTagBtn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 24px;
		height: 24px;
		border-radius: 50%;
		border: none;
		background: transparent;
		color: hsl(var(--muted-foreground));
		cursor: pointer;
		transition: all 0.15s;

		&:hover {
			background: hsl(var(--destructive) / 0.1);
			color: hsl(var(--destructive));
		}
	}

	.tagPickerRow {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}

	.tagChipBtn {
		display: inline-flex;
		align-items: center;
		padding: 4px 12px;
		border-radius: 16px;
		font-size: 13px;
		font-weight: 600;
		cursor: pointer;
		border: 1px solid color-mix(in srgb, var(--tag-color) 40%, transparent);
		background: transparent;
		color: var(--tag-color);
		opacity: 0.5;
		transition: all 0.15s;

		&:hover:not(.selected) {
			background: color-mix(in srgb, var(--tag-color) 15%, transparent);
			opacity: 0.75;
		}

		&.selected {
			background: color-mix(in srgb, var(--tag-color) 20%, transparent);
			border-color: var(--tag-color);
			opacity: 1;
		}
	}

	.muted {
		color: hsl(var(--muted-foreground));
		font-size: 13px;
	}

	.linkBtn {
		background: none;
		border: none;
		color: hsl(var(--primary));
		cursor: pointer;
		text-decoration: underline;
		font-size: 13px;
		padding: 0;
	}

	.variantList {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.variantItem {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 8px 12px;
		border: 1px solid hsl(var(--border));
		border-radius: 8px;
		background: hsl(var(--muted) / 0.3);
	}

	.variantInfo {
		display: flex;
		align-items: center;
		gap: 10px;
	}

	.variantLink {
		color: hsl(var(--primary));
		text-decoration: none;

		&:hover {
			text-decoration: underline;
		}
	}

	.mb-2 {
		margin-bottom: 8px;
	}
	.mb-3 {
		margin-bottom: 12px;
	}
	.mt-2 {
		margin-top: 8px;
	}
	.mt-8 {
		margin-top: 32px;
	}
</style>
