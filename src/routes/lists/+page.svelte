<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Badge } from '$lib/components/ui/badge';
	import * as Tabs from '$lib/components/ui/tabs';
	import Ads from '$lib/components/ads.svelte';
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
		EyeOff,
		Lock,
		Layers,
		Clock,
		Star
	} from 'lucide-svelte';
	import { _ } from 'svelte-i18n';

	export let data: any;

	type PublicListTab = 'custom' | 'official';
	type ListTab = PublicListTab | 'mine' | 'starred';
	type CustomListResolvedRole = 'viewer' | 'owner' | 'admin' | 'helper' | 'moderator';
	const GRID_AD_FREQUENCY = 4;

	type ListSummary = {
		id: number;
		slug?: string | null;
		title: string;
		description: string;
		backgroundColor?: string | null;
		borderColor?: string | null;
		isPlatformer: boolean;
		isOfficial?: boolean;
		visibility: 'private' | 'unlisted' | 'public';
		tags: string[];
		levelCount: number;
		updated_at: string;
		owner: string;
		starCount?: number;
		starred?: boolean;
		ownerData?: any;
		currentUserRole?: CustomListResolvedRole;
		weightFormula?: string;
	};

	// SSR data
	$: lists = (data?.lists ?? []) as ListSummary[];
	$: total = data?.total ?? 0;
	$: currentPage = data?.page ?? 1;
	$: pageSize = data?.pageSize ?? 12;
	$: searchQuery = data?.search ?? '';
	$: publicTab = (data?.tab === 'official' ? 'official' : 'custom') as PublicListTab;
	$: totalPages = Math.max(1, Math.ceil(total / pageSize));
	let activeTab: ListTab = publicTab;

	// Own lists (client-only, requires auth)
	let ownLists: ListSummary[] = [];
	let ownLoading = true;
	let starredLists: ListSummary[] = [];
	let starredLoading = true;
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

	function getRoleLabel(role: CustomListResolvedRole | undefined) {
		if (role === 'admin') return $_('custom_lists.manage.roles.admin');
		if (role === 'helper') return $_('custom_lists.manage.roles.helper');
		if (role === 'moderator') return $_('custom_lists.manage.roles.moderator');
		if (role === 'owner') return $_('custom_lists.manage.roles.owner');
		return null;
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

	function getListHref(list: ListSummary) {
		return `/lists/${list.slug || list.id}`;
	}

	function shouldShowGridAd(index: number, totalItems: number) {
		return (
			totalItems > GRID_AD_FREQUENCY &&
			(index + 1) % GRID_AD_FREQUENCY === 0 &&
			index < totalItems - 1
		);
	}

	function isHexColor(value: string | null | undefined) {
		return typeof value === 'string' && /^#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(value.trim());
	}

	function withHexAlpha(color: string, alpha: string) {
		const normalized = color.trim();
		return normalized.length === 9 ? `${normalized.slice(0, 7)}${alpha}` : `${normalized}${alpha}`;
	}

	function hexToRgb(color: string) {
		const normalized = color.trim().slice(1, 7);
		return {
			r: Number.parseInt(normalized.slice(0, 2), 16),
			g: Number.parseInt(normalized.slice(2, 4), 16),
			b: Number.parseInt(normalized.slice(4, 6), 16)
		};
	}

	function isLightColor(color: string) {
		const { r, g, b } = hexToRgb(color);
		const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
		return luminance >= 0.62;
	}

	function getListCardStyle(list: ListSummary) {
		const backgroundColor = isHexColor(list.backgroundColor)
			? String(list.backgroundColor).trim()
			: null;
		const borderColor = isHexColor(list.borderColor) ? String(list.borderColor).trim() : null;
		const styles: string[] = [];

		if (backgroundColor) {
			const lightBackground = isLightColor(backgroundColor);
			styles.push(
				`background: ${backgroundColor}; --custom-surface-foreground: ${lightBackground ? '#0f172a' : '#f8fafc'}; --custom-surface-muted: ${lightBackground ? 'rgba(15, 23, 42, 0.72)' : 'rgba(248, 250, 252, 0.78)'}; --custom-surface-chip-background: ${lightBackground ? 'rgba(15, 23, 42, 0.12)' : 'rgba(248, 250, 252, 0.16)'};`
			);
		}

		if (borderColor) {
			styles.push(`border-color: ${borderColor};`);
			styles.push(`--custom-surface-chip-border: ${withHexAlpha(borderColor, '55')};`);
		}

		return styles.length ? styles.join(' ') : undefined;
	}

	function buildPublicTabUrl(tab: PublicListTab, options: { page?: number; search?: string } = {}) {
		const params = new URLSearchParams();
		const nextPage = options.page ?? 1;
		const nextSearch = (options.search ?? '').trim();

		if (tab === 'custom') {
			params.set('tab', 'custom');
		}

		if (nextPage > 1) {
			params.set('page', String(nextPage));
		}

		if (nextSearch) {
			params.set('search', nextSearch);
		}

		if (quickLevelId) {
			params.set('levelId', String(quickLevelId));
		}

		const qs = params.toString();
		return `/lists${qs ? `?${qs}` : ''}`;
	}

	function selectTab(nextTab: ListTab) {
		if (nextTab === 'mine' || nextTab === 'starred') {
			activeTab = nextTab;
			return;
		}

		goto(buildPublicTabUrl(nextTab, { search: searchQuery }), {
			keepFocus: true,
			noScroll: true
		});
	}

	// Pagination
	function goToPage(p: number) {
		goto(buildPublicTabUrl(publicTab, { page: p, search: searchQuery }));
	}

	function handleSearch() {
		const trimmed = searchInput.trim();
		goto(buildPublicTabUrl(publicTab, { search: trimmed }));
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
			toast.error(
				error instanceof Error ? error.message : $_('custom_lists.toast.failed_load_own')
			);
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
			toast.error(
				error instanceof Error ? error.message : $_('custom_lists.toast.failed_add_to_list')
			);
		} finally {
			actionListId = null;
		}
	}

	async function fetchStarredLists() {
		if (!$user.loggedIn) {
			starredLists = [];
			starredLoading = false;
			return;
		}

		starredLoading = true;

		try {
			const res = await fetch(`${import.meta.env.VITE_API_URL}/lists/starred`, {
				headers: {
					Authorization: `Bearer ${await $user.token()}`
				}
			});

			if (!res.ok) throw new Error('Failed to load your starred lists');

			starredLists = await res.json();
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : $_('custom_lists.toast.failed_load_starred')
			);
		} finally {
			starredLoading = false;
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
			void fetchOwnLists();
			void fetchStarredLists();
		}
	}

	// Sync search input when data changes (e.g. back/forward nav)
	$: searchInput = searchQuery;
	$: if (activeTab !== 'mine' && activeTab !== 'starred') {
		activeTab = publicTab;
	}
