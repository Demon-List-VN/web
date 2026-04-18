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
	import { Globe2, Link as LinkIcon, Plus, Search, Settings } from 'lucide-svelte';
	import { _ } from 'svelte-i18n';
	import { onMount } from 'svelte';

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

	let ownLists: ListSummary[] = [];
	let publicLists: ListSummary[] = [];
	let ownLoading = true;
	let browseLoading = true;
	let browseLoadingMore = false;
	let browseHasMore = true;
	let browseOffset = 0;
	let browseTotal = 0;
	let browseSearch = '';
	let appliedBrowseSearch = '';
	let actionListId: number | null = null;
	let ownLoadKey = '';
	let browseLoadKey = '';
	let mounted = false;

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
		return new Date(value).toLocaleString('vi-VN');
	}

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

			if (!res.ok) {
				throw new Error('Failed to load your lists');
			}

			ownLists = await res.json();
		} catch (error) {
			toast.error(error instanceof Error ? error.message : $_('custom_lists.toast.failed_load_own'));
		} finally {
			ownLoading = false;
		}
	}

	async function fetchBrowseLists(reset = false) {
		if (reset) {
			browseLoading = true;
		} else if (browseLoadingMore || !browseHasMore) {
			return;
		} else {
			browseLoadingMore = true;
		}

		const nextOffset = reset ? 0 : browseOffset;

		try {
			const params = new URLSearchParams({
				limit: '12',
				offset: String(nextOffset)
			});

			if (appliedBrowseSearch) {
				params.set('search', appliedBrowseSearch);
			}

			const headers: Record<string, string> = {};
			if ($user.loggedIn) {
				headers.Authorization = `Bearer ${await $user.token()}`;
			}

			const res = await fetch(`${import.meta.env.VITE_API_URL}/lists?${params.toString()}`, {
				headers
			});

			const payload = await res.json();

			if (!res.ok) {
				throw new Error(payload.error || 'Failed to browse lists');
			}

			const nextLists = payload.data as ListSummary[];
			publicLists = reset ? nextLists : publicLists.concat(nextLists);
			browseTotal = payload.total || 0;
			browseOffset = nextOffset + nextLists.length;
			browseHasMore = browseOffset < browseTotal;
		} catch (error) {
			toast.error(error instanceof Error ? error.message : $_('custom_lists.toast.failed_browse'));
			if (reset) {
				publicLists = [];
				browseTotal = 0;
				browseOffset = 0;
				browseHasMore = false;
			}
		} finally {
			browseLoading = false;
			browseLoadingMore = false;
		}
	}

	function handleBrowseSearch() {
		appliedBrowseSearch = browseSearch.trim();
		browseOffset = 0;
		browseHasMore = true;
		fetchBrowseLists(true);
	}

	function handleBrowseSearchKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			handleBrowseSearch();
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

			if (!res.ok) {
				throw new Error(payload.error || 'Failed to add level to list');
			}

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

		if (!levelId) {
			return;
		}

		void addLevelToList(listId, levelId);
	}

	onMount(() => {
		mounted = true;
	});

	$: if (mounted && $user.checked) {
		const nextKey = $user.loggedIn ? $user.data?.uid || 'authed' : 'guest';
		if (nextKey !== ownLoadKey) {
			ownLoadKey = nextKey;
			fetchOwnLists();
		}
		if (nextKey !== browseLoadKey) {
			browseLoadKey = nextKey;
			browseOffset = 0;
			browseHasMore = true;
			fetchBrowseLists(true);
		}
	}
</script>

<svelte:head>
	<title>{$_('custom_lists.page_title')}</title>
</svelte:head>

