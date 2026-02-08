<script lang="ts">
	import CommunityPostCard from '$lib/components/communityPostCard.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import * as Dialog from '$lib/components/ui/dialog';
	import * as Select from '$lib/components/ui/select';
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
		ArrowRight,
		Search,
		Star
	} from 'lucide-svelte';

	let posts: any[] | null = null;
	let total = 0;
	let currentPage = 0;
	let activeType: string | null = null;
	let sortMode: 'newest' | 'best' = 'newest';

	// Search state
	let searchQuery = '';

	// Report state
	let reportDialogOpen = false;
	let reportPostId: number | null = null;
	let reportReason = 'inappropriate';
	let reportDescription = '';
	let submittingReport = false;

	const PAGE_SIZE = 15;

	const types = [
		{ value: null, label: 'all', icon: null },
		{ value: 'discussion', label: 'discussion', icon: MessageCircle },
		{ value: 'media', label: 'media', icon: Image },
		{ value: 'guide', label: 'guide', icon: BookOpen },
		{ value: 'review', label: 'review', icon: Star },
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

		if (searchQuery.trim()) {
			params.set('search', searchQuery.trim());
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

	function handleSearch() {
		currentPage = 0;
		fetchPosts();
	}

	function handleSearchKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			handleSearch();
		}
	}

	function handleReport(e: CustomEvent<number>) {
		if (!$user.loggedIn) {
			toast.error($_('community.login_required'));
			return;
		}
		reportPostId = e.detail;
		reportReason = 'inappropriate';
		reportDescription = '';
		reportDialogOpen = true;
	}

	async function submitReport() {
		if (!reportPostId) return;
		submittingReport = true;

		try {
			const token = await $user.token();
			const res = await fetch(
				`${import.meta.env.VITE_API_URL}/community/posts/${reportPostId}/report`,
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						Authorization: `Bearer ${token}`
					},
					body: JSON.stringify({
						reason: reportReason,
						description: reportDescription || undefined
					})
				}
			);

			if (!res.ok) {
				const err = await res.json();
				throw new Error(err.error || 'Failed to report');
			}

			toast.success($_('community.report.success'));
			reportDialogOpen = false;
		} catch (e: any) {
			toast.error(e.message);
		} finally {
			submittingReport = false;
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
	<title>Cộng đồng - Geometry Dash VN</title>
	<meta property="og:title" content="Cộng đồng - Geometry Dash VN" />
	<meta property="og:type" content="website" />
	<meta property="og:url" content="{import.meta.env.VITE_SITE_URL || 'https://demonlist.vn'}/community" />
	<meta property="og:description" content="Chia sẻ, thảo luận và kết nối với cộng đồng Geometry Dash VN" />
	<meta property="og:site_name" content="Geometry Dash VN" />
	<meta name="twitter:card" content="summary" />
	<meta name="twitter:title" content="Cộng đồng - Geometry Dash VN" />
	<meta name="twitter:description" content="Chia sẻ, thảo luận và kết nối với cộng đồng Geometry Dash VN" />
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
			<div class="toolbarTop">
				{#if $user.loggedIn}
					<a href="/community/create" class="createBtnLink">
						<Button class="createBtn">
							<Plus class="mr-1 h-4 w-4" />
							{$_('community.create.button')}
						</Button>
					</a>
				{/if}
				<div class="searchWrapper">
					<div class="searchBox">
						<Search class="h-4 w-4 searchIcon" />
						<input
							type="text"
							bind:value={searchQuery}
							placeholder={$_('community.search_placeholder')}
							on:keydown={handleSearchKeydown}
							class="searchInput"
						/>
					</div>
					<Button size="sm" on:click={handleSearch} class="searchButton">
						{$_('community.search')}
					</Button>
				</div>
			</div>

			<div class="toolbarBottom">
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
		</div>

		<!-- Posts Grid -->
		<div class="postsGrid">
			{#if posts}
				{#if posts.length > 0}
					{#each posts as post}
						<CommunityPostCard {post} on:report={handleReport} />
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

<!-- Report Dialog -->
<Dialog.Root bind:open={reportDialogOpen}>
	<Dialog.Content class="max-w-md">
		<Dialog.Header>
			<Dialog.Title>{$_('community.report.title')}</Dialog.Title>
			<Dialog.Description>{$_('community.report.description')}</Dialog.Description>
		</Dialog.Header>

		<div class="reportForm">
			<div class="reportField">
				<span class="reportLabel">{$_('community.report.reason')}</span>
				<Select.Root
					onSelectedChange={(v) => {
						if (v) reportReason = String(v.value);
					}}
				>
					<Select.Trigger>
						<Select.Value placeholder={$_('community.report.reasons.inappropriate')} />
					</Select.Trigger>
					<Select.Content>
						<Select.Item value="inappropriate">{$_('community.report.reasons.inappropriate')}</Select.Item>
						<Select.Item value="spam">{$_('community.report.reasons.spam')}</Select.Item>
						<Select.Item value="harassment">{$_('community.report.reasons.harassment')}</Select.Item>
						<Select.Item value="misinformation">{$_('community.report.reasons.misinformation')}</Select.Item>
						<Select.Item value="other">{$_('community.report.reasons.other')}</Select.Item>
					</Select.Content>
				</Select.Root>
			</div>
			<div class="reportField">
				<label for="report-desc">{$_('community.report.details')} ({$_('community.create.optional')})</label>
				<Textarea id="report-desc" bind:value={reportDescription} placeholder={$_('community.report.details_placeholder')} rows={3} />
			</div>
		</div>

		<Dialog.Footer>
			<Button variant="outline" on:click={() => (reportDialogOpen = false)}>
				{$_('general.close')}
			</Button>
			<Button variant="destructive" on:click={submitReport} disabled={submittingReport}>
				{submittingReport ? $_('community.report.submitting') : $_('community.report.submit')}
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
		flex-direction: column;
		gap: 12px;
		margin-bottom: 24px;
	}

	.toolbarTop {
		display: flex;
		align-items: center;
		gap: 12px;
		flex-wrap: wrap;
	}

	:global(.createBtn) {
		flex-shrink: 0;
	}

	.createBtnLink {
		text-decoration: none;
		flex-shrink: 0;
	}

	.searchWrapper {
		display: flex;
		align-items: center;
		gap: 8px;
		flex: 1;
		min-width: 0;
	}

	.toolbarBottom {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
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

	.searchBox {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 6px 12px;
		border: 1px solid hsl(var(--border));
		border-radius: 8px;
		background: hsl(var(--background));
		transition: border-color 0.15s;
		flex: 1;
		min-width: 0;

		&:focus-within {
			border-color: hsl(var(--primary));
		}
	}

	:global(.searchButton) {
		flex-shrink: 0;
		white-space: nowrap;
	}

	.searchIcon {
		color: hsl(var(--muted-foreground));
		flex-shrink: 0;
	}

	.searchInput {
		border: none;
		outline: none;
		background: transparent;
		font-size: 13px;
		color: hsl(var(--foreground));
		flex: 1;
		width: 100%;

		&::placeholder {
			color: hsl(var(--muted-foreground));
		}
	}

	@media screen and (max-width: 900px) {
		.heroBanner { padding: 28px 16px; }
		.communityBody { padding: 16px 16px 40px; }
		.postsGrid { grid-template-columns: 1fr; }
		
		.toolbarTop {
			flex-direction: column;
			align-items: stretch;
		}
		
		.searchWrapper {
			width: 100%;
		}
		
		:global(.createBtn) {
			width: 100%;
		}

		.createBtnLink {
			width: 100%;
		}
		
		.toolbarBottom {
			flex-direction: column;
			align-items: stretch;
		}
		
		.typeFilters,
		.sortFilters {
			width: 100%;
			justify-content: center;
		}
	}

	/* Report form */
	.reportForm {
		display: flex;
		flex-direction: column;
		gap: 16px;
		padding: 8px 0;
	}

	.reportField {
		display: flex;
		flex-direction: column;
		gap: 6px;

		label, .reportLabel {
			font-size: 13px;
			font-weight: 500;
		}
	}
</style>