</script>

<svelte:head>
	<title>Danh sách - Geometry Dash Việt Nam</title>
	<meta
		name="description"
		content="Xem các danh sách công khai và quản lý bộ sưu tập level của bạn."
	/>
</svelte:head>

<div class="page">
	<!-- Page Header -->
	<div class="pageHeader">
		<div class="headerContent">
			<h1>{$_('custom_lists.index.title')}</h1>
			<p class="subtitle">{$_('custom_lists.index.subtitle')}</p>
		</div>
		{#if $user.loggedIn}
			<Button
				on:click={() => goto(quickLevelId ? `/lists/new?levelId=${quickLevelId}` : '/lists/new')}
			>
				<Plus class="mr-2 h-4 w-4" />
				{$_('custom_lists.index.new_list')}
			</Button>
		{/if}
	</div>
	<Ads dataAdFormat="auto" />
	<!-- Quick-add banner -->
	{#if quickLevelId && $user.loggedIn}
		<div class="quickBanner">
			<div class="quickBannerContent">
				<LinkIcon class="h-5 w-5 flex-shrink-0" />
				<div>
					<p class="quickTitle">
						{$_('custom_lists.index.own.quick_title', { values: { id: quickLevelId } })}
					</p>
					<p class="quickDesc">{$_('custom_lists.index.own.quick_desc')}</p>
				</div>
			</div>
		</div>
	{/if}

	<Tabs.Root bind:value={activeTab}>
		<div class="tabsList">
			<Tabs.List>
				<Tabs.Trigger value="official" on:click={() => selectTab('official')}
					>{$_('custom_lists.index.tabs.official')}</Tabs.Trigger
				>
				<Tabs.Trigger value="custom" on:click={() => selectTab('custom')}
					>{$_('custom_lists.index.tabs.custom')}</Tabs.Trigger
				>
				<Tabs.Trigger value="mine" on:click={() => selectTab('mine')}
					>{$_('custom_lists.index.tabs.mine')}</Tabs.Trigger
				>
				<Tabs.Trigger value="starred" on:click={() => selectTab('starred')}
					>{$_('custom_lists.index.tabs.starred')}</Tabs.Trigger
				>
			</Tabs.List>
		</div>

		<Tabs.Content value="official">
			<section class="section">
				<div class="sectionHeader">
					<div class="sectionTitleRow">
						<h2>{$_('custom_lists.index.official.heading')}</h2>
						<Badge variant="outline">{total}</Badge>
					</div>
					<p class="sectionHint">{$_('custom_lists.index.official.hint')}</p>
				</div>

				<div class="searchRow">
					<div class="searchInputWrap">
						<span class="searchIcon"><Search class="h-4 w-4" /></span>
						<Input
							bind:value={searchInput}
							placeholder={$_('custom_lists.index.official.search_placeholder')}
							on:keydown={handleSearchKeydown}
						/>
					</div>
					<Button variant="outline" on:click={handleSearch}
						>{$_('custom_lists.index.official.search_button')}</Button
					>
				</div>

				{#if lists.length === 0}
					<div class="emptyState">
						<h3>{$_('custom_lists.index.official.empty_title')}</h3>
						<p>
							{searchQuery
								? $_('custom_lists.index.official.empty_search_hint')
								: $_('custom_lists.index.official.empty_browse_hint')}
						</p>
					</div>
				{:else}
					<div class="listGrid">
						{#each lists as list, index}
							<button
								class="listCard"
								style={getListCardStyle(list)}
								on:click={() => goto(getListHref(list))}
							>
								<div class="cardTop">
									<h3 class="cardTitle">{list.title}</h3>
									<p class="cardDesc">
										{list.description || $_('custom_lists.detail.no_description')}
									</p>
								</div>

								<div class="cardMeta">
									<div class="metaBadges">
										<span class="metaItem">
											<svelte:component
												this={getVisibilityIcon(list.visibility)}
												class="h-3.5 w-3.5"
											/>
											{formatVisibility(list.visibility)}
										</span>
										<span class="metaItem">
											<Layers class="h-3.5 w-3.5" />
											{formatListType(list.isPlatformer)}
										</span>
										{#if list.isOfficial}
											<span class="metaItem">
												<Star class="h-3.5 w-3.5" />
												Official
											</span>
										{/if}
										<span class="metaItem">
											{$_('custom_lists.detail.levels_badge', {
												values: { count: list.levelCount }
											})}
										</span>
										<span class="metaItem">
											<Star class="h-3.5 w-3.5" />
											{$_('custom_lists.detail.star_count', {
												values: { count: list.starCount ?? 0 }
											})}
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
											<Badge variant="outline" class="cardTag">{tag}</Badge>
										{/each}
										{#if list.tags.length > 4}
											<Badge variant="outline" class="cardTag">+{list.tags.length - 4}</Badge>
										{/if}
									</div>
								{/if}
							</button>
						{/each}
					</div>

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
										<Button
											variant={p === currentPage ? 'default' : 'ghost'}
											size="sm"
											on:click={() => goToPage(p)}
										>
											{p}
										</Button>
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
		</Tabs.Content>

		<Tabs.Content value="custom">
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
					<Button variant="outline" on:click={handleSearch}
						>{$_('custom_lists.index.browse.search_button')}</Button
					>
				</div>

				{#if lists.length === 0}
					<div class="emptyState">
						<h3>{$_('custom_lists.index.browse.empty_title')}</h3>
						<p>
							{searchQuery
								? $_('custom_lists.index.browse.empty_search_hint')
								: $_('custom_lists.index.browse.empty_browse_hint')}
						</p>
					</div>
				{:else}
					<div class="listGrid">
						{#each lists as list, index}
							<button
								class="listCard"
								style={getListCardStyle(list)}
								on:click={() => goto(getListHref(list))}
							>
								<div class="cardTop">
									<h3 class="cardTitle">{list.title}</h3>
									<p class="cardDesc">
										{list.description || $_('custom_lists.detail.no_description')}
									</p>
								</div>

								<div class="cardMeta">
									<div class="metaBadges">
										<span class="metaItem">
											<svelte:component
												this={getVisibilityIcon(list.visibility)}
												class="h-3.5 w-3.5"
											/>
											{formatVisibility(list.visibility)}
										</span>
										<span class="metaItem">
											<Layers class="h-3.5 w-3.5" />
											{formatListType(list.isPlatformer)}
										</span>
										{#if list.isOfficial}
											<span class="metaItem">
												<Star class="h-3.5 w-3.5" />
												Official
											</span>
										{/if}
										<span class="metaItem">
											{$_('custom_lists.detail.levels_badge', {
												values: { count: list.levelCount }
											})}
										</span>
										<span class="metaItem">
											<Star class="h-3.5 w-3.5" />
											{$_('custom_lists.detail.star_count', {
												values: { count: list.starCount ?? 0 }
											})}
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
											<Badge variant="outline" class="cardTag">{tag}</Badge>
										{/each}
										{#if list.tags.length > 4}
											<Badge variant="outline" class="cardTag">+{list.tags.length - 4}</Badge>
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
		</Tabs.Content>

		<Tabs.Content value="mine">
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
						<p>
							{quickLevelId
								? $_('custom_lists.index.own.sign_in_quickadd', { values: { id: quickLevelId } })
								: $_('custom_lists.index.own.sign_in_desc')}
						</p>
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
							{#each ownLists as list, index}
								<button
									class="listCard"
									style={getListCardStyle(list)}
									on:click={() => goto(getListHref(list))}
								>
									<div class="cardTop">
										<h3 class="cardTitle">{list.title}</h3>
										<p class="cardDesc">
											{list.description || $_('custom_lists.detail.no_description')}
										</p>
									</div>

									<div class="cardMeta">
										<div class="metaBadges">
											<span class="metaItem">
												<svelte:component
													this={getVisibilityIcon(list.visibility)}
													class="h-3.5 w-3.5"
												/>
												{formatVisibility(list.visibility)}
											</span>
											<span class="metaItem">
												<Layers class="h-3.5 w-3.5" />
												{formatListType(list.isPlatformer)}
											</span>
											{#if list.isOfficial}
												<span class="metaItem">
													<Star class="h-3.5 w-3.5" />
													Official
												</span>
											{/if}
											{#if getRoleLabel(list.currentUserRole) && list.currentUserRole !== 'owner'}
												<span class="metaItem">{getRoleLabel(list.currentUserRole)}</span>
											{/if}
											<span class="metaItem">
												{$_('custom_lists.detail.levels_badge', {
													values: { count: list.levelCount }
												})}
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
												<Badge variant="outline" class="cardTag">{tag}</Badge>
											{/each}
										</div>
									{/if}

									<div class="cardActions">
										{#if quickLevelId}
											<Button
												size="sm"
												on:click={(event) => {
													event.stopPropagation();
													handleQuickAddClick(event, list.id, quickLevelId);
												}}
												disabled={actionListId === list.id}
											>
												<LinkIcon class="mr-1.5 h-3.5 w-3.5" />
												{$_('custom_lists.index.browse.add_level')}
											</Button>
										{/if}
										<Button
											variant="outline"
											size="sm"
											on:click={(event) => {
												event.stopPropagation();
												handleManageClick(event, list.id);
											}}
										>
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
		</Tabs.Content>

		<Tabs.Content value="starred">
			{#if !$user.checked || starredLoading}
				<section class="section">
					<div class="sectionHeader">
						<h2>{$_('custom_lists.index.starred.heading')}</h2>
					</div>
					<div class="emptyState slim">{$_('custom_lists.index.starred.loading')}</div>
				</section>
			{:else if !$user.loggedIn}
				<section class="section">
					<div class="emptyState">
						<h3>{$_('custom_lists.index.starred.sign_in_title')}</h3>
						<p>{$_('custom_lists.index.starred.sign_in_desc')}</p>
					</div>
				</section>
			{:else}
				<section class="section">
					<div class="sectionHeader">
						<div class="sectionTitleRow">
							<h2>{$_('custom_lists.index.starred.heading')}</h2>
							<Badge variant="outline">{starredLists.length}</Badge>
						</div>
					</div>

					{#if starredLists.length === 0}
						<div class="emptyState slim">
							<h3>{$_('custom_lists.index.starred.empty_title')}</h3>
							<p>{$_('custom_lists.index.starred.empty_desc')}</p>
						</div>
					{:else}
						<div class="listGrid">
							{#each starredLists as list, index}
								<button
									class="listCard"
									style={getListCardStyle(list)}
									on:click={() => goto(getListHref(list))}
								>
									<div class="cardTop">
										<h3 class="cardTitle">{list.title}</h3>
										<p class="cardDesc">
											{list.description || $_('custom_lists.detail.no_description')}
										</p>
									</div>

									<div class="cardMeta">
										<div class="metaBadges">
											<span class="metaItem">
												<svelte:component
													this={getVisibilityIcon(list.visibility)}
													class="h-3.5 w-3.5"
												/>
												{formatVisibility(list.visibility)}
											</span>
											<span class="metaItem">
												<Layers class="h-3.5 w-3.5" />
												{formatListType(list.isPlatformer)}
											</span>
											{#if list.isOfficial}
												<span class="metaItem">
													<Star class="h-3.5 w-3.5" />
													Official
												</span>
											{/if}
											<span class="metaItem">
												{$_('custom_lists.detail.levels_badge', {
													values: { count: list.levelCount }
												})}
											</span>
											<span class="metaItem">
												<Star class="h-3.5 w-3.5" />
												{$_('custom_lists.detail.star_count', {
													values: { count: list.starCount ?? 0 }
												})}
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
												<Badge variant="outline" class="cardTag">{tag}</Badge>
											{/each}
											{#if list.tags.length > 4}
												<Badge variant="outline" class="cardTag">+{list.tags.length - 4}</Badge>
											{/if}
										</div>
									{/if}
								</button>
							{/each}
						</div>
					{/if}
				</section>
			{/if}
		</Tabs.Content>
	</Tabs.Root>
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
	.tabsList {
		align-self: flex-start;
	}

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

	.listGridAd {
		grid-column: 1 / -1;
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
		color: var(--custom-surface-foreground, hsl(var(--card-foreground)));
		transition:
			background 0.15s ease,
			border-color 0.15s ease,
			box-shadow 0.15s ease;
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
		color: var(--custom-surface-muted, hsl(var(--muted-foreground)));
		line-clamp: 2;
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
		color: var(--custom-surface-muted, hsl(var(--muted-foreground)));
	}

	.metaDate {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		font-size: 0.8rem;
		color: var(--custom-surface-muted, hsl(var(--muted-foreground)));
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
		color: var(--custom-surface-muted, hsl(var(--muted-foreground)));
	}

	.ownerInfo :global(a) {
		color: inherit;
	}

	.cardTags {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}

	.listCard :global(.cardTag) {
		color: var(--custom-surface-foreground, hsl(var(--foreground)));
		background: var(--custom-surface-chip-background, transparent);
		border-color: var(--custom-surface-chip-border, hsl(var(--border)));
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
		transition:
			background 0.15s ease,
			border-color 0.15s ease;
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
