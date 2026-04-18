<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Badge } from '$lib/components/ui/badge';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { user } from '$lib/client';
	import { toast } from 'svelte-sonner';
	import PlayerLink from '$lib/components/playerLink.svelte';
	import {
		Globe2,
		Link as LinkIcon,
		Plus,
		Search,
		Settings,
		ChevronLeft,
		ChevronRight,
		Eye,
		EyeOff,
		Lock,
		Layers,
		Clock
	} from 'lucide-svelte';
	import { _ } from 'svelte-i18n';

	export let data: any;

	type ListSummary = {
		id: number;
		title: string;
		description: string;
		isPlatformer: boolean;
		visibility: 'private' | 'unlisted' | 'public';
		tags: string[];
		levelCount: number;
		updated_at: string;
		owner: string;
		ownerData?: any;
	};

	// SSR data
	$: lists = (data?.lists ?? []) as ListSummary[];
	$: total = data?.total ?? 0;
	$: currentPage = data?.page ?? 1;
	$: pageSize = data?.pageSize ?? 12;
	$: searchQuery = data?.search ?? '';
	$: totalPages = Math.max(1, Math.ceil(total / pageSize));

	// Own lists (client-only, requires auth)
	let ownLists: ListSummary[] = [];
	let ownLoading = true;
	let ownLoadKey = '';
	let actionListId: number | null = null;

	// Search input
	let searchInput = searchQuery;

	function getQuickLevelId() {
		const raw = $page.url.searchParams.get('levelId');
		const parsed = raw ? Number.parseInt(raw, 10) : Number.NaN;
		return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
	}

	$: quickLevelId = getQuickLevelId();

	function formatVisibility(visibility: string) {
		if (visibility === 'public') return $_('custom_lists.visibility.public');
		if (visibility === 'unlisted') return $_('custom_lists.visibility.unlisted');
		return $_('custom_lists.visibility.private');
	}

	function formatListType(isPlatformer: boolean) {
		return isPlatformer ? $_('custom_lists.type.platformer') : $_('custom_lists.type.classic');
	}

	function formatDate(value: string) {
		return new Date(value).toLocaleDateString('vi-VN', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}

	function getVisibilityIcon(visibility: string) {
		if (visibility === 'public') return Globe2;
		if (visibility === 'unlisted') return EyeOff;
		return Lock;
	}

	// Pagination
	function goToPage(p: number) {
		const params = new URLSearchParams();
		if (p > 1) params.set('page', String(p));
		if (searchQuery) params.set('search', searchQuery);
		if (quickLevelId) params.set('levelId', String(quickLevelId));
		const qs = params.toString();
		goto(`/lists${qs ? `?${qs}` : ''}`);
	}

	function handleSearch() {
		const trimmed = searchInput.trim();
		const params = new URLSearchParams();
		if (trimmed) params.set('search', trimmed);
		if (quickLevelId) params.set('levelId', String(quickLevelId));
		const qs = params.toString();
		goto(`/lists${qs ? `?${qs}` : ''}`);
	}

	function handleSearchKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter') handleSearch();
	}

	$: paginationPages = (() => {
		const pages: (number | '...')[] = [];
		if (totalPages <= 7) {
			for (let i = 1; i <= totalPages; i++) pages.push(i);
		} else {
			pages.push(1);
			if (currentPage > 3) pages.push('...');
			const start = Math.max(2, currentPage - 1);
			const end = Math.min(totalPages - 1, currentPage + 1);
			for (let i = start; i <= end; i++) pages.push(i);
			if (currentPage < totalPages - 2) pages.push('...');
			pages.push(totalPages);
		}
		return pages;
	})();

	// Own lists (client-side only)
	async function fetchOwnLists() {
		if (!$user.loggedIn) {
			ownLists = [];
			ownLoading = false;
			return;
		}

		ownLoading = true;

		try {
			const res = await fetch(`${import.meta.env.VITE_API_URL}/lists/me`, {
				headers: {
					Authorization: `Bearer ${await $user.token()}`
				}
			});

			if (!res.ok) throw new Error('Failed to load your lists');

			ownLists = await res.json();
		} catch (error) {
			toast.error(error instanceof Error ? error.message : $_('custom_lists.toast.failed_load_own'));
		} finally {
			ownLoading = false;
		}
	}

	async function addLevelToList(listId: number, levelId: number) {
		actionListId = listId;

		try {
			const res = await fetch(`${import.meta.env.VITE_API_URL}/lists/${listId}/levels`, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${await $user.token()}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ levelId })
			});

			const payload = await res.json();

			if (!res.ok) throw new Error(payload.error || 'Failed to add level to list');

			toast.success($_('custom_lists.toast.level_added'));
			goto(`/lists/${listId}/manage`);
		} catch (error) {
			toast.error(error instanceof Error ? error.message : $_('custom_lists.toast.failed_add_to_list'));
		} finally {
			actionListId = null;
		}
	}

	function handleManageClick(event: MouseEvent, listId: number) {
		event.stopPropagation();
		goto(`/lists/${listId}/manage`);
	}

	function handleQuickAddClick(event: MouseEvent, listId: number, levelId: number | null) {
		event.stopPropagation();
		if (!levelId) return;
		void addLevelToList(listId, levelId);
	}

	$: if ($user.checked) {
		const nextKey = $user.loggedIn ? $user.data?.uid || 'authed' : 'guest';
		if (nextKey !== ownLoadKey) {
			ownLoadKey = nextKey;
			fetchOwnLists();
		}
	}

	// Sync search input when data changes (e.g. back/forward nav)
	$: searchInput = searchQuery;
