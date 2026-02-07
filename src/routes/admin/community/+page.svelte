<script lang="ts">
	import Title from '$lib/components/Title.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import * as Dialog from '$lib/components/ui/dialog';
	import * as Select from '$lib/components/ui/select';
	import { Textarea } from '$lib/components/ui/textarea';
	import { user } from '$lib/client';
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import {
		Trash2,
		Pin,
		PinOff,
		Search,
		ChevronLeft,
		ChevronRight,
		Pencil,
		MessageCircle,
		Image,
		BookOpen,
		Megaphone,
		ExternalLink,
		Flag,
		Check
	} from 'lucide-svelte';

	let posts: any[] | null = null;
	let total = 0;
	let currentPage = 0;
	let searchQuery = '';
	let filterType: string | null = null;
	let editDialogOpen = false;
	let editPost: any = null;

	// Tab state
	let activeTab: 'posts' | 'reports' = 'posts';

	// Reports state
	let reports: any[] | null = null;
	let reportsTotal = 0;
	let reportsPage = 0;
	let showResolved = false;

	const PAGE_SIZE = 20;

	const typeIcons: Record<string, any> = {
		discussion: MessageCircle,
		screenshot: Image,
		guide: BookOpen,
		announcement: Megaphone
	};

	const typeColors: Record<string, string> = {
		discussion: 'text-blue-500',
		screenshot: 'text-purple-500',
		guide: 'text-emerald-500',
		announcement: 'text-amber-500'
	};

	async function getAuthHeaders() {
		const token = await $user.token();
		return {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${token}`
		};
	}

	async function fetchPosts() {
		posts = null;
		const params = new URLSearchParams({
			limit: String(PAGE_SIZE),
			offset: String(currentPage * PAGE_SIZE)
		});
		if (filterType) params.set('type', filterType);

		try {
			const headers = await getAuthHeaders();
			const res = await fetch(
				`${import.meta.env.VITE_API_URL}/community/admin/posts?${params}`,
				{ headers }
			);
			const json = await res.json();
			posts = json.data;
			total = json.total;
		} catch {
			posts = [];
			total = 0;
		}
	}

	async function deletePost(id: number) {
		if (!confirm('Are you sure you want to delete this post?')) return;

		try {
			const headers = await getAuthHeaders();
			const res = await fetch(`${import.meta.env.VITE_API_URL}/community/admin/posts/${id}`, {
				method: 'DELETE',
				headers
			});
			if (!res.ok) throw new Error();
			toast.success('Post deleted');
			await fetchPosts();
		} catch {
			toast.error('Failed to delete post');
		}
	}

	async function togglePin(post: any) {
		try {
			const headers = await getAuthHeaders();
			const res = await fetch(`${import.meta.env.VITE_API_URL}/community/admin/posts/${post.id}`, {
				method: 'PUT',
				headers,
				body: JSON.stringify({ pinned: !post.pinned })
			});
			if (!res.ok) throw new Error();
			post.pinned = !post.pinned;
			posts = posts;
			toast.success(post.pinned ? 'Post pinned' : 'Post unpinned');
		} catch {
			toast.error('Failed to update post');
		}
	}

	function openEdit(post: any) {
		editPost = {
			id: post.id,
			title: post.title,
			content: post.content,
			type: post.type,
			image_url: post.image_url || '',
			video_url: post.video_url || '',
			pinned: post.pinned
		};
		editDialogOpen = true;
	}

	async function saveEdit() {
		if (!editPost) return;

		try {
			const headers = await getAuthHeaders();
			const body: any = {
				title: editPost.title,
				content: editPost.content,
				type: editPost.type,
				pinned: editPost.pinned
			};
			if (editPost.image_url) body.image_url = editPost.image_url;
			if (editPost.video_url) body.video_url = editPost.video_url;

			const res = await fetch(
				`${import.meta.env.VITE_API_URL}/community/admin/posts/${editPost.id}`,
				{
					method: 'PUT',
					headers,
					body: JSON.stringify(body)
				}
			);

			if (!res.ok) throw new Error();
			toast.success('Post updated');
			editDialogOpen = false;
			editPost = null;
			await fetchPosts();
		} catch {
			toast.error('Failed to update post');
		}
	}

	function formatDate(dateStr: string) {
		return new Date(dateStr).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	onMount(() => {
		fetchPosts();
	});

	async function fetchReports() {
		reports = null;
		const params = new URLSearchParams({
			limit: String(PAGE_SIZE),
			offset: String(reportsPage * PAGE_SIZE),
			resolved: String(showResolved)
		});

		try {
			const headers = await getAuthHeaders();
			const res = await fetch(
				`${import.meta.env.VITE_API_URL}/community/admin/reports?${params}`,
				{ headers }
			);
			const json = await res.json();
			reports = json.data;
			reportsTotal = json.total;
		} catch {
			reports = [];
			reportsTotal = 0;
		}
	}

	async function resolveReport(id: number) {
		try {
			const headers = await getAuthHeaders();
			const res = await fetch(`${import.meta.env.VITE_API_URL}/community/admin/reports/${id}/resolve`, {
				method: 'PUT',
				headers
			});
			if (!res.ok) throw new Error();
			toast.success('Report resolved');
			await fetchReports();
		} catch {
			toast.error('Failed to resolve report');
		}
	}

	function switchTab(tab: 'posts' | 'reports') {
		activeTab = tab;
		if (tab === 'reports' && !reports) {
			fetchReports();
		}
	}

	const reasonLabels: Record<string, string> = {
		inappropriate: 'Inappropriate',
		spam: 'Spam',
		harassment: 'Harassment',
		misinformation: 'Misinformation',
		other: 'Other'
	};
</script>

<Title value="Community Admin" />

<div class="wrapper">
	<div class="header">
		<h1>Community Management</h1>
		<p class="subtitle">Manage posts and review reports</p>
	</div>

	<!-- Tabs -->
	<div class="tabs">
		<button class="tab" class:active={activeTab === 'posts'} on:click={() => switchTab('posts')}>
			<MessageCircle class="h-4 w-4" />
			Posts
		</button>
		<button class="tab" class:active={activeTab === 'reports'} on:click={() => switchTab('reports')}>
			<Flag class="h-4 w-4" />
			Reports
		</button>
	</div>

	{#if activeTab === 'posts'}
	<!-- Toolbar -->
	<div class="toolbar">
		<div class="searchBox">
			<Search class="h-4 w-4 text-muted-foreground" />
			<Input
				bind:value={searchQuery}
				placeholder="Search posts..."
				class="border-0 bg-transparent focus-visible:ring-0"
			/>
		</div>

		<div class="filters">
			<Select.Root
				onSelectedChange={(v) => {
					filterType = v ? String(v.value) : null;
					currentPage = 0;
					fetchPosts();
				}}
			>
				<Select.Trigger class="w-[140px]">
					<Select.Value placeholder="All types" />
				</Select.Trigger>
				<Select.Content>
					<Select.Item value="">All types</Select.Item>
					<Select.Item value="discussion">Discussion</Select.Item>
					<Select.Item value="screenshot">Screenshot</Select.Item>
					<Select.Item value="guide">Guide</Select.Item>
					<Select.Item value="announcement">Announcement</Select.Item>
				</Select.Content>
			</Select.Root>
		</div>
	</div>

	<!-- Posts Table -->
	<div class="tableContainer">
		<table class="postsTable">
			<thead>
				<tr>
					<th>ID</th>
					<th>Type</th>
					<th>Title</th>
					<th>Author</th>
					<th>Likes</th>
					<th>Comments</th>
					<th>Date</th>
					<th>Actions</th>
				</tr>
			</thead>
			<tbody>
				{#if posts}
					{#each posts as post}
						{@const TypeIcon = typeIcons[post.type] || MessageCircle}
						<tr class:pinned={post.pinned}>
							<td class="idCol">{post.id}</td>
							<td>
								<div class="typeBadge {typeColors[post.type]}">
									<svelte:component this={TypeIcon} class="h-3.5 w-3.5" />
									<span>{post.type}</span>
								</div>
							</td>
							<td class="titleCol">
								<div class="titleWrap">
									{#if post.pinned}
										<Pin class="h-3 w-3 text-primary flex-shrink-0" />
									{/if}
									<a href="/community/{post.id}" target="_blank" class="titleLink">
										{post.title}
										<ExternalLink class="h-3 w-3 inline ml-1" />
									</a>
								</div>
							</td>
							<td class="authorCol">
								{post.players?.name || post.uid}
							</td>
							<td class="center">{post.likes_count}</td>
							<td class="center">{post.comments_count}</td>
							<td class="dateCol">{formatDate(post.created_at)}</td>
							<td>
								<div class="actions">
									<button class="actionBtn" on:click={() => openEdit(post)} title="Edit">
										<Pencil class="h-4 w-4" />
									</button>
									<button
										class="actionBtn"
										on:click={() => togglePin(post)}
										title={post.pinned ? 'Unpin' : 'Pin'}
									>
										{#if post.pinned}
											<PinOff class="h-4 w-4" />
										{:else}
											<Pin class="h-4 w-4" />
										{/if}
									</button>
									<button class="actionBtn danger" on:click={() => deletePost(post.id)} title="Delete">
										<Trash2 class="h-4 w-4" />
									</button>
								</div>
							</td>
						</tr>
					{/each}
					{#if posts.length === 0}
						<tr>
							<td colspan="8" class="emptyRow">No posts found</td>
						</tr>
					{/if}
				{:else}
					{#each { length: 5 } as _}
						<tr class="skeleton">
							<td colspan="8"><div class="skeletonLine"></div></td>
						</tr>
					{/each}
				{/if}
			</tbody>
		</table>
	</div>

	<!-- Pagination -->
	{#if posts && total > PAGE_SIZE}
		<div class="pagination">
			<Button
				variant="outline"
				size="sm"
				disabled={currentPage === 0}
				on:click={() => { currentPage--; fetchPosts(); }}
			>
				<ChevronLeft class="h-4 w-4" />
			</Button>
			<span class="pageInfo">
				{currentPage * PAGE_SIZE + 1}-{Math.min((currentPage + 1) * PAGE_SIZE, total)} of {total}
			</span>
			<Button
				variant="outline"
				size="sm"
				disabled={(currentPage + 1) * PAGE_SIZE >= total}
				on:click={() => { currentPage++; fetchPosts(); }}
			>
				<ChevronRight class="h-4 w-4" />
			</Button>
		</div>
	{/if}
	{/if}

	{#if activeTab === 'reports'}
	<!-- Reports Toolbar -->
	<div class="toolbar">
		<div class="filters">
			<Button
				variant={showResolved ? 'outline' : 'default'}
				size="sm"
				on:click={() => { showResolved = false; reportsPage = 0; fetchReports(); }}
			>
				Pending
			</Button>
			<Button
				variant={showResolved ? 'default' : 'outline'}
				size="sm"
				on:click={() => { showResolved = true; reportsPage = 0; fetchReports(); }}
			>
				Resolved
			</Button>
		</div>
	</div>

	<!-- Reports Table -->
	<div class="tableContainer">
		<table class="postsTable">
			<thead>
				<tr>
					<th>ID</th>
					<th>Reason</th>
					<th>Target</th>
					<th>Reporter</th>
					<th>Description</th>
					<th>Date</th>
					<th>Actions</th>
				</tr>
			</thead>
			<tbody>
				{#if reports}
					{#each reports as report}
						<tr>
							<td class="idCol">{report.id}</td>
							<td>
								<span class="reasonBadge">{reasonLabels[report.reason] || report.reason}</span>
							</td>
							<td class="titleCol">
								{#if report.community_posts}
									<a href="/community/{report.community_posts.id}" target="_blank" class="titleLink">
										Post: {report.community_posts.title}
										<ExternalLink class="h-3 w-3 inline ml-1" />
									</a>
								{:else if report.community_comments}
									<span class="commentRef">Comment: {report.community_comments.content?.slice(0, 60)}...</span>
								{/if}
							</td>
							<td class="authorCol">{report.players?.name || report.uid}</td>
							<td class="descCol">{report.description || '—'}</td>
							<td class="dateCol">{formatDate(report.created_at)}</td>
							<td>
								<div class="actions">
									{#if !report.resolved}
										<button class="actionBtn resolve" on:click={() => resolveReport(report.id)} title="Resolve">
											<Check class="h-4 w-4" />
										</button>
									{:else}
										<span class="resolvedBadge">✓</span>
									{/if}
									{#if report.post_id}
										<button class="actionBtn danger" on:click={() => deletePost(report.post_id)} title="Delete Post">
											<Trash2 class="h-4 w-4" />
										</button>
									{/if}
								</div>
							</td>
						</tr>
					{/each}
					{#if reports.length === 0}
						<tr>
							<td colspan="7" class="emptyRow">No reports found</td>
						</tr>
					{/if}
				{:else}
					{#each { length: 3 } as _}
						<tr class="skeleton">
							<td colspan="7"><div class="skeletonLine"></div></td>
						</tr>
					{/each}
				{/if}
			</tbody>
		</table>
	</div>

	<!-- Reports Pagination -->
	{#if reports && reportsTotal > PAGE_SIZE}
		<div class="pagination">
			<Button
				variant="outline"
				size="sm"
				disabled={reportsPage === 0}
				on:click={() => { reportsPage--; fetchReports(); }}
			>
				<ChevronLeft class="h-4 w-4" />
			</Button>
			<span class="pageInfo">
				{reportsPage * PAGE_SIZE + 1}-{Math.min((reportsPage + 1) * PAGE_SIZE, reportsTotal)} of {reportsTotal}
			</span>
			<Button
				variant="outline"
				size="sm"
				disabled={(reportsPage + 1) * PAGE_SIZE >= reportsTotal}
				on:click={() => { reportsPage++; fetchReports(); }}
			>
				<ChevronRight class="h-4 w-4" />
			</Button>
		</div>
	{/if}
	{/if}
</div>

<!-- Edit Dialog -->
<Dialog.Root bind:open={editDialogOpen}>
	<Dialog.Content class="max-w-lg">
		<Dialog.Header>
			<Dialog.Title>Edit Post #{editPost?.id}</Dialog.Title>
		</Dialog.Header>

		{#if editPost}
			<div class="editForm">
				<div class="field">
					<label for="edit-title">Title</label>
					<Input id="edit-title" bind:value={editPost.title} />
				</div>
				<div class="field">
					<span class="fieldLabel">Type</span>
					<Select.Root
						onSelectedChange={(v) => {
							if (v) editPost.type = String(v.value);
						}}
					>
						<Select.Trigger>
							<Select.Value placeholder={editPost.type} />
						</Select.Trigger>
						<Select.Content>
							<Select.Item value="discussion">Discussion</Select.Item>
							<Select.Item value="screenshot">Screenshot</Select.Item>
							<Select.Item value="guide">Guide</Select.Item>
							<Select.Item value="announcement">Announcement</Select.Item>
						</Select.Content>
					</Select.Root>
				</div>
				<div class="field">
					<label for="edit-content">Content</label>
					<Textarea id="edit-content" bind:value={editPost.content} rows={6} />
				</div>
				<div class="field">
					<label for="edit-image">Image URL</label>
					<Input id="edit-image" bind:value={editPost.image_url} placeholder="https://..." />
				</div>
				<div class="field">
					<label for="edit-video">Video URL</label>
					<Input id="edit-video" bind:value={editPost.video_url} placeholder="https://youtube.com/watch?v=..." />
				</div>
			</div>
		{/if}

		<Dialog.Footer>
			<Button variant="outline" on:click={() => (editDialogOpen = false)}>Cancel</Button>
			<Button on:click={saveEdit}>Save Changes</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<style lang="scss">
	.wrapper {
		padding: 2rem;
		max-width: 1400px;
		margin: 0 auto;
	}

	.header {
		margin-bottom: 2rem;

		h1 {
			font-size: 1.75rem;
			font-weight: 700;
			margin: 0 0 4px;
		}

		.subtitle {
			color: hsl(var(--muted-foreground));
			font-size: 14px;
			margin: 0;
		}
	}

	.toolbar {
		display: flex;
		align-items: center;
		gap: 12px;
		margin-bottom: 16px;
		flex-wrap: wrap;
	}

	.searchBox {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 0 12px;
		border: 1px solid hsl(var(--border));
		border-radius: 8px;
		flex: 1;
		min-width: 200px;
	}

	.tableContainer {
		border: 1px solid hsl(var(--border));
		border-radius: 12px;
		overflow: auto;
	}

	.postsTable {
		width: 100%;
		border-collapse: collapse;
		font-size: 13px;

		th {
			text-align: left;
			padding: 12px 14px;
			font-weight: 600;
			font-size: 12px;
			text-transform: uppercase;
			letter-spacing: 0.5px;
			color: hsl(var(--muted-foreground));
			border-bottom: 1px solid hsl(var(--border));
			background: hsl(var(--muted) / 0.3);
			white-space: nowrap;
		}

		td {
			padding: 10px 14px;
			border-bottom: 1px solid hsl(var(--border) / 0.5);
			vertical-align: middle;
		}

		tr:last-child td {
			border-bottom: none;
		}

		tr.pinned {
			background: hsl(var(--primary) / 0.05);
		}
	}

	.idCol {
		color: hsl(var(--muted-foreground));
		font-family: monospace;
		font-size: 12px;
	}

	.typeBadge {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		font-size: 12px;
		font-weight: 500;
		text-transform: capitalize;
	}

	.titleCol {
		max-width: 300px;
	}

	.titleWrap {
		display: flex;
		align-items: center;
		gap: 6px;
	}

	.titleLink {
		color: hsl(var(--foreground));
		text-decoration: none;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		max-width: 280px;
		display: inline-block;

		&:hover {
			text-decoration: underline;
		}
	}

	.authorCol {
		color: hsl(var(--muted-foreground));
		font-size: 12px;
	}

	.center {
		text-align: center;
	}

	.dateCol {
		white-space: nowrap;
		font-size: 12px;
		color: hsl(var(--muted-foreground));
	}

	.actions {
		display: flex;
		gap: 4px;
	}

	.actionBtn {
		padding: 6px;
		border-radius: 6px;
		background: transparent;
		border: none;
		color: hsl(var(--muted-foreground));
		cursor: pointer;
		transition: all 0.15s;

		&:hover {
			background: hsl(var(--muted));
			color: hsl(var(--foreground));
		}

		&.danger:hover {
			color: hsl(0 84% 60%);
			background: hsl(0 84% 60% / 0.1);
		}
	}

	.emptyRow {
		text-align: center;
		padding: 40px 0 !important;
		color: hsl(var(--muted-foreground));
	}

	.pagination {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 12px;
		margin-top: 16px;
	}

	.pageInfo {
		font-size: 13px;
		color: hsl(var(--muted-foreground));
	}

	.editForm {
		display: flex;
		flex-direction: column;
		gap: 14px;
		padding: 8px 0;
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: 4px;

		label, .fieldLabel {
			font-size: 13px;
			font-weight: 500;
		}
	}

	.skeleton td {
		height: 48px;
	}

	.skeletonLine {
		height: 14px;
		border-radius: 4px;
		background: hsl(var(--muted));
		animation: pulse 1.5s ease-in-out infinite;
	}

	@keyframes pulse {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.5; }
	}

	@media screen and (max-width: 768px) {
		.wrapper { padding: 1rem; }
	}

	.tabs {
		display: flex;
		gap: 4px;
		margin-bottom: 20px;
		background: hsl(var(--muted));
		border-radius: 8px;
		padding: 4px;
		width: fit-content;
	}

	.tab {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 8px 16px;
		border-radius: 6px;
		font-size: 13px;
		font-weight: 500;
		color: hsl(var(--muted-foreground));
		background: transparent;
		border: none;
		cursor: pointer;
		transition: all 0.2s;

		&:hover { color: hsl(var(--foreground)); }
		&.active {
			background: hsl(var(--background));
			color: hsl(var(--foreground));
			box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
		}
	}

	.reasonBadge {
		display: inline-block;
		padding: 2px 8px;
		border-radius: 4px;
		font-size: 11px;
		font-weight: 600;
		background: hsl(0 84% 60% / 0.1);
		color: hsl(0 84% 60%);
	}

	.resolvedBadge {
		color: hsl(var(--primary));
		font-weight: 600;
	}

	.commentRef {
		font-size: 12px;
		color: hsl(var(--muted-foreground));
	}

	.descCol {
		max-width: 200px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-size: 12px;
		color: hsl(var(--muted-foreground));
	}

	.actionBtn.resolve {
		color: hsl(var(--primary));
		&:hover {
			background: hsl(var(--primary) / 0.1);
		}
	}
</style>
