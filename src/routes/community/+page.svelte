<script lang="ts">
	import CommunityPostCard from '$lib/components/communityPostCard.svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import * as Select from '$lib/components/ui/select';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import { _, locale } from 'svelte-i18n';
	import { user } from '$lib/client';
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import {
		Plus,
		MessageCircle,
		Image,
		BookOpen,
		Megaphone,
		ArrowLeft,
		ArrowRight
	} from 'lucide-svelte';

	let posts: any[] | null = null;
	let total = 0;
	let currentPage = 0;
	let activeType: string | null = null;
	let createDialogOpen = false;
	let newPost = {
		title: '',
		content: '',
		type: 'discussion',
		image_url: ''
	};
	let submitting = false;

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
			sortBy: 'created_at',
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
			if (newPost.image_url.trim()) body.image_url = newPost.image_url;

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
			newPost = { title: '', content: '', type: 'discussion', image_url: '' };
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

			<div class="formField">
				<label for="post-image">{$_('community.create.image_url')} ({$_('community.create.optional')})</label>
				<Input id="post-image" bind:value={newPost.image_url} placeholder="https://..." />
			</div>
		</div>

		<Dialog.Footer>
			<Button variant="outline" on:click={() => (createDialogOpen = false)}>
				{$_('general.close')}
			</Button>
			<Button on:click={handleCreate} disabled={submitting}>
				{submitting ? $_('community.create.submitting') : $_('community.create.submit')}
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

		h1 {
			font-size: 28px;
			font-weight: 700;
			margin: 0 0 8px;
		}

		p {
			font-size: 15px;
			color: hsl(var(--muted-foreground));
			margin: 0;
		}
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

		&:hover {
			color: hsl(var(--foreground));
		}

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

		p {
			color: hsl(var(--muted-foreground));
			font-size: 14px;
		}
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

		label {
			font-size: 13px;
			font-weight: 500;
		}
	}

	@media screen and (max-width: 900px) {
		.heroBanner {
			padding: 28px 16px;
		}

		.communityBody {
			padding: 16px 16px 40px;
		}

		.postsGrid {
			grid-template-columns: 1fr;
		}
	}
</style>
