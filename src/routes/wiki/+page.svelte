<script lang="ts">
	import { onMount } from 'svelte';
	import { _ } from 'svelte-i18n';
	import BigTitle from '$lib/components/bigTitle.svelte';
	import CommunityPostCard from '$lib/components/communityPostCard.svelte';
	import { Button } from '$lib/components/ui/button';
	import { user } from '$lib/client';
	import { BookOpen, ChevronLeft, ChevronRight, Plus, RefreshCw } from 'lucide-svelte';

	const PAGE_SIZE = 12;
	let posts: any[] | null = null;
	let total = 0;
	let currentPage = 0;
	let loadError = false;

	$: canPublishWiki = Boolean($user.data?.isManager || $user.data?.isAdmin);
	$: pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

	async function fetchWikiPosts() {
		posts = null;
		loadError = false;
		const params = new URLSearchParams({
			type: 'wiki',
			limit: String(PAGE_SIZE),
			offset: String(currentPage * PAGE_SIZE),
			sortBy: 'createdAt',
			ascending: 'false'
		});
		const headers: Record<string, string> = {};

		if ($user.loggedIn) {
			try {
				headers.Authorization = `Bearer ${await $user.token()}`;
			} catch {
			// The public Wiki feed remains available if token refresh fails.
			}
		}

		try {
			const response = await fetch(
				`${import.meta.env.VITE_API_URL}/community/posts?${params}`,
				{ headers }
			);

			if (!response.ok) {
				throw new Error('Failed to load Wiki posts');
			}

			const result = await response.json();
			posts = Array.isArray(result?.data) ? result.data : [];
			total = Number(result?.total) || 0;
		} catch {
			posts = [];
			total = 0;
			loadError = true;
		}
	}

	function changePage(page: number) {
		if (page < 0 || page >= pageCount || page === currentPage) {
			return;
		}

		currentPage = page;
		void fetchWikiPosts();
		window.scrollTo({ top: 0, behavior: 'smooth' });
	}

	onMount(() => {
		void fetchWikiPosts();
	});
</script>

<svelte:head>
	<title>{$_('head.titles.wiki')} - {$_('head.site_name')}</title>
	<meta name="description" content={$_('head.descriptions.wiki')} />
</svelte:head>

<BigTitle value="Wiki" description={$_('wiki.description')} />

<main class="wikiPage">
	<div class="wikiToolbar">
		<div class="wikiIntro">
			<BookOpen class="h-5 w-5 text-cyan-500" />
			<div>
				<h2>{$_('wiki.latest_articles')}</h2>
				<p>{$_('wiki.manager_only')}</p>
			</div>
		</div>
		{#if canPublishWiki}
			<a href="/community/create?type=wiki">
				<Button size="sm">
					<Plus class="mr-1 h-4 w-4" />
					{$_('wiki.new_article')}
				</Button>
			</a>
		{/if}
	</div>

	{#if posts === null}
		<div class="wikiFeed" aria-label="Loading Wiki articles">
			{#each { length: 3 } as _}
				<CommunityPostCard post={null} compact={false} />
			{/each}
		</div>
	{:else if loadError}
		<div class="emptyState">
			<RefreshCw class="h-8 w-8" />
			<h2>{$_('wiki.error_title')}</h2>
			<p>{$_('wiki.error_description')}</p>
			<Button variant="outline" size="sm" on:click={fetchWikiPosts}>
				{$_('wiki.retry')}
			</Button>
		</div>
	{:else if posts.length === 0}
		<div class="emptyState">
			<BookOpen class="h-8 w-8" />
			<p>{$_('wiki.no_articles')}</p>
		</div>
	{:else}
		<div class="wikiFeed">
			{#each posts as post (post.id)}
				<CommunityPostCard {post} compact={false} />
			{/each}
		</div>

		{#if pageCount > 1}
			<nav class="pagination" aria-label="Wiki pagination">
				<Button
					variant="outline"
					size="sm"
					disabled={currentPage === 0}
					on:click={() => changePage(currentPage - 1)}
				>
					<ChevronLeft class="h-4 w-4" />
				</Button>
				<span>{currentPage + 1} / {pageCount}</span>
				<Button
					variant="outline"
					size="sm"
					disabled={currentPage + 1 >= pageCount}
					on:click={() => changePage(currentPage + 1)}
				>
					<ChevronRight class="h-4 w-4" />
				</Button>
			</nav>
		{/if}
	{/if}
</main>

<style lang="scss">
	.wikiPage {
		width: min(900px, calc(100% - 32px));
		margin: 0 auto 64px;
	}

	.wikiToolbar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
		padding: 16px;
		margin-bottom: 18px;
		border: 1px solid hsl(var(--border));
		border-radius: 14px;
		background: hsl(var(--card));
	}

	.wikiIntro {
		display: flex;
		align-items: flex-start;
		gap: 10px;

		h2 {
			margin: 0;
			font-size: 16px;
			font-weight: 700;
		}

		p {
			margin: 3px 0 0;
			font-size: 12px;
			color: hsl(var(--muted-foreground));
		}
	}

	.wikiFeed {
		display: flex;
		flex-direction: column;
		gap: 14px;
	}

	.emptyState {
		display: flex;
		min-height: 260px;
		align-items: center;
		justify-content: center;
		flex-direction: column;
		gap: 10px;
		padding: 32px;
		text-align: center;
		color: hsl(var(--muted-foreground));
		border: 1px dashed hsl(var(--border));
		border-radius: 14px;

		h2,
		p {
			margin: 0;
		}
	}

	.pagination {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 12px;
		margin-top: 22px;
		font-size: 13px;
		color: hsl(var(--muted-foreground));
	}

	@media screen and (max-width: 640px) {
		.wikiPage {
			width: min(100% - 20px, 900px);
		}

		.wikiToolbar {
			align-items: flex-start;
			flex-direction: column;
		}
	}
</style>
