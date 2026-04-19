<script lang="ts">
	import LevelCard from '$lib/components/levelCard.svelte';
	import CommunityPostCard from '$lib/components/communityPostCard.svelte';
	import { toLevelCardProps } from '$lib/components/levelCardProps';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import * as Tabs from '$lib/components/ui/tabs';
	import PlayerLink from '$lib/components/playerLink.svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { user } from '$lib/client';
	import { toast } from 'svelte-sonner';
	import {
		ArrowLeft,
		Settings,
		Globe2,
		EyeOff,
		Lock,
		Layers,
		Clock,
		ListOrdered,
		Star,
		MessageSquare
	} from 'lucide-svelte';
	import { _ } from 'svelte-i18n';

	export let data: any;

	type CustomListItem = {
		id: number;
		levelId: number;
		created_at: string;
		minProgress: number | null;
		rating: number;
		position: number | null;
		level: any | null;
	};

	type CustomList = {
		id: number;
		owner: string;
		title: string;
		description: string;
		communityEnabled: boolean;
		isPlatformer: boolean;
		visibility: 'private' | 'unlisted' | 'public';
		mode: 'rating' | 'top';
		tags: string[];
		levelCount: number;
		updated_at: string;
		starCount?: number;
		starred?: boolean;
		ownerData?: any;
		items: CustomListItem[];
	};

	let list: CustomList | null = data?.list ?? null;
	let loadingError = data?.error ?? '';
	let authFetchKey = '';
	let relatedPosts: any[] = [];
	let relatedPostsKey = '';
	let loadingRelatedPosts = false;
	let starLoading = false;
	let activeTab: 'levels' | 'community' = 'levels';

	function formatVisibility(visibility: string) {
		if (visibility === 'public') return $_('custom_lists.visibility.public');
		if (visibility === 'unlisted') return $_('custom_lists.visibility.unlisted');
		return $_('custom_lists.visibility.private');
	}

	function formatDate(value: string) {
		return new Date(value).toLocaleDateString('vi-VN', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}

	function getModeLabel(mode: 'rating' | 'top') {
		return mode === 'rating'
			? $_('custom_lists.detail.edit.mode_rating')
			: $_('custom_lists.detail.edit.mode_top');
	}

	function getListTypeLabel(isPlatformer: boolean) {
		return isPlatformer ? $_('custom_lists.type.platformer') : $_('custom_lists.type.classic');
	}

	function getVisibilityIcon(visibility: string) {
		if (visibility === 'public') return Globe2;
		if (visibility === 'unlisted') return EyeOff;
		return Lock;
	}

	function getModeIcon(mode: string) {
		return mode === 'top' ? ListOrdered : Star;
	}

	$: if ($user.checked && $user.loggedIn) {
		refetchWithAuth();
	}

	async function refetchWithAuth() {
		const key = `${$page.params.id}:${$user.data?.uid || 'authed'}`;
		if (key === authFetchKey) return;
		authFetchKey = key;

		try {
			const res = await fetch(`${import.meta.env.VITE_API_URL}/lists/${$page.params.id}`, {
				headers: {
					Authorization: `Bearer ${await $user.token()}`
				}
			});

			const payload = await res.json().catch(() => null);

			if (res.ok && payload) {
				list = payload as CustomList;
				loadingError = '';
				return;
			}

			if (!list) {
				loadingError = payload?.error || loadingError || 'Failed to load list';
			}
		} catch {
			// Keep the SSR state when auth recovery fails.
		}
	}

	async function toggleStar() {
		if (!list || starLoading) return;

		if (!$user.loggedIn) {
			toast.error($_('community.login_required'));
			return;
		}

		starLoading = true;

		try {
			const res = await fetch(`${import.meta.env.VITE_API_URL}/lists/${list.id}/star`, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${await $user.token()}`
				}
			});

			const payload = await res.json().catch(() => null);

			if (!res.ok) {
				throw new Error(payload?.error || $_('custom_lists.toast.failed_star'));
			}

			list = {
				...list,
				starred: payload?.starred ?? false,
				starCount: payload?.starCount ?? list.starCount ?? 0
			};

			toast.success(
				payload?.starred ? $_('custom_lists.toast.starred') : $_('custom_lists.toast.unstarred')
			);
		} catch (error) {
			toast.error(error instanceof Error ? error.message : $_('custom_lists.toast.failed_star'));
		} finally {
			starLoading = false;
		}
	}

	async function fetchRelatedPosts(listId: number) {
		loadingRelatedPosts = true;

		try {
			const res = await fetch(`${import.meta.env.VITE_API_URL}/community/lists/${listId}/posts?limit=6`);
			if (!res.ok) {
				relatedPosts = [];
				return;
			}

			relatedPosts = await res.json();
		} catch {
			relatedPosts = [];
		} finally {
			loadingRelatedPosts = false;
		}
	}

	function openCreatePost() {
		if (!list) return;
		goto(`/community/create?listId=${list.id}`);
	}

	$: isOwner = Boolean(list && $user.loggedIn && list.owner === $user.data?.uid);
	$: listItems = list?.items ?? [];
	$: listCardType = list?.isPlatformer ? 'pl' : 'dl';
	$: canShowCommunity = Boolean(list && list.visibility !== 'private' && list.communityEnabled);
	$: if (!canShowCommunity && activeTab === 'community') {
		activeTab = 'levels';
	}
	$: if (!canShowCommunity) {
		relatedPosts = [];
		relatedPostsKey = '';
	}
	$: if (list?.id && canShowCommunity && activeTab === 'community') {
		const nextKey = String(list.id);
		if (nextKey !== relatedPostsKey) {
			relatedPostsKey = nextKey;
			fetchRelatedPosts(list.id);
		}
	}
</script>

<svelte:head>
	<title>{list ? `${list.title} - Danh sách - Geometry Dash Việt Nam` : 'Danh sách - Geometry Dash Việt Nam'}</title>
	{#if list?.description}
		<meta name="description" content={list.description} />
	{/if}
</svelte:head>

<div class="page">
	<!-- Toolbar -->
	<div class="toolbar">
		<Button variant="ghost" size="sm" on:click={() => goto('/lists')}>
			<ArrowLeft class="mr-2 h-4 w-4" />
			{$_('custom_lists.back')}
		</Button>
		<div class="toolbarActions">
			{#if list && isOwner}
				<Button size="sm" on:click={() => goto(`/lists/${$page.params.id}/manage`)}>
					<Settings class="mr-2 h-4 w-4" />
					{$_('custom_lists.actions.manage')}
				</Button>
			{/if}
		</div>
	</div>

	{#if loadingError}
		<div class="emptyState">
			<h3>{$_('custom_lists.detail.error_title')}</h3>
			<p>{loadingError}</p>
		</div>
	{:else if list}
		<!-- Hero Card -->
		<div class="hero">
			<div class="heroTop">
				<div class="heroText">
					<h1>{list.title}</h1>
					{#if list.description}
						<p class="heroDesc">{list.description}</p>
					{:else}
						<p class="heroDesc muted">{$_('custom_lists.detail.no_description')}</p>
					{/if}
				</div>
				{#if list.visibility !== 'private'}
					<Button
						variant="ghost"
						size="icon"
						class={list.starred ? 'heroStarButton heroStarButtonStarred' : 'heroStarButton'}
						on:click={toggleStar}
						disabled={starLoading}
						aria-label={list.starred ? $_('custom_lists.actions.unstar') : $_('custom_lists.actions.star')}
						title={list.starred ? $_('custom_lists.actions.unstar') : $_('custom_lists.actions.star')}
					>
						<Star class={`h-5 w-5 ${list.starred ? 'starFilled' : ''}`} />
					</Button>
				{/if}
			</div>

			<div class="heroMeta">
				{#if list.ownerData}
					<span class="metaChip">
						{$_('custom_lists.index.browse.by')}
						<span class="metaOwner">
							<PlayerLink player={list.ownerData} />
						</span>
					</span>
				{/if}
				<span class="metaChip">
					<svelte:component this={getVisibilityIcon(list.visibility)} class="h-3.5 w-3.5" />
					{formatVisibility(list.visibility)}
				</span>
				<span class="metaChip">
					<Layers class="h-3.5 w-3.5" />
					{getListTypeLabel(list.isPlatformer)}
				</span>
				<span class="metaChip">
					<svelte:component this={getModeIcon(list.mode)} class="h-3.5 w-3.5" />
					{getModeLabel(list.mode)}
				</span>
				<span class="metaChip">
					{$_('custom_lists.detail.levels_badge', { values: { count: list.levelCount } })}
				</span>
				{#if list.visibility !== 'private'}
					<span class="metaChip">
						<Star class={`h-3.5 w-3.5 ${list.starred ? 'starFilled' : ''}`} />
						{$_('custom_lists.detail.star_count', { values: { count: list.starCount ?? 0 } })}
					</span>
				{/if}
			</div>

			{#if list.tags?.length}
				<div class="tagRow">
					{#each list.tags as tag}
						<Badge variant="outline">{tag}</Badge>
					{/each}
				</div>
			{/if}

			<p class="updatedAt">
				<Clock class="h-3.5 w-3.5" />
				{$_('custom_lists.detail.updated', { values: { date: formatDate(list.updated_at) } })}
			</p>
		</div>

		<Tabs.Root bind:value={activeTab}>
			{#if canShowCommunity}
				<div class="tabsList">
					<Tabs.List>
						<Tabs.Trigger value="levels">{$_('custom_lists.detail.tabs.levels')}</Tabs.Trigger>
						<Tabs.Trigger value="community">{$_('custom_lists.detail.tabs.community')}</Tabs.Trigger>
					</Tabs.List>
				</div>
			{/if}

			<Tabs.Content value="levels">
				<div class="levelsSection">
					<div class="sectionHeader">
						<h2>{$_('custom_lists.detail.levels.heading')}</h2>
						<Badge variant="outline">{list.items.length}</Badge>
					</div>

					{#if listItems.length === 0}
						<div class="emptyState slim">
							<h3>{$_('custom_lists.detail.levels.empty_title')}</h3>
							<p>{isOwner ? $_('custom_lists.detail.levels.empty_owner_manage') : $_('custom_lists.detail.levels.empty_visitor')}</p>
						</div>
					{:else}
						<div class="levels">
							{#each listItems as item, i}
								{#if item.level}
									<LevelCard
										{...toLevelCardProps(item.level, listCardType, {
											rating: list.mode === 'rating' ? (item.rating ?? item.level.rating) : item.level.rating,
											top: i + 1,
											minProgress: item.minProgress ?? item.level.minProgress ?? null
										})}
										type={listCardType}
										hideRating={list.mode === 'top'}
										ratingPrediction={false}
									/>
								{:else}
									<div class="missingLevel">
										<div class="missingRank">#{i + 1}</div>
										<div class="missingContent">
											<h4>{$_('custom_lists.detail.levels.unavailable', { values: { id: item.levelId } })}</h4>
											<p>{$_('custom_lists.detail.levels.unavailable_desc')}</p>
										</div>
									</div>
								{/if}
							{/each}
						</div>
					{/if}
				</div>
			</Tabs.Content>

			{#if canShowCommunity}
				<Tabs.Content value="community">
					<div class="levelsSection">
						<div class="sectionHeader sectionHeaderWrap">
							<div class="sectionTitleRow">
								<h2>{$_('custom_lists.detail.tabs.community')}</h2>
								<Badge variant="outline">{relatedPosts.length}</Badge>
							</div>
							{#if $user.loggedIn}
								<Button variant="outline" size="sm" on:click={openCreatePost}>
									<MessageSquare class="mr-2 h-4 w-4" />
									{$_('custom_lists.actions.post_about')}
								</Button>
							{/if}
						</div>

						{#if loadingRelatedPosts}
							<div class="emptyState slim">{$_('general.loading')}...</div>
						{:else if relatedPosts.length === 0}
							<div class="emptyState slim">
								<p>{$_('custom_lists.detail.community_empty')}</p>
							</div>
						{:else}
							<div class="relatedGrid">
								{#each relatedPosts as post}
									<CommunityPostCard {post} compact />
								{/each}
							</div>
						{/if}
					</div>
				</Tabs.Content>
			{/if}
		</Tabs.Root>
	{/if}
</div>

<style lang="scss">
	.page {
		max-width: 1100px;
		margin: 0 auto;
		padding: 24px 16px 48px;
		display: flex;
		flex-direction: column;
		gap: 20px;
	}

	/* Toolbar */
	.toolbar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
		flex-wrap: wrap;
	}

	.toolbarActions {
		display: flex;
		align-items: center;
		gap: 10px;
		flex-wrap: wrap;
	}

	/* Hero */
	.hero {
		background: hsl(var(--card));
		border: 1px solid hsl(var(--border));
		border-radius: 12px;
		padding: 24px;
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.heroText {
		flex: 1;
		min-width: 0;
	}

	.heroTop {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 16px;
	}

	.heroTop h1 {
		margin: 0;
		font-size: 1.5rem;
		font-weight: 700;
		letter-spacing: -0.01em;
	}

	:global(.heroStarButton) {
		flex-shrink: 0;
		margin: -4px -6px 0 0;
		color: hsl(var(--muted-foreground));
	}

	:global(.heroStarButtonStarred) {
		color: #eab308;
		background: rgba(234, 179, 8, 0.12);
	}

	.heroDesc {
		margin: 6px 0 0;
		font-size: 0.95rem;
		color: hsl(var(--foreground));
		line-height: 1.5;
	}

	.heroDesc.muted {
		color: hsl(var(--muted-foreground));
		font-style: italic;
	}

	.heroMeta {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}

	.metaChip {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		font-size: 0.8rem;
		color: hsl(var(--muted-foreground));
		background: hsl(var(--muted) / 0.4);
		padding: 4px 10px;
		border-radius: 999px;
		white-space: nowrap;
	}

	.metaOwner {
		font-weight: 600;
		color: hsl(var(--foreground));
	}

	.metaOwner :global(.wrapper) {
		gap: 4px;
	}

	:global(.starFilled) {
		fill: currentColor;
	}

	.tabsList {
		align-self: flex-start;
	}

	.tagRow {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}

	.updatedAt {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		margin: 0;
		font-size: 0.8rem;
		color: hsl(var(--muted-foreground));
	}

	/* Levels */
	.levelsSection {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.sectionHeaderWrap {
		flex-wrap: wrap;
	}

	.sectionHeader {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
	}

	.sectionHeader h2 {
		margin: 0;
		font-size: 1.2rem;
		font-weight: 600;
	}

	.levels {
		display: grid;
		align-items: start;
		gap: 10px;
		grid-template-columns: repeat(2, 1fr);
	}

	.relatedGrid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
		gap: 12px;
	}

	/* Missing level card */
	.missingLevel {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 16px 18px;
		background: hsl(var(--card));
		border: 1px solid hsl(var(--border));
		border-radius: 10px;
	}

	.missingRank {
		font-size: 0.85rem;
		font-weight: 700;
		color: hsl(var(--muted-foreground));
		min-width: 28px;
		text-align: center;
		flex-shrink: 0;
	}

	.missingContent h4 {
		margin: 0;
		font-size: 0.95rem;
		font-weight: 600;
	}

	.missingContent p {
		margin: 2px 0 0;
		font-size: 0.8rem;
		color: hsl(var(--muted-foreground));
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
	@media (max-width: 900px) {
		.levels {
			grid-template-columns: 1fr;
		}
	}

	@media (max-width: 480px) {
		.hero {
			padding: 18px 16px;
		}

		.heroTop h1 {
			font-size: 1.25rem;
		}

		.toolbar {
			flex-direction: column;
			align-items: stretch;
		}

		.sectionHeader {
			flex-direction: column;
			align-items: flex-start;
		}
	}
</style>
