<script lang="ts">
	import CommunityPostCard from '$lib/components/communityPostCard.svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import * as Select from '$lib/components/ui/select';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import { _, locale } from 'svelte-i18n';
	import { user } from '$lib/client';
	import { upload } from '$lib/client/storage';
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import imageCompression from 'browser-image-compression';
	import {
		Plus,
		MessageCircle,
		Image,
		BookOpen,
		Megaphone,
		ArrowLeft,
		ArrowRight,
		Upload,
		Link,
		X,
		Trophy,
		Gamepad2,
		Search
	} from 'lucide-svelte';

	let posts: any[] | null = null;
	let total = 0;
	let currentPage = 0;
	let activeType: string | null = null;
	let sortMode: 'newest' | 'best' = 'newest';
	let createDialogOpen = false;
	let newPost = {
		title: '',
		content: '',
		type: 'discussion',
		image_url: '',
		video_url: ''
	};
	let submitting = false;
	let uploading = false;
	let imageFile: File | null = null;
	let imagePreview: string | null = null;
	let fileInput: HTMLInputElement;

	// Attachment picker state
	let attachmentType: 'none' | 'record' | 'level' = 'none';
	let myRecords: any[] = [];
	let searchLevels: any[] = [];
	let levelSearchQuery = '';
	let loadingRecords = false;
	let loadingLevels = false;
	let selectedRecord: any = null;
	let selectedLevel: any = null;

	const PAGE_SIZE = 15;

	const types = [
		{ value: null, label: 'all', icon: null },
		{ value: 'discussion', label: 'discussion', icon: MessageCircle },
		{ value: 'screenshot', label: 'screenshot', icon: Image },
		{ value: 'guide', label: 'guide', icon: BookOpen },
		{ value: 'announcement', label: 'announcement', icon: Megaphone }
	];

	async function fetchPosts() {
		posts = null;
		const params = new URLSearchParams({
			limit: String(PAGE_SIZE),
			offset: String(currentPage * PAGE_SIZE),
			sortBy: sortMode === 'best' ? 'likes_count' : 'created_at',
			ascending: 'false'
		});

		if (activeType) {
			params.set('type', activeType);
		}

		const token = await $user.token();
		const headers: Record<string, string> = {};
		if (token) headers['Authorization'] = `Bearer ${token}`;

		try {
			const res = await fetch(`${import.meta.env.VITE_API_URL}/community/posts?${params}`, {
				headers
			});
			const json = await res.json();
			posts = json.data;
			total = json.total;
		} catch {
			posts = [];
			total = 0;
		}
	}

	function handleImageSelect(e: Event) {
		const target = e.target as HTMLInputElement;
		const file = target.files?.[0];
		if (!file) return;

		imageFile = file;
		const reader = new FileReader();
		reader.onload = () => {
			imagePreview = reader.result as string;
		};
		reader.readAsDataURL(file);
	}

	function clearImage() {
		imageFile = null;
		imagePreview = null;
		newPost.image_url = '';
		if (fileInput) fileInput.value = '';
	}

	async function fetchMyRecords() {
		if (myRecords.length > 0) return;
		loadingRecords = true;
		try {
			const token = await $user.token();
			const res = await fetch(`${import.meta.env.VITE_API_URL}/community/my/records`, {
				headers: { Authorization: `Bearer ${token}` }
			});
			myRecords = await res.json();
		} catch {
			myRecords = [];
		} finally {
			loadingRecords = false;
		}
	}

	async function searchForLevels() {
		loadingLevels = true;
		try {
			const params = new URLSearchParams({ limit: '20' });
			if (levelSearchQuery.trim()) params.set('q', levelSearchQuery.trim());
			const res = await fetch(`${import.meta.env.VITE_API_URL}/community/levels/search?${params}`);
			searchLevels = await res.json();
		} catch {
			searchLevels = [];
		} finally {
			loadingLevels = false;
		}
	}

	function selectRecord(record: any) {
		selectedRecord = record;
		selectedLevel = null;
		attachmentType = 'record';
	}

	function selectLevel(level: any) {
		selectedLevel = level;
		selectedRecord = null;
		attachmentType = 'level';
	}

	function clearAttachment() {
		selectedRecord = null;
		selectedLevel = null;
		attachmentType = 'none';
	}

	async function uploadImage(): Promise<string | undefined> {
		if (!imageFile) return undefined;
		uploading = true;
		try {
			const token = (await $user.token())!;
			const uid = $user.data.uid;
			const timestamp = Date.now();
			const ext = imageFile.name.endsWith('.gif') ? 'gif' : 'jpg';
			const path = `community/${uid}/${timestamp}.${ext}`;

			let fileToUpload: File | Blob = imageFile;
			if (ext !== 'gif') {
				fileToUpload = await imageCompression(imageFile, {
					maxSizeMB: 2,
					maxWidthOrHeight: 1920,
					useWebWorker: true
				});
			}

			await upload(path, fileToUpload, token);
			return `https://cdn.gdvn.net/${path}`;
		} catch (err) {
			toast.error($_('community.create.upload_failed'));
			return undefined;
		} finally {
			uploading = false;
		}
	}

	async function handleCreate() {
		if (!newPost.title.trim() || !newPost.content.trim()) {
			toast.error($_('community.create.validation_error'));
			return;
		}

		submitting = true;
		const token = await $user.token();

		try {
			const body: any = {
				title: newPost.title,
				content: newPost.content,
				type: newPost.type
			};

			// Upload image if selected
			if (imageFile) {
				const url = await uploadImage();
				if (url) body.image_url = url;
			} else if (newPost.image_url.trim()) {
				body.image_url = newPost.image_url;
			}

			if (newPost.video_url.trim()) {
				body.video_url = newPost.video_url;
			}

			// Attach record or level snapshot
			if (selectedRecord) {
				body.attached_record = {
					levelid: selectedRecord.levelid,
					levelName: selectedRecord.levels?.name,
					creator: selectedRecord.levels?.creator,
					difficulty: selectedRecord.levels?.difficulty,
					isPlatformer: selectedRecord.levels?.isPlatformer,
					progress: selectedRecord.progress,
					videoLink: selectedRecord.videoLink,
					mobile: selectedRecord.mobile
				};
			} else if (selectedLevel) {
				body.attached_level = {
					id: selectedLevel.id,
					name: selectedLevel.name,
					creator: selectedLevel.creator,
					difficulty: selectedLevel.difficulty,
					isPlatformer: selectedLevel.isPlatformer,
					rating: selectedLevel.rating
				};
			}

			const res = await fetch(`${import.meta.env.VITE_API_URL}/community/posts`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`
				},
				body: JSON.stringify(body)
			});

			if (!res.ok) {
				const err = await res.json();
				throw new Error(err.error || 'Failed to create post');
			}

			toast.success($_('community.create.success'));
			createDialogOpen = false;
			newPost = { title: '', content: '', type: 'discussion', image_url: '', video_url: '' };
			clearImage();
			clearAttachment();
			currentPage = 0;
			await fetchPosts();
		} catch (e: any) {
			toast.error(e.message);
		} finally {
			submitting = false;
		}
	}

	function switchType(type: string | null) {
		activeType = type;
		currentPage = 0;
		fetchPosts();
	}

	function switchSort(mode: 'newest' | 'best') {
		sortMode = mode;
		currentPage = 0;
		fetchPosts();
	}

	function nextPage() {
		if ((currentPage + 1) * PAGE_SIZE < total) {
			currentPage++;
			fetchPosts();
		}
	}

	function prevPage() {
		if (currentPage > 0) {
			currentPage--;
			fetchPosts();
		}
	}

	onMount(() => {
		fetchPosts();
	});
</script>

<svelte:head>
	<title>{$_('community.title')} - Geometry Dash VN</title>
</svelte:head>

<div class="communityPage">
	<!-- Hero Banner -->
	<div class="heroBanner">
		<div class="heroContent">
			<h1>{$_('community.title')}</h1>
			<p>{$_('community.subtitle')}</p>
		</div>
	</div>

	<div class="communityBody">
		<!-- Toolbar -->
		<div class="toolbar">
			<div class="toolbarLeft">
				<div class="typeFilters">
					{#each types as t}
						<button
							class="typeBtn"
							class:active={activeType === t.value}
							on:click={() => switchType(t.value)}
						>
							{#if t.icon}
								<svelte:component this={t.icon} class="h-4 w-4" />
							{/if}
							<span>{$_(`community.type.${t.label}`)}</span>
						</button>
					{/each}
				</div>

				<div class="sortFilters">
					<button class="sortBtn" class:active={sortMode === 'newest'} on:click={() => switchSort('newest')}>
						{$_('community.sort.newest')}
					</button>
					<button class="sortBtn" class:active={sortMode === 'best'} on:click={() => switchSort('best')}>
						{$_('community.sort.best')}
					</button>
				</div>
			</div>

			{#if $user.loggedIn}
				<Button on:click={() => (createDialogOpen = true)} class="createBtn">
					<Plus class="mr-1 h-4 w-4" />
					{$_('community.create.button')}
				</Button>
			{/if}
		</div>

		<!-- Posts Grid -->
		<div class="postsGrid">
			{#if posts}
				{#if posts.length > 0}
					{#each posts as post}
						<CommunityPostCard {post} />
					{/each}
				{:else}
					<div class="emptyState">
						<MessageCircle class="h-12 w-12 text-muted-foreground opacity-50" />
						<p>{$_('community.no_posts')}</p>
					</div>
				{/if}
			{:else}
				{#each { length: 6 } as _}
					<CommunityPostCard post={null} />
				{/each}
			{/if}
		</div>

		<!-- Pagination -->
		{#if posts && total > PAGE_SIZE}
			<div class="pagination">
				<Button variant="outline" size="sm" disabled={currentPage === 0} on:click={prevPage}>
					<ArrowLeft class="mr-1 h-4 w-4" />
					{$_('general.back')}
				</Button>
				<span class="pageInfo">
					{currentPage * PAGE_SIZE + 1} - {Math.min((currentPage + 1) * PAGE_SIZE, total)} / {total}
				</span>
				<Button
					variant="outline"
					size="sm"
					disabled={(currentPage + 1) * PAGE_SIZE >= total}
					on:click={nextPage}
				>
					{$_('general.next')}
					<ArrowRight class="ml-1 h-4 w-4" />
				</Button>
			</div>
		{/if}
	</div>
</div>

<!-- Create Post Dialog -->
<Dialog.Root bind:open={createDialogOpen}>
	<Dialog.Content class="max-w-lg">
		<Dialog.Header>
			<Dialog.Title>{$_('community.create.title')}</Dialog.Title>
			<Dialog.Description>{$_('community.create.description')}</Dialog.Description>
		</Dialog.Header>

		<div class="createForm">
			<div class="formField">
				<label for="post-title">{$_('community.create.post_title')}</label>
				<Input id="post-title" bind:value={newPost.title} placeholder={$_('community.create.title_placeholder')} />
			</div>

			<div class="formField">
				<label for="post-type">{$_('community.create.post_type')}</label>
				<Select.Root
					onSelectedChange={(v) => {
						if (v) newPost.type = String(v.value);
					}}
				>
					<Select.Trigger>
						<Select.Value placeholder={$_('community.type.discussion')} />
					</Select.Trigger>
					<Select.Content>
						<Select.Item value="discussion">{$_('community.type.discussion')}</Select.Item>
						<Select.Item value="screenshot">{$_('community.type.screenshot')}</Select.Item>
						<Select.Item value="guide">{$_('community.type.guide')}</Select.Item>
						{#if $user.data?.isAdmin}
							<Select.Item value="announcement">{$_('community.type.announcement')}</Select.Item>
						{/if}
					</Select.Content>
				</Select.Root>
			</div>

			<div class="formField">
				<label for="post-content">{$_('community.create.post_content')}</label>
				<Textarea
					id="post-content"
					bind:value={newPost.content}
					placeholder={$_('community.create.content_placeholder')}
					rows={6}
				/>
			</div>

			<!-- Image Upload -->
			<div class="formField">
				<span class="fieldLabel">{$_('community.create.image')} ({$_('community.create.optional')})</span>
				<div class="uploadArea">
					{#if imagePreview}
						<div class="imagePreview">
							<img src={imagePreview} alt="Preview" />
							<button class="removeBtn" on:click={clearImage}>
								<X class="h-4 w-4" />
							</button>
						</div>
					{:else}
						<button class="uploadBtn" on:click={() => fileInput.click()} type="button">
							<Upload class="h-5 w-5" />
							<span>{$_('community.create.upload_image')}</span>
						</button>
						<input
							bind:this={fileInput}
							type="file"
							accept="image/*"
							class="hidden"
							on:change={handleImageSelect}
						/>
						<div class="orDivider">{$_('community.create.or_url')}</div>
						<Input bind:value={newPost.image_url} placeholder="https://..." />
					{/if}
				</div>
			</div>

			<!-- YouTube URL -->
			<div class="formField">
				<label for="post-video">
					<Link class="inline h-3.5 w-3.5" />
					{$_('community.create.video_url')} ({$_('community.create.optional')})
				</label>
				<Input id="post-video" bind:value={newPost.video_url} placeholder="https://youtube.com/watch?v=..." />
			</div>

			<!-- Attachment Picker -->
			<div class="formField">
				<span class="fieldLabel">
					{$_('community.create.attachment')} ({$_('community.create.optional')})
				</span>

				{#if selectedRecord}
					<div class="attachmentPreview">
						<div class="attachmentCard">
							<Trophy class="h-4 w-4 text-amber-500" />
							<div class="attachmentInfo">
								<strong>{selectedRecord.levels?.name}</strong>
								<span class="text-xs text-muted-foreground">
									{selectedRecord.progress}% · {selectedRecord.levels?.creator}
								</span>
							</div>
							<button class="removeBtn" on:click={clearAttachment}>
								<X class="h-3.5 w-3.5" />
							</button>
						</div>
					</div>
				{:else if selectedLevel}
					<div class="attachmentPreview">
						<div class="attachmentCard">
							<Gamepad2 class="h-4 w-4 text-emerald-500" />
							<div class="attachmentInfo">
								<strong>{selectedLevel.name}</strong>
								<span class="text-xs text-muted-foreground">
									{selectedLevel.creator}
								</span>
							</div>
							<button class="removeBtn" on:click={clearAttachment}>
								<X class="h-3.5 w-3.5" />
							</button>
						</div>
					</div>
				{:else}
					<div class="attachmentPicker">
						<div class="attachmentTabs">
							<button
								class="attachmentTab"
								class:active={attachmentType === 'record'}
								on:click={() => { attachmentType = 'record'; fetchMyRecords(); }}
							>
								<Trophy class="h-3.5 w-3.5" />
								{$_('community.create.my_records')}
							</button>
							<button
								class="attachmentTab"
								class:active={attachmentType === 'level'}
								on:click={() => { attachmentType = 'level'; searchForLevels(); }}
							>
								<Gamepad2 class="h-3.5 w-3.5" />
								{$_('community.create.attach_level')}
							</button>
						</div>

						{#if attachmentType === 'record'}
							<div class="attachmentList">
								{#if loadingRecords}
									<p class="attachmentLoading">{$_('general.loading')}...</p>
								{:else if myRecords.length === 0}
									<p class="attachmentEmpty">{$_('community.create.no_records')}</p>
								{:else}
									{#each myRecords as record}
										<button class="attachmentOption" on:click={() => selectRecord(record)}>
											<Trophy class="h-3.5 w-3.5 text-amber-500" />
											<span class="attachmentName">{record.levels?.name}</span>
											<span class="attachmentMeta">{record.progress}%</span>
										</button>
									{/each}
								{/if}
							</div>
						{/if}

						{#if attachmentType === 'level'}
							<div class="attachmentSearch">
								<div class="searchInputWrap">
									<Search class="h-3.5 w-3.5" />
									<input
										type="text"
										bind:value={levelSearchQuery}
										placeholder={$_('community.create.search_levels')}
										on:input={() => searchForLevels()}
									/>
								</div>
							</div>
							<div class="attachmentList">
								{#if loadingLevels}
									<p class="attachmentLoading">{$_('general.loading')}...</p>
								{:else if searchLevels.length === 0}
									<p class="attachmentEmpty">{$_('community.create.no_levels')}</p>
								{:else}
									{#each searchLevels as level}
										<button class="attachmentOption" on:click={() => selectLevel(level)}>
											<Gamepad2 class="h-3.5 w-3.5 text-emerald-500" />
											<span class="attachmentName">{level.name}</span>
											<span class="attachmentMeta">{level.creator}</span>
										</button>
									{/each}
								{/if}
							</div>
						{/if}
					</div>
				{/if}
			</div>
		</div>

		<Dialog.Footer>
			<Button variant="outline" on:click={() => (createDialogOpen = false)}>
				{$_('general.close')}
			</Button>
			<Button on:click={handleCreate} disabled={submitting || uploading}>
				{#if uploading}
					{$_('community.create.uploading')}
				{:else if submitting}
					{$_('community.create.submitting')}
				{:else}
					{$_('community.create.submit')}
				{/if}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<style lang="scss">
	.communityPage {
		min-height: 100vh;
	}

	.heroBanner {
		background: linear-gradient(135deg, hsl(var(--primary) / 0.15), hsl(var(--primary) / 0.05));
		border-bottom: 1px solid hsl(var(--border));
		padding: 40px 50px;
	}

	.heroContent {
		max-width: 800px;

		h1 { font-size: 28px; font-weight: 700; margin: 0 0 8px; }
		p { font-size: 15px; color: hsl(var(--muted-foreground)); margin: 0; }
	}

	.communityBody {
		padding: 24px 50px 60px;
		max-width: 1200px;
		margin: 0 auto;
	}

	.toolbar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
		margin-bottom: 24px;
		flex-wrap: wrap;
	}

	.toolbarLeft {
		display: flex;
		align-items: center;
		gap: 12px;
		flex-wrap: wrap;
	}

	.typeFilters {
		display: flex;
		gap: 4px;
		background: hsl(var(--muted));
		border-radius: 8px;
		padding: 4px;
		flex-wrap: wrap;
	}

	.typeBtn {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 6px 14px;
		border-radius: 6px;
		font-size: 13px;
		font-weight: 500;
		color: hsl(var(--muted-foreground));
		background: transparent;
		border: none;
		cursor: pointer;
		transition: all 0.2s ease;
		white-space: nowrap;

		&:hover { color: hsl(var(--foreground)); }

		&.active {
			background: hsl(var(--background));
			color: hsl(var(--foreground));
			box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
		}
	}

	.sortFilters {
		display: flex;
		gap: 4px;
		background: hsl(var(--muted));
		border-radius: 8px;
		padding: 4px;
	}

	.sortBtn {
		padding: 6px 12px;
		border-radius: 6px;
		font-size: 13px;
		font-weight: 500;
		color: hsl(var(--muted-foreground));
		background: transparent;
		border: none;
		cursor: pointer;
		transition: all 0.2s ease;

		&:hover { color: hsl(var(--foreground)); }

		&.active {
			background: hsl(var(--background));
			color: hsl(var(--foreground));
			box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
		}
	}

	.postsGrid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
		gap: 16px;
	}

	.emptyState {
		grid-column: 1 / -1;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 12px;
		padding: 60px 0;
		p { color: hsl(var(--muted-foreground)); font-size: 14px; }
	}

	.pagination {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 16px;
		margin-top: 32px;
	}

	.pageInfo {
		font-size: 13px;
		color: hsl(var(--muted-foreground));
	}

	.createForm {
		display: flex;
		flex-direction: column;
		gap: 16px;
		padding: 8px 0;
	}

	.formField {
		display: flex;
		flex-direction: column;
		gap: 6px;

		label, .fieldLabel {
			font-size: 13px;
			font-weight: 500;
			display: flex;
			align-items: center;
			gap: 4px;
		}
	}

	.uploadArea {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.uploadBtn {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		padding: 20px;
		border: 2px dashed hsl(var(--border));
		border-radius: 8px;
		background: transparent;
		color: hsl(var(--muted-foreground));
		cursor: pointer;
		transition: all 0.2s;

		&:hover {
			border-color: hsl(var(--primary));
			color: hsl(var(--primary));
		}
	}

	.orDivider {
		text-align: center;
		font-size: 12px;
		color: hsl(var(--muted-foreground));
	}

	.imagePreview {
		position: relative;
		border-radius: 8px;
		overflow: hidden;

		img {
			width: 100%;
			max-height: 200px;
			object-fit: cover;
		}

		.removeBtn {
			position: absolute;
			top: 8px;
			right: 8px;
			padding: 4px;
			border-radius: 50%;
			background: rgba(0, 0, 0, 0.6);
			color: white;
			border: none;
			cursor: pointer;
			transition: background 0.15s;

			&:hover { background: rgba(0, 0, 0, 0.8); }
		}
	}

	.hidden { display: none; }

	/* Attachment Picker */
	.attachmentPreview {
		display: flex;
	}

	.attachmentCard {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 10px 14px;
		border: 1px solid hsl(var(--border));
		border-radius: 8px;
		background: hsl(var(--muted) / 0.5);
		flex: 1;

		.attachmentInfo {
			flex: 1;
			display: flex;
			flex-direction: column;
			gap: 2px;
			font-size: 13px;
		}
	}

	.attachmentPicker {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.attachmentTabs {
		display: flex;
		gap: 4px;
	}

	.attachmentTab {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 6px 12px;
		border-radius: 6px;
		font-size: 12px;
		font-weight: 500;
		color: hsl(var(--muted-foreground));
		background: hsl(var(--muted));
		border: none;
		cursor: pointer;
		transition: all 0.15s;

		&:hover { color: hsl(var(--foreground)); }
		&.active {
			background: hsl(var(--primary) / 0.1);
			color: hsl(var(--primary));
		}
	}

	.attachmentList {
		max-height: 160px;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: 2px;
		border: 1px solid hsl(var(--border));
		border-radius: 8px;
		padding: 4px;
	}

	.attachmentOption {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 8px 10px;
		border-radius: 6px;
		font-size: 13px;
		background: transparent;
		border: none;
		cursor: pointer;
		text-align: left;
		transition: background 0.15s;

		&:hover { background: hsl(var(--muted)); }

		.attachmentName {
			flex: 1;
			font-weight: 500;
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
		}

		.attachmentMeta {
			font-size: 11px;
			color: hsl(var(--muted-foreground));
			flex-shrink: 0;
		}
	}

	.attachmentSearch {
		.searchInputWrap {
			display: flex;
			align-items: center;
			gap: 8px;
			padding: 8px 12px;
			border: 1px solid hsl(var(--border));
			border-radius: 8px;
			background: hsl(var(--background));

			input {
				flex: 1;
				border: none;
				outline: none;
				background: transparent;
				font-size: 13px;
				color: hsl(var(--foreground));

				&::placeholder { color: hsl(var(--muted-foreground)); }
			}
		}
	}

	.attachmentLoading, .attachmentEmpty {
		padding: 16px;
		text-align: center;
		font-size: 12px;
		color: hsl(var(--muted-foreground));
	}

	@media screen and (max-width: 900px) {
		.heroBanner { padding: 28px 16px; }
		.communityBody { padding: 16px 16px 40px; }
		.postsGrid { grid-template-columns: 1fr; }
	}
</style>