<div class="page">
	<div class="header">
		<div>
			<h1>{$_('custom_lists.index.title')}</h1>
			<p>{$_('custom_lists.index.subtitle')}</p>
		</div>
		{#if $user.loggedIn}
			<Button on:click={() => goto(quickLevelId ? `/lists/new?levelId=${quickLevelId}` : '/lists/new')}>
				<Plus class="mr-2 h-4 w-4" />
				{$_('custom_lists.index.new_list')}
			</Button>
		{/if}
	</div>

	<div class="sectionHeader browseHeader">
		<div>
			<h2>{$_('custom_lists.index.browse.heading')}</h2>
			<p class="sectionHint">{$_('custom_lists.index.browse.hint')}</p>
		</div>
		<Badge variant="outline">{browseTotal}</Badge>
	</div>

	<div class="searchRow">
		<div class="searchInputWrap">
			<span class="searchIcon">
				<Search class="h-4 w-4" />
			</span>
			<Input
				bind:value={browseSearch}
				placeholder={$_('custom_lists.index.browse.search_placeholder')}
				on:keydown={handleBrowseSearchKeydown}
			/>
		</div>
		<Button variant="outline" on:click={handleBrowseSearch}>{$_('custom_lists.index.browse.search_button')}</Button>
	</div>

	{#if browseLoading}
		<div class="emptyState">{$_('custom_lists.index.browse.loading')}</div>
	{:else if publicLists.length === 0}
		<div class="emptyState slim">
			<h2>{$_('custom_lists.index.browse.empty_title')}</h2>
			<p>{appliedBrowseSearch ? $_('custom_lists.index.browse.empty_search_hint') : $_('custom_lists.index.browse.empty_browse_hint')}</p>
		</div>
	{:else}
		<div class="listGrid browseGrid">
			{#each publicLists as list}
				<Card.Root class="listCard" on:click={() => goto(`/lists/${list.id}`)}>
					<Card.Content class="pt-6">
						<div class="listCardHead">
							<div>
								<h3>{list.title}</h3>
								<p>{list.description || $_('custom_lists.detail.no_description')}</p>
							</div>
							<div class="badgeRow">
								<Badge variant="outline">
									<Globe2 class="mr-1 h-3.5 w-3.5" />
									{$_('custom_lists.visibility.public')}
								</Badge>
								<Badge variant="secondary">{formatListType(list.isPlatformer)}</Badge>
							</div>
						</div>

						<div class="metaRow">
							<span>{$_('custom_lists.detail.levels_badge', { values: { count: list.levelCount } })}</span>
							<span>{$_('custom_lists.detail.updated', { values: { date: formatDate(list.updated_at) } })}</span>
						</div>

						{#if list.ownerData}
							<div class="ownerRow">
								<span>{$_('custom_lists.index.browse.by')}</span>
								<PlayerLink player={list.ownerData} />
							</div>
						{/if}

						{#if list.tags?.length}
							<div class="tagRow">
								{#each list.tags as tag}
									<Badge variant="outline">{tag}</Badge>
								{/each}
							</div>
						{/if}
					</Card.Content>
				</Card.Root>
			{/each}
		</div>
		{#if browseHasMore}
			<div class="browseFooter">
				<Button variant="outline" on:click={() => fetchBrowseLists(false)} disabled={browseLoadingMore}>
					{browseLoadingMore ? $_('custom_lists.index.browse.loading_more') : $_('custom_lists.index.browse.load_more')}
				</Button>
			</div>
		{/if}
	{/if}

	{#if !$user.checked || ownLoading}
		<div class="emptyState slim">{$_('custom_lists.index.own.loading')}</div>
	{:else if !$user.loggedIn}
		<div class="emptyState">
			<h2>{$_('custom_lists.index.own.sign_in_title')}</h2>
			<p>{quickLevelId ? $_('custom_lists.index.own.sign_in_quickadd', { values: { id: quickLevelId } }) : $_('custom_lists.index.own.sign_in_desc')}</p>
		</div>
	{:else}
		{#if quickLevelId}
			<Card.Root class="quickCard">
				<Card.Content>
					<div class="quickHeader">
						<div>
							<h3>{$_('custom_lists.index.own.quick_title', { values: { id: quickLevelId } })}</h3>
							<p>{$_('custom_lists.index.own.quick_desc')}</p>
						</div>
						<Badge variant="outline">{$_('custom_lists.detail.level_badge', { values: { id: quickLevelId } })}</Badge>
					</div>
				</Card.Content>
			</Card.Root>
		{/if}

		<div class="sectionHeader listSectionHeader">
			<h2>{$_('custom_lists.index.own.heading')}</h2>
			<Badge variant="outline">{ownLists.length}</Badge>
		</div>

		{#if ownLists.length === 0}
			<div class="emptyState slim">
				<h2>{$_('custom_lists.index.own.empty_title')}</h2>
				<p>{$_('custom_lists.index.own.empty_desc')}</p>
			</div>
		{:else}
			<div class="listGrid">
				{#each ownLists as list}
					<Card.Root class="listCard" on:click={() => goto(`/lists/${list.id}`)}>
						<Card.Content class="pt-6">
							<div class="listCardHead">
								<div>
									<h3>{list.title}</h3>
									<p>{list.description || $_('custom_lists.detail.no_description')}</p>
								</div>
								<div class="badgeRow">
									<Badge variant="outline">{formatVisibility(list.visibility)}</Badge>
									<Badge variant="secondary">{formatListType(list.isPlatformer)}</Badge>
								</div>
							</div>

							<div class="metaRow">
								<span>{$_('custom_lists.detail.levels_badge', { values: { count: list.levelCount } })}</span>
								<span>{$_('custom_lists.detail.updated', { values: { date: formatDate(list.updated_at) } })}</span>
							</div>

							{#if list.tags?.length}
								<div class="tagRow">
									{#each list.tags as tag}
										<Badge variant="outline">{tag}</Badge>
									{/each}
								</div>
							{/if}

							<div class="actionRow compact">
								{#if quickLevelId}
									<Button on:click={(event) => handleQuickAddClick(event, list.id, quickLevelId)} disabled={actionListId === list.id}>
										<LinkIcon class="mr-2 h-4 w-4" />
										{$_('custom_lists.index.browse.add_level')}
									</Button>
								{/if}
								<Button variant="outline" size="sm" on:click={(event) => handleManageClick(event, list.id)}>
									<Settings class="mr-2 h-4 w-4" />
									{$_('custom_lists.actions.manage')}
								</Button>
							</div>
						</Card.Content>
					</Card.Root>
				{/each}
			</div>
		{/if}
	{/if}
</div>

<style lang="scss">
	.page {
		max-width: 1100px;
		margin: 0 auto;
		padding: 24px 16px 48px;
		display: flex;
		flex-direction: column;
		gap: 18px;
	}

	.header h1,
	.sectionHeader h2,
	.quickHeader h3,
	.listCardHead h3,
	.emptyState h2 {
		margin: 0;
	}

	.header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
	}

	.header p,
	.quickHeader p,
	.listCardHead p,
	.emptyState p,
	.sectionHint,
	.ownerRow {
		color: hsl(var(--muted-foreground));
	}

	.badgeRow {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		align-items: center;
	}

	:global(.quickCard),
	:global(.listCard) {
		border: 1px solid hsl(var(--border));
		cursor: pointer;
		transition: box-shadow 0.15s ease, border-color 0.15s ease;
	}

	:global(.listCard:hover) {
		border-color: hsl(var(--primary) / 0.5);
		box-shadow: 0 4px 16px hsl(var(--foreground) / 0.07);
	}

	.sectionHeader {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
	}

	.browseHeader {
		margin-top: 4px;
	}

	.listSectionHeader {
		margin-top: 8px;
	}

	.quickHeader,
	.listCardHead,
	.searchRow,
	.ownerRow,
	.browseFooter {
		display: flex;
		gap: 12px;
	}

	.quickHeader,
	.listCardHead,
	.searchRow {
		justify-content: space-between;
	}

	.searchRow,
	.ownerRow,
	.browseFooter {
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
	}

	.actionRow {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
		margin-top: 16px;
	}

	.actionRow.compact {
		margin-top: 14px;
	}

	.metaRow,
	.tagRow {
		display: flex;
		flex-wrap: wrap;
		gap: 8px 12px;
		margin-top: 12px;
	}

	.metaRow {
		font-size: 0.92rem;
		color: hsl(var(--muted-foreground));
	}

	.listGrid {
		display: grid;
		grid-template-columns: 1fr;
		gap: 16px;
	}

	@media (min-width: 640px) {
		.listGrid {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	.browseGrid {
		margin-top: -4px;
	}

	.emptyState {
		border: 1px dashed hsl(var(--border));
		border-radius: 16px;
		padding: 32px 20px;
		text-align: center;
		background: hsl(var(--muted) / 0.18);
	}

	.emptyState.slim {
		padding: 28px 20px;
	}

	@media screen and (max-width: 700px) {
		.quickHeader,
		.listCardHead,
		.searchRow,
		.sectionHeader {
			flex-direction: column;
		}

		.browseFooter {
			justify-content: stretch;
		}

		.browseFooter :global(button) {
			width: 100%;
		}
	}
</style>