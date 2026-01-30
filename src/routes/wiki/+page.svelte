<script lang="ts">
	import { onMount } from 'svelte';
	import { locale, _ } from 'svelte-i18n';
	import BigTitle from '$lib/components/bigTitle.svelte';
	import WikiCard from '$lib/components/wikiCard.svelte';
	import FolderCard from '$lib/components/folderCard.svelte';
	import * as Carousel from '$lib/components/ui/carousel/index.js';
	import Ads from '$lib/components/ads.svelte';
	import { BookOpen, FileText, Scale, Newspaper, History } from 'lucide-svelte';
	import { Button } from '$lib/components/ui/button/index.js';

	interface WikiFile {
		path: string;
		type: 'file' | 'folder';
		parent: string;
		level: number;
		count: number | null;
		created_at: string;
		metadata?: Record<string, any>;
		items?: WikiFile[];
	}

	interface WikiResponse {
		path: string;
		type: 'folder';
		items: WikiFile[];
	}

	let latestArticles: WikiFile[] = [];
	let featuredFolders: WikiFile[] = [];
	let isLoading = true;

	async function fetchWikiRoot() {
		try {
			const query = new URLSearchParams({
				sortBy: 'created_at',
				ascending: 'false',
				offset: '0',
				limit: '20'
			});

			const res = await fetch(`${import.meta.env.VITE_API_URL}/wiki/files?${query.toString()}`);
			const data: WikiResponse = await res.json();

			if (data?.items) {
				// Separate folders and files
				featuredFolders = data.items.filter((item) => item.type === 'folder').slice(0, 6);
				latestArticles = data.items
					.filter((item) => item.type === 'file' && item.metadata)
					.slice(0, 8);
			}
		} catch (err) {
			console.error('Failed to fetch wiki data:', err);
		} finally {
			isLoading = false;
		}
	}

	onMount(() => {
		fetchWikiRoot();
	});

	// Quick links for common sections
	const quickLinks = [
		{ icon: Scale, labelKey: 'wiki.quick_links.rules', href: '/rules' },
		{ icon: Newspaper, labelKey: 'wiki.quick_links.news', href: '/wiki/news' },
		{ icon: History, labelKey: 'wiki.quick_links.changelog', href: '/wiki/changelog' },
		{ icon: FileText, labelKey: 'wiki.quick_links.guides', href: '/wiki/guides' }
	];
</script>

<svelte:head>
	<title>Wiki - Demon List VN</title>
	<meta name="description" content="Explore the Demon List VN Wiki - guides, rules, news, and changelogs" />
</svelte:head>

<BigTitle value="Wiki" description={$_('wiki.description')} />

<Ads unit="leaderboard" />

<div class="wrapper">
	<!-- Quick Links Section -->
	<section class="quick-links">
		<div class="quick-links-grid">
			{#each quickLinks as link}
				<a href={link.href}>
					<Button variant="outline" class="quick-link-btn h-auto w-full flex-col gap-2 py-6">
						<svelte:component this={link.icon} class="h-8 w-8 text-primary" />
						<span class="text-sm font-medium">{$_(link.labelKey)}</span>
					</Button>
				</a>
			{/each}
		</div>
	</section>

	<!-- Featured Categories -->
	{#if featuredFolders.length > 0 || isLoading}
		<section class="section">
			<h2 class="section-title">
				<BookOpen class="mr-2 inline h-5 w-5" />
				{$_('wiki.categories')}
			</h2>
			<div class="folders-grid">
				{#if isLoading}
					{#each { length: 4 } as _}
						<FolderCard folder={null} />
					{/each}
				{:else}
					{#each featuredFolders as folder}
						<FolderCard {folder} />
					{/each}
				{/if}
			</div>
		</section>
	{/if}

	<!-- Latest Articles -->
	<section class="section">
		<h2 class="section-title">
			<FileText class="mr-2 inline h-5 w-5" />
			{$_('wiki.latest_articles')}
		</h2>
		<div class="carouselWrapper">
			{#if isLoading}
				<Carousel.Root>
					<Carousel.Content>
						{#each { length: 4 } as _}
							<Carousel.Item class="sm:basis-1/1 md:basis-1/2 lg:basis-1/3 xl:basis-1/4">
								<WikiCard item={null} />
							</Carousel.Item>
						{/each}
					</Carousel.Content>
					<Carousel.Previous />
					<Carousel.Next />
				</Carousel.Root>
			{:else if latestArticles.length > 0}
				<Carousel.Root>
					<Carousel.Content>
						{#each latestArticles as article}
							<Carousel.Item class="sm:basis-1/1 md:basis-1/2 lg:basis-1/3 xl:basis-1/4">
								<WikiCard item={article} />
							</Carousel.Item>
						{/each}
					</Carousel.Content>
					<Carousel.Previous />
					<Carousel.Next />
				</Carousel.Root>
			{:else}
				<p class="text-center text-foreground/60">{$_('wiki.no_articles')}</p>
			{/if}
		</div>
	</section>
</div>

<style lang="scss">
	.wrapper {
		padding-inline: 50px;
		max-width: 1500px;
		margin: 0 auto;
	}

	.quick-links {
		margin-bottom: 40px;
	}

	.quick-links-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 16px;
	}

	:global(.quick-link-btn) {
		transition: all 0.2s ease;
	}

	:global(.quick-link-btn:hover) {
		transform: translateY(-2px);
		border-color: hsl(var(--primary));
	}

	.section {
		margin-bottom: 40px;
	}

	.section-title {
		font-size: 1.25rem;
		font-weight: 600;
		margin-bottom: 20px;
		display: flex;
		align-items: center;
	}

	.folders-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
		gap: 16px;
	}

	.carouselWrapper {
		max-width: 100%;
	}

	@media screen and (max-width: 900px) {
		.wrapper {
			padding-inline: 15px;
		}

		.quick-links-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	@media screen and (max-width: 480px) {
		.quick-links-grid {
			grid-template-columns: 1fr 1fr;
			gap: 10px;
		}
	}
</style>