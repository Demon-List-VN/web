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
	import { page } from '$app/stores';
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
		Check,
		Star,
		EyeOff,
		Eye,
		Shield,
		X,
		Tag,
		Plus,
		Palette,
		Save
	} from 'lucide-svelte';

	let posts: any[] | null = null;
	let total = 0;
	let currentPage = 0;
	let searchQuery = '';
	let filterType: string | null = null;
	let editDialogOpen = false;
	let editPost: any = null;

	// Tab state
	let activeTab: 'posts' | 'reports' | 'moderation' | 'tags' = 'posts';
	let showHidden = false;

	// Tags state
	let tags: any[] | null = null;
	let newTagName = '';
	let newTagColor = '#3b82f6';
	let newTagAdminOnly = false;
	let creatingTag = false;
	let editingTag: any = null;
	let editTagName = '';
	let editTagColor = '';
	let editTagAdminOnly = false;
	let savingTagEdit = false;

	// Reports state
	let reports: any[] | null = null;
	let reportsTotal = 0;
	let reportsPage = 0;
	let showResolved = false;

	// Moderation state
	let pendingPosts: any[] | null = null;
	let pendingTotal = 0;
	let pendingPage = 0;
	let moderationDetailOpen = false;
	let moderationDetailPost: any = null;
	let showModerationRaw = false;

	const PAGE_SIZE = 20;

	const typeIcons: Record<string, any> = {
		discussion: MessageCircle,
		media: Image,
		guide: BookOpen,
		announcement: Megaphone,
		review: Star
	};

	const typeColors: Record<string, string> = {
		discussion: 'text-blue-500',
		media: 'text-purple-500',
		guide: 'text-emerald-500',
		announcement: 'text-amber-500',
		review: 'text-yellow-500'
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
		if (showHidden) params.set('hidden', 'true');

		try {
			const headers = await getAuthHeaders();
			const res = await fetch(`${import.meta.env.VITE_API_URL}/community/admin/posts?${params}`, {
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
		// Check for tab query param
		const tabParam = $page.url.searchParams.get('tab');
		if (tabParam === 'tags' || tabParam === 'reports' || tabParam === 'moderation') {
			switchTab(tabParam as any);
		}
		fetchPosts();
		// Fetch pending count for badge
		fetchPendingCount();
	});

	async function fetchPendingCount() {
		try {
			const headers = await getAuthHeaders();
			const res = await fetch(
				`${import.meta.env.VITE_API_URL}/community/admin/moderation/pending?limit=1&offset=0`,
				{ headers }
			);
			const json = await res.json();
			pendingTotal = json.total;
		} catch {
			// ignore
		}
	}

	async function fetchReports() {
		reports = null;
		const params = new URLSearchParams({
			limit: String(PAGE_SIZE),
			offset: String(reportsPage * PAGE_SIZE),
			resolved: String(showResolved)
		});

		try {
			const headers = await getAuthHeaders();
			const res = await fetch(`${import.meta.env.VITE_API_URL}/community/admin/reports?${params}`, {
				headers
			});
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
			const res = await fetch(
				`${import.meta.env.VITE_API_URL}/community/admin/reports/${id}/resolve`,
				{
					method: 'PUT',
					headers
				}
			);
			if (!res.ok) throw new Error();
			toast.success('Report resolved');
			await fetchReports();
		} catch {
			toast.error('Failed to resolve report');
		}
	}

	function switchTab(tab: 'posts' | 'reports' | 'moderation' | 'tags') {
		activeTab = tab;
		if (tab === 'reports' && !reports) {
			fetchReports();
		}
		if (tab === 'moderation' && !pendingPosts) {
			fetchPendingPosts();
		}
		if (tab === 'tags' && !tags) {
			fetchTags();
		}
	}

	// ---- Tags Management ----

	async function fetchTags() {
		tags = null;
		try {
			const res = await fetch(`${import.meta.env.VITE_API_URL}/community/tags`);
			tags = await res.json();
		} catch {
			tags = [];
		}
	}

	async function createTag() {
		if (!newTagName.trim()) {
			toast.error('Tag name is required');
			return;
		}
		creatingTag = true;
		try {
			const headers = await getAuthHeaders();
			const res = await fetch(`${import.meta.env.VITE_API_URL}/community/tags`, {
				method: 'POST',
				headers,
				body: JSON.stringify({
					name: newTagName.trim(),
					color: newTagColor,
					admin_only: newTagAdminOnly
				})
			});
			if (!res.ok) {
				const err = await res.json();
				throw new Error(err.error || 'Failed to create tag');
			}
			toast.success('Tag created');
			newTagName = '';
			newTagColor = '#3b82f6';
			newTagAdminOnly = false;
			await fetchTags();
		} catch (e: any) {
			toast.error(e.message);
		} finally {
			creatingTag = false;
		}
	}

	async function deleteTag(id: number) {
		if (!confirm('Delete this tag? It will be removed from all posts.')) return;
		try {
			const headers = await getAuthHeaders();
			const res = await fetch(`${import.meta.env.VITE_API_URL}/community/tags/${id}`, {
				method: 'DELETE',
				headers
			});
			if (!res.ok) throw new Error();
			toast.success('Tag deleted');
			await fetchTags();
		} catch {
			toast.error('Failed to delete tag');
		}
	}

	function startEditPostTag(tag: any) {
		editingTag = tag;
		editTagName = tag.name;
		editTagColor = tag.color || '#3b82f6';
		editTagAdminOnly = tag.admin_only || false;
	}

	function cancelEditPostTag() {
		editingTag = null;
		editTagName = '';
		editTagColor = '';
		editTagAdminOnly = false;
	}

	async function saveEditPostTag() {
		if (!editTagName.trim() || !editingTag) return;
		savingTagEdit = true;
		try {
			const headers = await getAuthHeaders();
			const res = await fetch(`${import.meta.env.VITE_API_URL}/community/tags/${editingTag.id}`, {
				method: 'PUT',
				headers,
				body: JSON.stringify({
					name: editTagName.trim(),
					color: editTagColor,
					admin_only: editTagAdminOnly
				})
			});
			if (res.ok) {
				toast.success('Tag updated');
				cancelEditPostTag();
				await fetchTags();
			} else if (res.status === 409) {
				toast.error('Tag name already exists');
			} else {
				const err = await res.json().catch(() => ({}));
				toast.error(err.error || 'Failed to update tag');
			}
		} catch {
			toast.error('Failed to update tag');
		} finally {
			savingTagEdit = false;
		}
	}

	const reasonLabels: Record<string, string> = {
		inappropriate: 'Inappropriate',
		spam: 'Spam',
		harassment: 'Harassment',
		misinformation: 'Misinformation',
		other: 'Other'
	};

	async function togglePostHidden(post: any) {
		try {
			const headers = await getAuthHeaders();
			const res = await fetch(
				`${import.meta.env.VITE_API_URL}/community/admin/posts/${post.id}/hidden`,
				{
					method: 'PUT',
					headers,
					body: JSON.stringify({ hidden: !post.hidden })
				}
			);
			if (!res.ok) throw new Error();
			post.hidden = !post.hidden;
			posts = posts;
			toast.success(post.hidden ? 'Post hidden' : 'Post unhidden');
		} catch {
			toast.error('Failed to update post');
		}
	}

	// ---- Moderation ----

	async function fetchPendingPosts() {
		pendingPosts = null;
		const params = new URLSearchParams({
			limit: String(PAGE_SIZE),
			offset: String(pendingPage * PAGE_SIZE)
		});

		try {
			const headers = await getAuthHeaders();
			const res = await fetch(
				`${import.meta.env.VITE_API_URL}/community/admin/moderation/pending?${params}`,
				{ headers }
			);
			const json = await res.json();
			pendingPosts = json.data;
			pendingTotal = json.total;
		} catch {
			pendingPosts = [];
			pendingTotal = 0;
		}
	}

	async function approvePendingPost(id: number) {
		try {
			const headers = await getAuthHeaders();
			const res = await fetch(
				`${import.meta.env.VITE_API_URL}/community/admin/moderation/${id}/approve`,
				{
					method: 'PUT',
					headers
				}
			);
			if (!res.ok) throw new Error();
			toast.success('Post approved');
			moderationDetailOpen = false;
			moderationDetailPost = null;
			await fetchPendingPosts();
		} catch {
			toast.error('Failed to approve post');
		}
	}

	async function rejectPendingPost(id: number) {
		if (!confirm('Are you sure you want to reject this post?')) return;
		try {
			const headers = await getAuthHeaders();
			const res = await fetch(
				`${import.meta.env.VITE_API_URL}/community/admin/moderation/${id}/reject`,
				{
					method: 'PUT',
					headers
				}
			);
			if (!res.ok) throw new Error();
			toast.success('Post rejected');
			moderationDetailOpen = false;
			moderationDetailPost = null;
			await fetchPendingPosts();
		} catch {
			toast.error('Failed to reject post');
		}
	}

	function openModerationDetail(post: any) {
		moderationDetailPost = post;
		moderationDetailOpen = true;
	}

	function getFlaggedCategories(moderationResult: any): string[] {
		if (!moderationResult?.results?.[0]?.categories) return [];
		const cats = moderationResult.results[0].categories;
		return Object.entries(cats)
			.filter(([_, v]) => v === true)
			.map(([k]) => k);
	}

	function getCategoryScores(moderationResult: any): Array<{ name: string; score: number }> {
		if (!moderationResult?.results?.[0]?.category_scores) return [];
		const scores = moderationResult.results[0].category_scores;
		return Object.entries(scores)
			.map(([name, score]) => ({ name, score: score as number }))
			.sort((a, b) => b.score - a.score);
	}

	// Derived moderation view state for the detail dialog
	$: modResult = moderationDetailPost?.community_posts_admin?.moderation_result;
	$: modFlagged = getFlaggedCategories(modResult);
	$: modScores = getCategoryScores(modResult);
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
		<button
			class="tab"
			class:active={activeTab === 'reports'}
			on:click={() => switchTab('reports')}
		>
			<Flag class="h-4 w-4" />
			Reports
		</button>
		<button
			class="tab"
			class:active={activeTab === 'moderation'}
			on:click={() => switchTab('moderation')}
		>
			<Shield class="h-4 w-4" />
			Moderation
			{#if pendingTotal > 0}
				<span class="badge">{pendingTotal}</span>
			{/if}
		</button>
		<button class="tab" class:active={activeTab === 'tags'} on:click={() => switchTab('tags')}>
			<Tag class="h-4 w-4" />
			Tags
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
				<Button
					variant={showHidden ? 'outline' : 'default'}
					size="sm"
					on:click={() => {
						showHidden = false;
						currentPage = 0;
						fetchPosts();
					}}
				>
					<Eye class="mr-1 h-3.5 w-3.5" />
					Visible
				</Button>
				<Button
					variant={showHidden ? 'default' : 'outline'}
					size="sm"
					on:click={() => {
						showHidden = true;
						currentPage = 0;
						fetchPosts();
					}}
				>
					<EyeOff class="mr-1 h-3.5 w-3.5" />
					Hidden
				</Button>
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
						<Select.Item value="media">Media</Select.Item>
						<Select.Item value="guide">Guide</Select.Item>
						<Select.Item value="review">Review</Select.Item>
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
							<tr class:pinned={post.pinned} class:hiddenPost={post.hidden}>
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
											<Pin class="h-3 w-3 flex-shrink-0 text-primary" />
										{/if}
										{#if post.hidden}
											<EyeOff class="h-3 w-3 flex-shrink-0 text-red-500" />
										{/if}
										<a href="/community/{post.id}" target="_blank" class="titleLink">
											{post.title}
											<ExternalLink class="ml-1 inline h-3 w-3" />
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
										<button
											class="actionBtn"
											on:click={() => openModerationDetail(post)}
											title="View Details"
										>
											<Shield class="h-4 w-4" />
										</button>
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
										<button
											class="actionBtn"
											class:danger={!post.hidden}
											on:click={() => togglePostHidden(post)}
											title={post.hidden ? 'Unhide' : 'Hide'}
										>
											{#if post.hidden}
												<Eye class="h-4 w-4" />
											{:else}
												<EyeOff class="h-4 w-4" />
											{/if}
										</button>
										<button
											class="actionBtn danger"
											on:click={() => deletePost(post.id)}
											title="Delete"
										>
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
					on:click={() => {
						currentPage--;
						fetchPosts();
					}}
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
					on:click={() => {
						currentPage++;
						fetchPosts();
					}}
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
					on:click={() => {
						showResolved = false;
						reportsPage = 0;
						fetchReports();
					}}
				>
					Pending
				</Button>
				<Button
					variant={showResolved ? 'default' : 'outline'}
					size="sm"
					on:click={() => {
						showResolved = true;
						reportsPage = 0;
						fetchReports();
					}}
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
										<a
											href="/community/{report.community_posts.id}"
											target="_blank"
											class="titleLink"
										>
											Post: {report.community_posts.title}
											<ExternalLink class="ml-1 inline h-3 w-3" />
										</a>
									{:else if report.community_comments}
										<span class="commentRef"
											>Comment: {report.community_comments.content?.slice(0, 60)}...</span
										>
									{/if}
								</td>
								<td class="authorCol">{report.players?.name || report.uid}</td>
								<td class="descCol">{report.description || '—'}</td>
								<td class="dateCol">{formatDate(report.created_at)}</td>
								<td>
									<div class="actions">
										{#if !report.resolved}
											<button
												class="actionBtn resolve"
												on:click={() => resolveReport(report.id)}
												title="Resolve"
											>
												<Check class="h-4 w-4" />
											</button>
										{:else}
											<span class="resolvedBadge">✓</span>
										{/if}
										{#if report.post_id}
											<button
												class="actionBtn danger"
												on:click={() => deletePost(report.post_id)}
												title="Delete Post"
											>
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
					on:click={() => {
						reportsPage--;
						fetchReports();
					}}
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
					on:click={() => {
						reportsPage++;
						fetchReports();
					}}
				>
					<ChevronRight class="h-4 w-4" />
				</Button>
			</div>
		{/if}
	{/if}

	{#if activeTab === 'moderation'}
		<!-- Moderation: Pending Posts -->
		<div class="tableContainer">
			<table class="postsTable">
				<thead>
					<tr>
						<th>ID</th>
						<th>Type</th>
						<th>Title</th>
						<th>Author</th>
						<th>Flagged Categories</th>
						<th>Date</th>
						<th>Actions</th>
					</tr>
				</thead>
				<tbody>
					{#if pendingPosts}
						{#each pendingPosts as post}
							{@const TypeIcon = typeIcons[post.type] || MessageCircle}
							{@const flagged = getFlaggedCategories(post.moderation_result)}
							<tr>
								<td class="idCol">{post.id}</td>
								<td>
									<div class="typeBadge {typeColors[post.type]}">
										<svelte:component this={TypeIcon} class="h-3.5 w-3.5" />
										<span>{post.type}</span>
									</div>
								</td>
								<td class="titleCol">
									<a href="/community/{post.id}" target="_blank" class="titleLink">
										{post.title}
										<ExternalLink class="ml-1 inline h-3 w-3" />
									</a>
								</td>
								<td class="authorCol">
									{post.players?.name || post.uid}
								</td>
								<td>
									<div class="flaggedCats">
										{#each flagged as cat}
											<span
												class="flagBadge"
												on:click={() => openModerationDetail(post)}
												title="View moderation details">{cat}</span
											>
										{/each}
										{#if flagged.length === 0}
											<span class="text-xs text-muted-foreground">API error</span>
										{/if}
									</div>
								</td>
								<td class="dateCol">{formatDate(post.created_at)}</td>
								<td>
									<div class="actions">
										<button
											class="actionBtn"
											on:click={() => openModerationDetail(post)}
											title="View Details"
										>
											<Eye class="h-4 w-4" />
										</button>
										<button
											class="actionBtn resolve"
											on:click={() => approvePendingPost(post.id)}
											title="Approve"
										>
											<Check class="h-4 w-4" />
										</button>
										<button
											class="actionBtn danger"
											on:click={() => rejectPendingPost(post.id)}
											title="Reject"
										>
											<X class="h-4 w-4" />
										</button>
									</div>
								</td>
							</tr>
						{/each}
						{#if pendingPosts.length === 0}
							<tr>
								<td colspan="7" class="emptyRow">No posts pending moderation</td>
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

		<!-- Moderation Pagination -->
		{#if pendingPosts && pendingTotal > PAGE_SIZE}
			<div class="pagination">
				<Button
					variant="outline"
					size="sm"
					disabled={pendingPage === 0}
					on:click={() => {
						pendingPage--;
						fetchPendingPosts();
					}}
				>
					<ChevronLeft class="h-4 w-4" />
				</Button>
				<span class="pageInfo">
					{pendingPage * PAGE_SIZE + 1}-{Math.min((pendingPage + 1) * PAGE_SIZE, pendingTotal)} of {pendingTotal}
				</span>
				<Button
					variant="outline"
					size="sm"
					disabled={(pendingPage + 1) * PAGE_SIZE >= pendingTotal}
					on:click={() => {
						pendingPage++;
						fetchPendingPosts();
					}}
				>
					<ChevronRight class="h-4 w-4" />
				</Button>
			</div>
		{/if}
	{/if}

	{#if activeTab === 'tags'}
		<!-- Tags Management -->
		<div class="tagsSection">
			<div class="createTagForm">
				<h3 class="sectionTitle">Create New Tag</h3>
				<div class="tagFormRow">
					<Input bind:value={newTagName} placeholder="Tag name..." class="flex-1" />
					<div class="colorPicker">
						<label for="tag-color" class="colorLabel">
							<Palette class="h-3.5 w-3.5" />
							Color
						</label>
						<input id="tag-color" type="color" bind:value={newTagColor} class="colorInput" />
						<div class="colorPreview" style="background: {newTagColor}"></div>
					</div>
					<label class="adminOnlyToggle">
						<input type="checkbox" bind:checked={newTagAdminOnly} />
						<span>Admin only</span>
					</label>
					<Button size="sm" on:click={createTag} disabled={creatingTag}>
						<Plus class="mr-1 h-3.5 w-3.5" />
						{creatingTag ? 'Creating...' : 'Create'}
					</Button>
				</div>
			</div>

			<div class="tableContainer">
				<table class="postsTable">
					<thead>
						<tr>
							<th>ID</th>
							<th>Preview</th>
							<th>Name</th>
							<th>Color</th>
							<th>Admin Only</th>
							<th>Actions</th>
						</tr>
					</thead>
					<tbody>
						{#if tags}
							{#each tags as tag}
								<tr>
									<td class="idCol">{tag.id}</td>
									{#if editingTag && editingTag.id === tag.id}
										<td>
											<span
												class="tagPreview"
												style="background: {editTagColor}20; color: {editTagColor}; border: 1px solid {editTagColor}40"
											>
												{editTagName || 'Preview'}
											</span>
										</td>
										<td>
											<Input bind:value={editTagName} placeholder="Tag name..." class="w-[140px]" />
										</td>
										<td>
											<div class="colorCell">
												<input type="color" bind:value={editTagColor} class="colorInput" />
												<code>{editTagColor}</code>
											</div>
										</td>
										<td class="center">
											<label class="adminOnlyToggle">
												<input type="checkbox" bind:checked={editTagAdminOnly} />
											</label>
										</td>
										<td>
											<div class="actions">
												<button
													class="actionBtn"
													on:click={saveEditPostTag}
													disabled={savingTagEdit || !editTagName.trim()}
													title="Save"
												>
													<Save class="h-4 w-4" />
												</button>
												<button class="actionBtn" on:click={cancelEditPostTag} title="Cancel">
													<X class="h-4 w-4" />
												</button>
											</div>
										</td>
									{:else}
										<td>
											<span
												class="tagPreview"
												style="background: {tag.color}20; color: {tag.color}; border: 1px solid {tag.color}40"
											>
												{tag.name}
											</span>
										</td>
										<td>{tag.name}</td>
										<td>
											<div class="colorCell">
												<div class="colorDot" style="background: {tag.color}"></div>
												<code>{tag.color}</code>
											</div>
										</td>
										<td class="center">{tag.admin_only ? '✓' : '—'}</td>
										<td>
											<div class="actions">
												<button
													class="actionBtn"
													on:click={() => startEditPostTag(tag)}
													title="Edit tag"
												>
													<Pencil class="h-4 w-4" />
												</button>
												<button
													class="actionBtn danger"
													on:click={() => deleteTag(tag.id)}
													title="Delete tag"
												>
													<Trash2 class="h-4 w-4" />
												</button>
											</div>
										</td>
									{/if}
								</tr>
							{/each}
							{#if tags.length === 0}
								<tr>
									<td colspan="6" class="emptyRow">No tags created yet</td>
								</tr>
							{/if}
						{:else}
							{#each { length: 3 } as _}
								<tr class="skeleton">
									<td colspan="6"><div class="skeletonLine"></div></td>
								</tr>
							{/each}
						{/if}
					</tbody>
				</table>
			</div>
		</div>
	{/if}
</div>
<Dialog.Root bind:open={moderationDetailOpen}>
	<Dialog.Content class="max-h-[80vh] max-w-2xl overflow-y-auto">
		<Dialog.Header>
			<Dialog.Title>Moderation Details — Post #{moderationDetailPost?.id}</Dialog.Title>
		</Dialog.Header>

		{#if moderationDetailPost}
			<div class="moderationDetail">
				<div class="field">
					<span class="fieldLabel">Author</span>
					<span>{moderationDetailPost.players?.name || moderationDetailPost.uid}</span>
				</div>
				<div class="field">
					<span class="fieldLabel">Title</span>
					<span class="postTitle">{moderationDetailPost.title}</span>
				</div>
				<div class="field">
					<span class="fieldLabel">Content</span>
					<div class="postContent">{moderationDetailPost.content || '(empty)'}</div>
				</div>

				{#if moderationDetailPost.image_url}
					<div class="field">
						<span class="fieldLabel">Image</span>
						<img
							src={moderationDetailPost.image_url}
							alt="Post attachment"
							class="moderationImage"
						/>
					</div>
				{/if}

				<hr class="divider" />

				<h3 class="sectionTitle">OpenAI Moderation Result</h3>

				<div class="field">
					<span class="fieldLabel">Status</span>
					<span class="flagStatus {modFlagged.length ? 'flagged' : ''}"
						>{modFlagged.length ? 'Flagged' : 'No flags'}</span
					>
				</div>

				<div class="scoresList">
					{#each modScores as s}
						<div class="scoreRow">
							<div class="scoreName">{s.name}</div>
							<div class="scoreBar">
								<div
									class="scoreBarFill {s.score >= 0.7 ? 'high' : s.score >= 0.4 ? 'medium' : ''}"
									style="width: {Math.round(s.score * 100)}%"
								></div>
							</div>
							<div class="scoreValue">{s.score.toFixed(2)}</div>
						</div>
					{/each}
					{#if modScores.length === 0}
						<div class="text-xs text-muted-foreground">No score data available</div>
					{/if}
				</div>

				<div class="field">
					<button class="actionBtn" on:click={() => (showModerationRaw = !showModerationRaw)}
						>{showModerationRaw ? 'Hide raw JSON' : 'Show raw JSON'}</button
					>
				</div>

				{#if showModerationRaw}
					<pre><code class="json">{JSON.stringify(modResult, null, 2)}</code></pre>
				{/if}
			</div>
		{/if}

		<Dialog.Footer>
			<Button
				variant="outline"
				on:click={() => {
					moderationDetailOpen = false;
				}}>Close</Button
			>
			<Button variant="destructive" on:click={() => rejectPendingPost(moderationDetailPost?.id)}
				>Reject</Button
			>
			<Button on:click={() => approvePendingPost(moderationDetailPost?.id)}>Approve</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

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
							<Select.Item value="media">Media</Select.Item>
							<Select.Item value="guide">Guide</Select.Item>
							<Select.Item value="review">Review</Select.Item>
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
					<Input
						id="edit-video"
						bind:value={editPost.video_url}
						placeholder="https://youtube.com/watch?v=..."
					/>
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

		tr.hiddenPost {
			background: hsl(0 84% 60% / 0.05);
			opacity: 0.7;
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

		label,
		.fieldLabel {
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
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0.5;
		}
	}

	@media screen and (max-width: 768px) {
		.wrapper {
			padding: 1rem;
		}
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

		&:hover {
			color: hsl(var(--foreground));
		}
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

	.badge {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 18px;
		height: 18px;
		padding: 0 5px;
		border-radius: 9px;
		font-size: 11px;
		font-weight: 700;
		background: hsl(0 84% 60%);
		color: white;
	}

	.flaggedCats {
		display: flex;
		flex-wrap: wrap;
		gap: 4px;
	}

	.flagBadge {
		display: inline-block;
		padding: 2px 6px;
		border-radius: 4px;
		font-size: 10px;
		font-weight: 600;
		background: hsl(30 90% 50% / 0.15);
		color: hsl(30 90% 40%);
		white-space: nowrap;
		cursor: pointer;
	}

	.moderationDetail {
		display: flex;
		flex-direction: column;
		gap: 12px;
		padding: 8px 0;
	}

	.postTitle {
		font-weight: 600;
	}

	.postContent {
		padding: 8px 12px;
		border-radius: 6px;
		background: hsl(var(--muted) / 0.5);
		font-size: 13px;
		white-space: pre-wrap;
		max-height: 200px;
		overflow-y: auto;
	}

	.moderationImage {
		max-width: 300px;
		max-height: 200px;
		border-radius: 8px;
		object-fit: cover;
	}

	.divider {
		border: none;
		border-top: 1px solid hsl(var(--border));
		margin: 4px 0;
	}

	.sectionTitle {
		font-size: 14px;
		font-weight: 600;
		margin: 0;
	}

	.flagStatus {
		font-weight: 600;
		font-size: 13px;

		&.flagged {
			color: hsl(0 84% 60%);
		}
	}

	.scoresList {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.scoreRow {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 12px;
	}

	.scoreName {
		width: 180px;
		flex-shrink: 0;
		color: hsl(var(--muted-foreground));
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.scoreBar {
		flex: 1;
		height: 6px;
		border-radius: 3px;
		background: hsl(var(--muted));
		overflow: hidden;
	}

	.scoreBarFill {
		height: 100%;
		border-radius: 3px;
		background: hsl(var(--primary));
		transition: width 0.3s ease;

		&.high {
			background: hsl(0 84% 60%);
		}

		&.medium {
			background: hsl(30 90% 50%);
		}
	}

	.scoreValue {
		width: 55px;
		text-align: right;
		flex-shrink: 0;
		font-family: monospace;
		font-size: 11px;
		color: hsl(var(--muted-foreground));
	}

	/* Tags Management */
	.tagsSection {
		display: flex;
		flex-direction: column;
		gap: 20px;
	}

	.createTagForm {
		padding: 20px;
		border: 1px solid hsl(var(--border));
		border-radius: 12px;
		background: hsl(var(--card));
	}

	.tagFormRow {
		display: flex;
		align-items: center;
		gap: 12px;
		margin-top: 12px;
		flex-wrap: wrap;
	}

	.colorPicker {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.colorLabel {
		display: flex;
		align-items: center;
		gap: 4px;
		font-size: 13px;
		font-weight: 500;
		color: hsl(var(--muted-foreground));
		white-space: nowrap;
	}

	.colorInput {
		width: 32px;
		height: 32px;
		border: 1px solid hsl(var(--border));
		border-radius: 6px;
		cursor: pointer;
		background: transparent;
		padding: 2px;
	}

	.colorPreview {
		width: 24px;
		height: 24px;
		border-radius: 4px;
	}

	.adminOnlyToggle {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 13px;
		color: hsl(var(--muted-foreground));
		cursor: pointer;
		white-space: nowrap;

		input[type='checkbox'] {
			width: 16px;
			height: 16px;
			cursor: pointer;
		}
	}

	.tagPreview {
		display: inline-flex;
		align-items: center;
		padding: 2px 10px;
		border-radius: 12px;
		font-size: 12px;
		font-weight: 600;
		white-space: nowrap;
	}

	.colorCell {
		display: flex;
		align-items: center;
		gap: 6px;

		code {
			font-size: 11px;
			color: hsl(var(--muted-foreground));
		}
	}

	.colorDot {
		width: 14px;
		height: 14px;
		border-radius: 50%;
		flex-shrink: 0;
	}
</style>