</script>

<svelte:head>
	<title>{$_('custom_lists.page_title')}</title>
	<meta name="description" content={$_('custom_lists.index.subtitle')} />
</svelte:head>

<div class="page">
	<!-- Page Header -->
	<div class="pageHeader">
		<div class="headerContent">
			<h1>{$_('custom_lists.index.title')}</h1>
			<p class="subtitle">{$_('custom_lists.index.subtitle')}</p>
		</div>
		{#if $user.loggedIn}
			<Button on:click={() => goto(quickLevelId ? `/lists/new?levelId=${quickLevelId}` : '/lists/new')}>
				<Plus class="mr-2 h-4 w-4" />
				{$_('custom_lists.index.new_list')}
			</Button>
		{/if}
	</div>

	<!-- Quick-add banner -->
	{#if quickLevelId && $user.loggedIn}
		<div class="quickBanner">
			<div class="quickBannerContent">
				<LinkIcon class="h-5 w-5 flex-shrink-0" />
				<div>
					<p class="quickTitle">{$_('custom_lists.index.own.quick_title', { values: { id: quickLevelId } })}</p>
					<p class="quickDesc">{$_('custom_lists.index.own.quick_desc')}</p>
				</div>
			</div>
		</div>
	{/if}

	<!-- Browse Section -->
	<section class="section">
		<div class="sectionHeader">
			<div class="sectionTitleRow">
				<h2>{$_('custom_lists.index.browse.heading')}</h2>
				<Badge variant="outline">{total}</Badge>
			</div>
			<p class="sectionHint">{$_('custom_lists.index.browse.hint')}</p>
		</div>

		<div class="searchRow">
			<div class="searchInputWrap">
				<span class="searchIcon"><Search class="h-4 w-4" /></span>
				<Input
					bind:value={searchInput}
					placeholder={$_('custom_lists.index.browse.search_placeholder')}
					on:keydown={handleSearchKeydown}
				/>
			</div>
			<Button variant="outline" on:click={handleSearch}>{$_('custom_lists.index.browse.search_button')}</Button>
		</div>

		{#if lists.length === 0}
			<div class="emptyState">
				<h3>{$_('custom_lists.index.browse.empty_title')}</h3>
				<p>{searchQuery ? $_('custom_lists.index.browse.empty_search_hint') : $_('custom_lists.index.browse.empty_browse_hint')}</p>
			</div>
		{:else}
			<div class="listGrid">
				{#each lists as list}
					<button class="listCard" on:click={() => goto(`/lists/${list.id}`)}>
						<div class="cardTop">
							<h3 class="cardTitle">{list.title}</h3>
							<p class="cardDesc">{list.description || $_('custom_lists.detail.no_description')}</p>
						</div>

						<div class="cardMeta">
							<div class="metaBadges">
								<span class="metaItem">
									<svelte:component this={getVisibilityIcon(list.visibility)} class="h-3.5 w-3.5" />
									{formatVisibility(list.visibility)}
								</span>
								<span class="metaItem">
									<Layers class="h-3.5 w-3.5" />
									{formatListType(list.isPlatformer)}
								</span>
								<span class="metaItem">
									{$_('custom_lists.detail.levels_badge', { values: { count: list.levelCount } })}
								</span>
							</div>
							<div class="cardFooter">
								<span class="metaDate">
									<Clock class="h-3.5 w-3.5" />
									{formatDate(list.updated_at)}
								</span>
								{#if list.ownerData}
									<span class="ownerInfo">
										{$_('custom_lists.index.browse.by')}
										<PlayerLink player={list.ownerData} />
									</span>
								{/if}
							</div>
						</div>

						{#if list.tags?.length}
							<div class="cardTags">
								{#each list.tags.slice(0, 4) as tag}
									<Badge variant="outline">{tag}</Badge>
								{/each}
								{#if list.tags.length > 4}
									<Badge variant="outline">+{list.tags.length - 4}</Badge>
								{/if}
							</div>
						{/if}
					</button>
				{/each}
			</div>

			<!-- Pagination -->
			{#if totalPages > 1}
				<nav class="pagination" aria-label="Pagination">
					<Button
						variant="outline"
						size="sm"
						disabled={currentPage <= 1}
						on:click={() => goToPage(currentPage - 1)}
					>
						<ChevronLeft class="h-4 w-4" />
						<span class="paginationLabel">Prev</span>
					</Button>

					<div class="pageNumbers">
						{#each paginationPages as p}
							{#if p === '...'}
								<span class="pageEllipsis">…</span>
							{:else}
								<button
									class="pageBtn"
									class:active={p === currentPage}
									on:click={() => goToPage(p)}
								>
									{p}
								</button>
							{/if}
						{/each}
					</div>

					<Button
						variant="outline"
						size="sm"
						disabled={currentPage >= totalPages}
						on:click={() => goToPage(currentPage + 1)}
					>
						<span class="paginationLabel">Next</span>
						<ChevronRight class="h-4 w-4" />
					</Button>
				</nav>
			{/if}
		{/if}
	</section>

	<!-- Own Lists Section (client-side, auth required) -->
	{#if !$user.checked || ownLoading}
		<section class="section">
			<div class="sectionHeader">
				<h2>{$_('custom_lists.index.own.heading')}</h2>
			</div>
			<div class="emptyState slim">{$_('custom_lists.index.own.loading')}</div>
		</section>
	{:else if !$user.loggedIn}
		<section class="section">
			<div class="emptyState">
				<h3>{$_('custom_lists.index.own.sign_in_title')}</h3>
				<p>{quickLevelId ? $_('custom_lists.index.own.sign_in_quickadd', { values: { id: quickLevelId } }) : $_('custom_lists.index.own.sign_in_desc')}</p>
			</div>
		</section>
	{:else}
		<section class="section">
			<div class="sectionHeader">
				<div class="sectionTitleRow">
					<h2>{$_('custom_lists.index.own.heading')}</h2>
					<Badge variant="outline">{ownLists.length}</Badge>
				</div>
			</div>

			{#if ownLists.length === 0}
				<div class="emptyState slim">
					<h3>{$_('custom_lists.index.own.empty_title')}</h3>
					<p>{$_('custom_lists.index.own.empty_desc')}</p>
				</div>
			{:else}
				<div class="listGrid">
					{#each ownLists as list}
						<button class="listCard" on:click={() => goto(`/lists/${list.id}`)}>
							<div class="cardTop">
								<h3 class="cardTitle">{list.title}</h3>
								<p class="cardDesc">{list.description || $_('custom_lists.detail.no_description')}</p>
							</div>

							<div class="cardMeta">
								<div class="metaBadges">
									<span class="metaItem">
										<svelte:component this={getVisibilityIcon(list.visibility)} class="h-3.5 w-3.5" />
										{formatVisibility(list.visibility)}
									</span>
									<span class="metaItem">
										<Layers class="h-3.5 w-3.5" />
										{formatListType(list.isPlatformer)}
									</span>
									<span class="metaItem">
										{$_('custom_lists.detail.levels_badge', { values: { count: list.levelCount } })}
									</span>
								</div>
								<span class="metaDate">
									<Clock class="h-3.5 w-3.5" />
									{formatDate(list.updated_at)}
								</span>
							</div>

							{#if list.tags?.length}
								<div class="cardTags">
									{#each list.tags.slice(0, 4) as tag}
										<Badge variant="outline">{tag}</Badge>
									{/each}
								</div>
							{/if}

							<div class="cardActions" on:click|stopPropagation={() => {}}>
								{#if quickLevelId}
									<Button
										size="sm"
										on:click={(event) => handleQuickAddClick(event, list.id, quickLevelId)}
										disabled={actionListId === list.id}
									>
										<LinkIcon class="mr-1.5 h-3.5 w-3.5" />
										{$_('custom_lists.index.browse.add_level')}
									</Button>
								{/if}
								<Button variant="outline" size="sm" on:click={(event) => handleManageClick(event, list.id)}>
									<Settings class="mr-1.5 h-3.5 w-3.5" />
									{$_('custom_lists.actions.manage')}
								</Button>
							</div>
						</button>
					{/each}
				</div>
			{/if}
		</section>
	{/if}
</div>

<style lang="scss">
	.page {
		max-width: 1100px;
		margin: 0 auto;
		padding: 24px 16px 48px;
		display: flex;
		flex-direction: column;
		gap: 24px;
	}

	/* Header */
	.pageHeader {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 16px;
		flex-wrap: wrap;
	}

	.headerContent h1 {
		margin: 0;
		font-size: 1.75rem;
		font-weight: 700;
		letter-spacing: -0.02em;
	}

	.subtitle {
		margin: 4px 0 0;
		color: hsl(var(--muted-foreground));
		font-size: 0.95rem;
	}

	/* Quick Banner */
	.quickBanner {
		background: hsl(var(--primary) / 0.06);
		border: 1px solid hsl(var(--primary) / 0.2);
		border-radius: 12px;
		padding: 14px 18px;
	}

	.quickBannerContent {
		display: flex;
		align-items: flex-start;
		gap: 12px;
		color: hsl(var(--primary));
	}

	.quickTitle {
		margin: 0;
		font-weight: 600;
		font-size: 0.95rem;
	}

	.quickDesc {
		margin: 2px 0 0;
		font-size: 0.875rem;
		color: hsl(var(--muted-foreground));
	}

	/* Sections */
	.section {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.sectionHeader {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.sectionTitleRow {
		display: flex;
		align-items: center;
		gap: 10px;
	}

	.sectionTitleRow h2 {
		margin: 0;
		font-size: 1.25rem;
		font-weight: 600;
	}

	.sectionHint {
		margin: 0;
		color: hsl(var(--muted-foreground));
		font-size: 0.875rem;
	}

	/* Search */
	.searchRow {
		display: flex;
		gap: 10px;
		align-items: center;
	}

	.searchInputWrap {
		position: relative;
		flex: 1;
	}

	.searchInputWrap :global(input) {
		padding-left: 36px;
	}

	.searchIcon {
		position: absolute;
		left: 12px;
		top: 50%;
		transform: translateY(-50%);
		color: hsl(var(--muted-foreground));
		pointer-events: none;
	}

	/* List Grid */
	.listGrid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
		gap: 14px;
	}

	/* List Card */
	.listCard {
		display: flex;
		flex-direction: column;
		gap: 12px;
		padding: 18px;
		background: hsl(var(--card));
		border: 1px solid hsl(var(--border));
		border-radius: 12px;
		text-align: left;
		cursor: pointer;
		color: hsl(var(--card-foreground));
		transition: border-color 0.15s ease, box-shadow 0.15s ease;
		width: 100%;
	}

	.listCard:hover {
		border-color: hsl(var(--primary) / 0.4);
		box-shadow: 0 2px 12px hsl(var(--foreground) / 0.06);
	}

	.cardTop {
		display: flex;
		flex-direction: column;
		gap: 4px;
		min-width: 0;
	}

	.cardTitle {
		margin: 0;
		font-size: 1.05rem;
		font-weight: 600;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.cardDesc {
		margin: 0;
		font-size: 0.875rem;
		color: hsl(var(--muted-foreground));
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.cardMeta {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.metaBadges {
		display: flex;
		flex-wrap: wrap;
		gap: 6px 12px;
	}

	.metaItem {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		font-size: 0.8rem;
		color: hsl(var(--muted-foreground));
	}

	.metaDate {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		font-size: 0.8rem;
		color: hsl(var(--muted-foreground));
	}

	.cardFooter {
		display: flex;
		align-items: center;
		gap: 12px;
		flex-wrap: wrap;
	}

	.ownerInfo {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		font-size: 0.8rem;
		color: hsl(var(--muted-foreground));
	}

	.cardTags {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}

	.cardActions {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		margin-top: auto;
	}

	/* Pagination */
	.pagination {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		padding-top: 8px;
		flex-wrap: wrap;
	}

	.pageNumbers {
		display: flex;
		align-items: center;
		gap: 4px;
	}

	.pageBtn {
		min-width: 36px;
		height: 36px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		border-radius: 8px;
		border: 1px solid hsl(var(--border));
		background: transparent;
		color: hsl(var(--foreground));
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: background 0.15s ease, border-color 0.15s ease;
	}

	.pageBtn:hover {
		background: hsl(var(--muted));
	}

	.pageBtn.active {
		background: hsl(var(--primary));
		color: hsl(var(--primary-foreground));
		border-color: hsl(var(--primary));
	}

	.pageEllipsis {
		min-width: 28px;
		text-align: center;
		color: hsl(var(--muted-foreground));
		font-size: 0.875rem;
	}

	.paginationLabel {
		display: none;
	}

	/* Empty State */
	.emptyState {
		border: 1px dashed hsl(var(--border));
		border-radius: 12px;
		padding: 40px 24px;
		text-align: center;
		background: hsl(var(--muted) / 0.12);
	}

	.emptyState.slim {
		padding: 28px 20px;
	}

	.emptyState h3 {
		margin: 0 0 6px;
		font-size: 1.05rem;
		font-weight: 600;
	}

	.emptyState p {
		margin: 0;
		color: hsl(var(--muted-foreground));
		font-size: 0.9rem;
	}

	/* Responsive */
	@media (min-width: 640px) {
		.paginationLabel {
			display: inline;
		}
	}

	@media (max-width: 480px) {
		.pageHeader {
			flex-direction: column;
			align-items: stretch;
		}

		.headerContent h1 {
			font-size: 1.4rem;
		}

		.searchRow {
			flex-direction: column;
		}

		.listGrid {
			grid-template-columns: 1fr;
		}

		.pageNumbers {
			gap: 2px;
		}

		.pageBtn {
			min-width: 32px;
			height: 32px;
			font-size: 0.8rem;
		}
	}
</style>
