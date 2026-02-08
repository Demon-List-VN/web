<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Select from '$lib/components/ui/select';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import { _ } from 'svelte-i18n';
	import { user } from '$lib/client';
	import { upload } from '$lib/client/storage';
	import { toast } from 'svelte-sonner';
	import { goto } from '$app/navigation';
	import imageCompression from 'browser-image-compression';
	import Markdown from '$lib/components/markdown.svelte';
	import {
		Upload,
		Link,
		X,
		Trophy,
		Gamepad2,
		Search,
		Play,
		Star,
		ThumbsUp,
		ThumbsDown,
		Eye,
		ArrowLeft
	} from 'lucide-svelte';

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

	// Content preview state
	let contentPreviewMode = false;

	// Attachment picker state
	let attachmentType: 'none' | 'record' | 'level' = 'none';
	let myRecords: any[] = [];
	let searchLevels: any[] = [];
	let levelSearchQuery = '';
	let loadingRecords = false;
	let loadingLevels = false;
	let selectedRecord: any = null;
	let selectedLevel: any = null;

	// Review state
	let isRecommended: boolean = true;
	let reviewLevels: any[] = [];
	let reviewLevelSearch = '';
	let loadingReviewLevels = false;

	function getYouTubeId(url: string): string | null {
		if (!url) return null;
		const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
		return match ? match[1] : null;
	}

	$: videoPreviewId = getYouTubeId(newPost.video_url);

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

	let levelSearchTimer: ReturnType<typeof setTimeout>;

	function debouncedLevelSearch() {
		clearTimeout(levelSearchTimer);
		if (!levelSearchQuery.trim()) {
			searchLevels = [];
			return;
		}
		levelSearchTimer = setTimeout(() => searchForLevels(), 400);
	}

	async function searchForLevels() {
		const query = levelSearchQuery.trim();
		if (!query) {
			searchLevels = [];
			return;
		}
		loadingLevels = true;
		try {
			const res = await fetch(`https://gdbrowser.com/api/search/${encodeURIComponent(query)}?page=0&count=5&diff=-2`);
			if (!res.ok) {
				searchLevels = [];
				return;
			}
			const data = await res.json();
			searchLevels = (Array.isArray(data) ? data : []).map((l: any) => ({
				id: parseInt(l.id),
				name: l.name,
				creator: l.author,
				difficulty: l.difficulty,
				isPlatformer: l.platformer ?? false,
				rating: l.stars ?? 0
			}));
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

	async function searchReviewLevels() {
		loadingReviewLevels = true;
		try {
			const token = await $user.token();
			const res = await fetch(`${import.meta.env.VITE_API_URL}/community/my/records`, {
				headers: { Authorization: `Bearer ${token}` }
			});
			const records = await res.json();
			let levels = (records || []).map((r: any) => ({
				id: r.levelid,
				name: r.levels?.name,
				creator: r.levels?.creator,
				difficulty: r.levels?.difficulty,
				isPlatformer: r.levels?.isPlatformer,
				progress: r.progress
			}));
			if (reviewLevelSearch.trim()) {
				levels = levels.filter((l: any) =>
					l.name?.toLowerCase().includes(reviewLevelSearch.trim().toLowerCase())
				);
			}
			reviewLevels = levels;
		} catch {
			reviewLevels = [];
		} finally {
			loadingReviewLevels = false;
		}
	}

	function selectReviewLevel(level: any) {
		selectedLevel = level;
		selectedRecord = null;
		attachmentType = 'level';
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
					maxSizeMB: 1,
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
		if (!newPost.title.trim()) {
			toast.error($_('community.create.validation_error'));
			return;
		}

		if (newPost.type === 'review' && !selectedLevel) {
			toast.error($_('community.review.level_required'));
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

			if (imageFile) {
				const url = await uploadImage();
				if (url) body.image_url = url;
			} else if (newPost.image_url.trim()) {
				body.image_url = newPost.image_url;
			}

			if (newPost.video_url.trim()) {
				body.video_url = newPost.video_url;
			}

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

			if (newPost.type === 'review') {
				body.is_recommended = isRecommended;
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

			const created = await res.json();
			if (created.moderation_status === 'pending') {
				toast.success($_('community.create.pending_review'));
				goto('/community');
			} else {
				toast.success($_('community.create.success'));
				goto(`/community/${created.id}`);
			}
		} catch (e: any) {
			toast.error(e.message);
		} finally {
			submitting = false;
		}
	}
</script>

<svelte:head>
	<title>{$_('community.create.title')} - Geometry Dash VN</title>
</svelte:head>

<div class="createPage">
	<div class="backNav">
		<a href="/community" class="backLink">
			<ArrowLeft class="h-4 w-4" />
			<span>{$_('community.title')}</span>
		</a>
	</div>

	<div class="createContainer">
		<div class="createHeader">
			<h1>{$_('community.create.title')}</h1>
			<p>{$_('community.create.description')}</p>
		</div>

		<div class="createForm">
			<div class="formField">
				<label for="post-title">{$_('community.create.post_title')}</label>
				<Input id="post-title" bind:value={newPost.title} placeholder={$_('community.create.title_placeholder')} />
			</div>

			<div class="formField">
				<label for="post-type">{$_('community.create.post_type')}</label>
				<Select.Root
					onSelectedChange={(v) => {
						if (v) {
							newPost.type = String(v.value);
							if (v.value === 'review') {
								searchReviewLevels();
								clearAttachment();
							}
						}
					}}
				>
					<Select.Trigger>
						<Select.Value placeholder={$_('community.type.discussion')} />
					</Select.Trigger>
					<Select.Content>
						<Select.Item value="discussion">{$_('community.type.discussion')}</Select.Item>
						<Select.Item value="media">{$_('community.type.media')}</Select.Item>
						<Select.Item value="guide">{$_('community.type.guide')}</Select.Item>
						<Select.Item value="review">{$_('community.type.review')}</Select.Item>
						{#if $user.data?.isAdmin}
							<Select.Item value="announcement">{$_('community.type.announcement')}</Select.Item>
						{/if}
					</Select.Content>
				</Select.Root>
			</div>

			{#if newPost.type === 'review'}
				<!-- Review: Level Selection -->
				<div class="formField">
					<span class="fieldLabel">
						<Star class="inline h-3.5 w-3.5 text-yellow-500" />
						{$_('community.review.select_level')} <span class="text-red-500">*</span>
					</span>
					{#if selectedLevel}
						<div class="attachmentPreview">
							<div class="attachmentCard">
								<Gamepad2 class="h-4 w-4 text-emerald-500" />
								<div class="attachmentInfo">
									<strong>{selectedLevel.name}</strong>
									<span class="text-xs text-muted-foreground">{selectedLevel.creator}</span>
								</div>
								<button class="removeBtn" on:click={() => { selectedLevel = null; }}>
									<X class="h-3.5 w-3.5" />
								</button>
							</div>
						</div>
					{:else}
						<div class="attachmentSearch">
							<div class="searchInputWrap">
								<Search class="h-3.5 w-3.5" />
								<input
									type="text"
									bind:value={reviewLevelSearch}
									placeholder={$_('community.review.search_levels')}
									on:input={() => searchReviewLevels()}
								/>
							</div>
						</div>
						<div class="attachmentList">
							{#if loadingReviewLevels}
								<p class="attachmentLoading">{$_('general.loading')}...</p>
							{:else if reviewLevels.length === 0}
								<p class="attachmentEmpty">{$_('community.review.no_eligible_levels')}</p>
							{:else}
								{#each reviewLevels as level}
									<button class="attachmentOption" on:click={() => selectReviewLevel(level)}>
										<Gamepad2 class="h-3.5 w-3.5 text-emerald-500" />
										<span class="attachmentName">{level.name}</span>
										<span class="attachmentMeta">{level.creator}</span>
									</button>
								{/each}
							{/if}
						</div>
					{/if}
				</div>

				<!-- Review: Recommend Toggle -->
				<div class="formField">
					<span class="fieldLabel">{$_('community.review.recommendation')}</span>
					<div class="recommendToggle">
						<button
							class="recommendBtn recommended"
							class:active={isRecommended}
							on:click={() => (isRecommended = true)}
						>
							<ThumbsUp class="h-4 w-4" />
							<span>{$_('community.review.recommended')}</span>
						</button>
						<button
							class="recommendBtn notRecommended"
							class:active={!isRecommended}
							on:click={() => (isRecommended = false)}
						>
							<ThumbsDown class="h-4 w-4" />
							<span>{$_('community.review.not_recommended')}</span>
						</button>
					</div>
				</div>
			{/if}

			<div class="formField">
				<label for="post-content">{$_('community.create.post_content')}</label>
				<div class="contentTabBar">
					<button class="contentTab" class:active={!contentPreviewMode} on:click={() => contentPreviewMode = false}>
						{$_('community.write') || 'Write'}
					</button>
					<button class="contentTab" class:active={contentPreviewMode} on:click={() => contentPreviewMode = true}>
						<Eye class="h-3.5 w-3.5" />
						{$_('community.preview') || 'Preview'}
					</button>
				</div>
				{#if contentPreviewMode}
					<div class="contentPreviewBox">
						{#if newPost.content.trim()}
							<Markdown content={newPost.content} />
						{:else}
							<p class="previewEmpty">{$_('community.preview_empty') || 'Nothing to preview'}</p>
						{/if}
					</div>
				{:else}
					<Textarea
						id="post-content"
						bind:value={newPost.content}
						placeholder={$_('community.create.content_placeholder')}
						rows={10}
					/>
				{/if}
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
				{#if videoPreviewId}
					<div class="videoPreview">
						<div class="videoPreviewThumb">
							<img src="https://img.youtube.com/vi/{videoPreviewId}/mqdefault.jpg" alt="Video preview" />
							<div class="videoPreviewPlay">
								<Play class="h-6 w-6" />
							</div>
						</div>
						<a href="https://youtube.com/watch?v={videoPreviewId}" target="_blank" rel="noopener" class="videoPreviewLink">
							youtube.com/watch?v={videoPreviewId}
						</a>
					</div>
				{/if}
			</div>

			<!-- Attachment Picker (hidden for reviews) -->
			{#if newPost.type !== 'review'}
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
									<span class="text-xs text-muted-foreground">{selectedLevel.creator}</span>
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
											on:input={() => debouncedLevelSearch()}
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
			{/if}
		</div>

		<div class="createFooter">
			<Button variant="outline" on:click={() => goto('/community')}>
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
		</div>
	</div>
</div>

<style lang="scss">
	.createPage {
		min-height: 100vh;
		padding: 24px 50px 60px;
		max-width: 800px;
		margin: 0 auto;
	}

	.backNav {
		margin-bottom: 24px;
	}

	.backLink {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		font-size: 14px;
		font-weight: 500;
		color: hsl(var(--muted-foreground));
		text-decoration: none;
		transition: color 0.15s;

		&:hover {
			color: hsl(var(--foreground));
		}
	}

	.createContainer {
		background: hsl(var(--card));
		border: 1px solid hsl(var(--border));
		border-radius: 12px;
		overflow: hidden;
	}

	.createHeader {
		padding: 24px 28px 0;

		h1 {
			font-size: 22px;
			font-weight: 700;
			margin: 0 0 6px;
		}

		p {
			font-size: 14px;
			color: hsl(var(--muted-foreground));
			margin: 0;
		}
	}

	.createForm {
		display: flex;
		flex-direction: column;
		gap: 20px;
		padding: 24px 28px;
	}

	.createFooter {
		display: flex;
		justify-content: flex-end;
		gap: 8px;
		padding: 16px 28px;
		border-top: 1px solid hsl(var(--border));
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
		padding: 24px;
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
			max-height: 260px;
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

	.videoPreview {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 8px;
		border: 1px solid hsl(var(--border));
		border-radius: 8px;
		background: hsl(var(--muted) / 0.3);
	}

	.videoPreviewThumb {
		position: relative;
		width: 120px;
		height: 68px;
		flex-shrink: 0;
		border-radius: 6px;
		overflow: hidden;

		img {
			width: 100%;
			height: 100%;
			object-fit: cover;
		}
	}

	.videoPreviewPlay {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(0, 0, 0, 0.4);
		color: white;
	}

	.videoPreviewLink {
		font-size: 12px;
		color: hsl(var(--primary));
		word-break: break-all;
		text-decoration: none;

		&:hover { text-decoration: underline; }
	}

	.attachmentPreview {
		display: flex;
	}

	.recommendToggle {
		display: flex;
		gap: 8px;
	}

	.recommendBtn {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 8px 16px;
		border-radius: 8px;
		font-size: 13px;
		font-weight: 500;
		border: 2px solid hsl(var(--border));
		background: transparent;
		color: hsl(var(--muted-foreground));
		cursor: pointer;
		transition: all 0.2s ease;
		flex: 1;
		justify-content: center;

		&.recommended.active {
			border-color: rgb(34, 197, 94);
			background: rgba(34, 197, 94, 0.1);
			color: rgb(34, 197, 94);
		}

		&.notRecommended.active {
			border-color: rgb(239, 68, 68);
			background: rgba(239, 68, 68, 0.1);
			color: rgb(239, 68, 68);
		}

		&:hover {
			border-color: hsl(var(--foreground) / 0.3);
		}
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

	.removeBtn {
		padding: 4px;
		border-radius: 50%;
		background: transparent;
		border: 1px solid hsl(var(--border));
		color: hsl(var(--muted-foreground));
		cursor: pointer;
		transition: all 0.15s;

		&:hover {
			color: hsl(0 84% 60%);
			background: hsl(0 84% 60% / 0.1);
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
		max-height: 200px;
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

	/* Content Write/Preview tabs */
	.contentTabBar {
		display: flex;
		gap: 2px;
		border-bottom: 1px solid hsl(var(--border));
		margin-bottom: 4px;
	}

	.contentTab {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		padding: 6px 12px;
		font-size: 13px;
		font-weight: 500;
		color: hsl(var(--muted-foreground));
		background: transparent;
		border: none;
		border-bottom: 2px solid transparent;
		cursor: pointer;
		transition: all 0.15s;

		&:hover {
			color: hsl(var(--foreground));
		}

		&.active {
			color: hsl(var(--primary));
			border-bottom-color: hsl(var(--primary));
		}
	}

	.contentPreviewBox {
		min-height: 200px;
		padding: 16px;
		border: 1px solid hsl(var(--border));
		border-radius: 8px;
		background: hsl(var(--muted) / 0.2);
		font-size: 14px;
		line-height: 1.6;
	}

	.previewEmpty {
		color: hsl(var(--muted-foreground));
		font-style: italic;
		font-size: 13px;
	}

	@media screen and (max-width: 900px) {
		.createPage {
			padding: 16px 16px 40px;
		}
	}
</style>
