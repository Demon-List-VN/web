<script lang="ts">
	import * as Carousel from '$lib/components/ui/carousel/index.js';
	import LevelCard from '$lib/components/levelCard.svelte';
	import { onMount } from 'svelte';
	import Autoplay from 'embla-carousel-autoplay';
	import EventBanner from './event/eventBanner.svelte';
	import Ads from '$lib/components/ads.svelte';
	import { _, locale } from 'svelte-i18n';
	import * as Alert from '$lib/components/ui/alert';
	import { X, Newspaper, History, ArrowRight, Users } from 'lucide-svelte';
	import { goto } from '$app/navigation';
	import { user } from '$lib/client';
	import { isActive } from '$lib/client/isSupporterActive';
	import { browser } from '$app/environment';
	import CommunityPostCard from '$lib/components/communityPostCard.svelte';

	let visible = false;
	let showDiscordAlert = false;
	let dashboardEnabled = false;
	let userChecked = false;
	let activeTab: 'dl' | 'fl' | 'pl' | 'cl' = 'dl';
	let recent: any = {
		dl: null,
		fl: null,
		pl: null,
		cl: null
	};
	let events: any = null;
	let newsArticles: any[] | null = null;
	let changelogArticles: any[] | null = null;
	let showDashboardAlert = false;
	let communityPosts: any[] | null = null;

	function getTitle(item: any, loc: string) {
		const metadata =
			item?.metadata?.[loc] || (item?.metadata ? Object.values(item.metadata)[0] : null);
		if (metadata?.title) return metadata.title;
		const pathParts = item.path.split('/');
		const name = pathParts[pathParts.length - 1].replace('.md', '');
		return name
			.split('-')
			.map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
			.join(' ');
	}

	function getDescription(item: any, loc: string) {
		const metadata =
			item?.metadata?.[loc] || (item?.metadata ? Object.values(item.metadata)[0] : null);
		return metadata?.description || '';
	}

	function formatDate(dateString: string) {
		return new Date(dateString).toLocaleDateString($locale || 'vi-VN');
	}

	function dismissDashboardAlert() {
		showDashboardAlert = false;
		if (browser) localStorage.setItem('dashboardAlertDismissed', 'true');
	}

	async function goToDashboard(e: Event) {
		e.preventDefault();
		dismissDashboardAlert();
		await goto('/dashboard');
	}

	async function fetchLevels(list: string) {
		const query = new URLSearchParams({
			end: '9',
			sortBy: 'created_at',
			ascending: 'false'
		});
		return await (
			await fetch(`${import.meta.env.VITE_API_URL}/list/${list}?${query.toString()}`)
		).json();
	}

	async function getEvents() {
		return await (await fetch(`${import.meta.env.VITE_API_URL}/events/ongoing`)).json();
	}

	async function getWikiFiles(path: string, limit: number = 5) {
		const loc = $locale || 'vi';
		const query = new URLSearchParams({
			locale: loc,
			sortBy: 'created_at',
			ascending: 'false',
			limit: String(limit)
		});
		return await (
			await fetch(`${import.meta.env.VITE_API_URL}/wiki/files/${path}?${query.toString()}`)
		).json();
	}

	function dismissDiscordAlert() {
		showDiscordAlert = false;
		localStorage.setItem('discordAlertDismissed', 'true');
	}

	onMount(() => {
		visible = true;

		if (localStorage.getItem('dashboardAlertDismissed') === null) {
			localStorage.setItem('dashboardAlertDismissed', 'false');
		}

		if (localStorage.getItem('discordAlertDismissed') == null) {
			localStorage.setItem('discordAlertDismissed', 'false');
		}

		if (localStorage.getItem('settings.dashboardEnabled') === null) {
			localStorage.setItem('settings.dashboardEnabled', 'true');
		}

		const dashboardAlertDismissed = localStorage.getItem('dashboardAlertDismissed') === 'true';
		showDiscordAlert = localStorage.getItem('discordAlertDismissed') == 'false';
		dashboardEnabled = localStorage.getItem('settings.dashboardEnabled') === 'true';

		user.subscribe((u) => {
			if (!u.loggedIn) return;
			userChecked = true;
			if (!dashboardAlertDismissed && isActive(u.data.supporterUntil)) {
				showDashboardAlert = true;
			} else {
				showDashboardAlert = false;
			}
		});

		fetchLevels('dl').then((data) => (recent.dl = data));
		fetchLevels('fl').then((data) => (recent.fl = data));
		fetchLevels('pl').then((data) => (recent.pl = data));
		fetchLevels('cl').then((data) => (recent.cl = data));
		getEvents().then((data) => (events = data));
		getWikiFiles('news', 5).then((data) => {
			newsArticles = Array.isArray(data) ? data : data?.items || [];
		});
		getWikiFiles('changelogs', 5).then((data) => {
			changelogArticles = Array.isArray(data) ? data : data?.items || [];
		});

		// Fetch community posts
		fetch(
			`${import.meta.env.VITE_API_URL}/community/posts?limit=4&sortBy=created_at&ascending=false`
		)
			.then((res) => res.json())
			.then((data) => {
				communityPosts = data?.data || [];
			})
			.catch(() => {
				communityPosts = [];
			});
	});
</script>

<svelte:head>
	<title>Geometry Dash Việt Nam</title>
	<meta name="description" content="Website dành cho cộng đồng Geometry Dash Việt Nam" />
</svelte:head>

<!-- Alerts -->
{#if showDashboardAlert}
	<div class="px-[5px] pt-[20px] md:px-[55px]">
		<Alert.Root
			class="relative flex items-center gap-[10px] border-amber-200 bg-amber-50 pb-[7px] dark:border-amber-800 dark:bg-amber-950"
		>
			<div>
				<Alert.Title class="pr-8">{$_('home.dashboard_alert.title')}</Alert.Title>
				<Alert.Description>
					{$_('home.dashboard_alert.description')}
					<a
						href="/dashboard"
						on:click={goToDashboard}
						class="font-semibold underline hover:text-amber-600"
					>
						{$_('home.dashboard_alert.link')}
					</a>
				</Alert.Description>
			</div>
		</Alert.Root>
	</div>
{/if}

{#if showDiscordAlert}
	<div class="px-[5px] pt-[20px] md:px-[55px]">
		<Alert.Root
			class="relative flex items-center gap-[10px] border-blue-200 bg-blue-50 pb-[7px] dark:border-blue-800 dark:bg-blue-950"
		>
			<img src="/discord.svg" alt="Discord" class="mt-[-4px] scale-75 invert dark:invert-0" />
			<div>
				<Alert.Title class="pr-8">{$_('home.discord_alert.title')}</Alert.Title>
				<Alert.Description>
					{$_('home.discord_alert.description')}
					<a
						href="https://discord.gg/gdvn"
						target="_blank"
						class="font-semibold underline hover:text-blue-600"
					>
						{$_('home.discord_alert.join_now')}
					</a>
				</Alert.Description>
				<button
					on:click={dismissDiscordAlert}
					class="absolute right-4 top-4 rounded-sm opacity-70 transition-opacity hover:opacity-100"
					aria-label="Dismiss"
				>
					<X class="h-4 w-4" />
				</button>
			</div>
		</Alert.Root>
	</div>
{/if}

<!-- Events Carousel -->
<div class="promotionWrapper mt-[20px] w-full pl-[50px] pr-[50px]">
	<Carousel.Root class="h-fit w-full" plugins={[Autoplay({ delay: 10000 })]}>
		<Carousel.Content>
			{#if events}
				{#each events as item}
					<Carousel.Item>
						<a href={`/event/${item.id}`}>
							<EventBanner data={item} />
						</a>
					</Carousel.Item>
				{/each}
			{:else}
				<Carousel.Item>
					<EventBanner data={null} />
				</Carousel.Item>
			{/if}
		</Carousel.Content>
		<Carousel.Previous />
		<Carousel.Next />
	</Carousel.Root>
</div>

<Ads dataAdFormat="auto" unit="leaderboard" />

<div class="wrapper">
	<!-- <section class="section">
		<div class="panelsGrid">
			<div class="panel">
				<div class="panelHeader">
					<div class="panelTitleRow">
						<Newspaper class="h-5 w-5 text-blue-500" />
						<h4>{$_('home.news_title')}</h4>
					</div>
					<a href={`/wiki/${$locale}/news`} class="viewAllBtn">
						{$_('home.view_all')}
						<ArrowRight class="ml-1 h-4 w-4" />
					</a>
				</div>
				<div class="panelContent">
					{#if newsArticles}
						{#if newsArticles.length > 0}
							{#each newsArticles.slice(0, 5) as item}
								<a href={`/wiki/${$locale}/${item.path}`} class="listItem">
									<div class="listItemContent">
										<span class="listItemTitle">{getTitle(item, $locale || 'vi')}</span>
										{#if getDescription(item, $locale || 'vi')}
											<span class="listItemDesc">{getDescription(item, $locale || 'vi')}</span>
										{/if}
									</div>
									<span class="listItemDate">{formatDate(item.created_at)}</span>
								</a>
							{/each}
						{:else}
							<p class="noArticles">{$_('home.no_articles')}</p>
						{/if}
					{:else}
						{#each { length: 3 } as _}
							<div class="listItemSkeleton">
								<div class="skeletonLine w-3/4"></div>
								<div class="skeletonLine w-1/4"></div>
							</div>
						{/each}
					{/if}
				</div>
			</div>

			<div class="panel">
				<div class="panelHeader">
					<div class="panelTitleRow">
						<History class="h-5 w-5 text-green-500" />
						<h4>{$_('home.changelogs_title')}</h4>
					</div>
					<a href={`/wiki/${$locale}/changelogs`} class="viewAllBtn">
						{$_('home.view_all')}
						<ArrowRight class="ml-1 h-4 w-4" />
					</a>
				</div>
				<div class="panelContent">
					{#if changelogArticles}
						{#if changelogArticles.length > 0}
							{#each changelogArticles.slice(0, 5) as item}
								<a href={`/wiki/${$locale}/${item.path}`} class="listItem">
									<div class="listItemContent">
										<span class="listItemTitle">{getTitle(item, $locale || 'vi')}</span>
										{#if getDescription(item, $locale || 'vi')}
											<span class="listItemDesc">{getDescription(item, $locale || 'vi')}</span>
										{/if}
									</div>
									<span class="listItemDate">{formatDate(item.created_at)}</span>
								</a>
							{/each}
						{:else}
							<p class="noArticles">{$_('home.no_articles')}</p>
						{/if}
					{:else}
						{#each { length: 3 } as _}
							<div class="listItemSkeleton">
								<div class="skeletonLine w-3/4"></div>
								<div class="skeletonLine w-1/4"></div>
							</div>
						{/each}
					{/if}
				</div>
			</div>
		</div>
	</section> -->
	<!-- Community Hub -->
	<section class="section">
		<div class="sectionHeader">
			<div class="flex items-center gap-2">
				<Users class="h-5 w-5 text-indigo-500" />
				<h4>{$_('community.hub_title')}</h4>
			</div>
			<a href="/community" class="viewAllBtn">
				{$_('community.view_all')}
				<ArrowRight class="ml-1 h-4 w-4" />
			</a>
		</div>
		<div class="communityGrid">
			{#if communityPosts}
				{#if communityPosts.length > 0}
					{#each communityPosts as post}
						<CommunityPostCard {post} compact={true} />
					{/each}
				{:else}
					<div class="communityEmpty">
						<p>{$_('community.no_posts')}</p>
					</div>
				{/if}
			{:else}
				{#each { length: 6 } as _}
					<CommunityPostCard post={null} />
				{/each}
			{/if}
		</div>
	</section>
	<!-- Latest Levels with Tabs -->
	<section class="section">
		<div class="sectionHeader">
			<h4>{$_('home.latest_levels')}</h4>
			<div class="tabGroup">
				<button
					class="tab"
					class:tabActive={activeTab === 'dl'}
					on:click={() => (activeTab = 'dl')}
				>
					Demon List
				</button>
				<button
					class="tab"
					class:tabActive={activeTab === 'fl'}
					on:click={() => (activeTab = 'fl')}
				>
					Featured List
				</button>
				<button
					class="tab"
					class:tabActive={activeTab === 'pl'}
					on:click={() => (activeTab = 'pl')}
				>
					Platformer List
				</button>
			</div>
		</div>

		<div class="carouselWrapper">
			{#key activeTab}
				{#if recent[activeTab]}
					<Carousel.Root>
						<Carousel.Content>
							{#each recent[activeTab] as level}
								<Carousel.Item class="sm:basis-1/1 md:basis-1/2 lg:basis-1/3 xl:basis-1/4">
									<LevelCard {level} type={activeTab} />
								</Carousel.Item>
							{/each}
						</Carousel.Content>
						<Carousel.Previous />
						<Carousel.Next />
					</Carousel.Root>
				{:else}
					<Carousel.Root>
						<Carousel.Content>
							{#each { length: 5 } as _}
								<Carousel.Item class="sm:basis-1/1 md:basis-1/2 lg:basis-1/3 xl:basis-1/4">
									<LevelCard level={null} type={activeTab} />
								</Carousel.Item>
							{/each}
						</Carousel.Content>
						<Carousel.Previous />
						<Carousel.Next />
					</Carousel.Root>
				{/if}
			{/key}
		</div>

		<div class="viewAllLink">
			<a href="/list/{activeTab}" class="viewAllBtn">
				{$_('home.view_all')}
				<ArrowRight class="ml-1 h-4 w-4" />
			</a>
		</div>
	</section>
</div>

<style lang="scss">
	.wrapper {
		position: relative;
		z-index: 1;
		background-color: hsl(var(--background));
	}

	.sectionHeader {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding-inline: 50px;
		padding-top: 30px;
		flex-wrap: wrap;
		gap: 12px;
	}

	.sectionHeader h4 {
		font-weight: 600;
		font-size: 18px;
		margin: 0;
	}

	.tabGroup {
		display: flex;
		gap: 4px;
		background: hsl(var(--muted));
		border-radius: 8px;
		padding: 4px;
	}

	.tab {
		padding: 6px 16px;
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
	}

	.tabActive {
		background: hsl(var(--background));
		color: hsl(var(--foreground));
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
	}

	.carouselWrapper {
		margin-top: 20px;
		max-width: 100%;
		padding-inline: 50px;
		display: flex;
		flex-direction: column;
	}

	.viewAllLink {
		display: flex;
		justify-content: flex-end;
		padding-inline: 50px;
		margin-top: 16px;
	}

	.viewAllBtn {
		display: inline-flex;
		align-items: center;
		font-size: 14px;
		font-weight: 500;
		color: hsl(var(--muted-foreground));
		transition: color 0.2s ease;

		&:hover {
			color: hsl(var(--foreground));
		}
	}

	/* Panels */
	.panelsGrid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 20px;
		padding-inline: 50px;
		margin-top: 20px;
	}

	.panel {
		border: 1px solid hsl(var(--border));
		border-radius: 12px;
		background: hsl(var(--card));
		overflow: hidden;
	}

	.panelHeader {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 16px 20px;
		border-bottom: 1px solid hsl(var(--border));
	}

	.panelTitleRow {
		display: flex;
		align-items: center;
		gap: 8px;

		h4 {
			margin: 0;
			font-weight: 600;
			font-size: 16px;
		}
	}

	.panelContent {
		display: flex;
		flex-direction: column;
	}

	.listItem {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 12px;
		padding: 14px 20px;
		border-bottom: 1px solid hsl(var(--border) / 0.5);
		transition: background 0.15s ease;
		text-decoration: none;
		color: inherit;

		&:last-child {
			border-bottom: none;
		}

		&:hover {
			background: hsl(var(--muted) / 0.5);
		}
	}

	.listItemContent {
		display: flex;
		flex-direction: column;
		gap: 2px;
		min-width: 0;
		flex: 1;
	}

	.listItemTitle {
		font-weight: 500;
		font-size: 14px;
		line-height: 1.4;
		display: -webkit-box;
		-webkit-line-clamp: 1;
		line-clamp: 1;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.listItemDesc {
		font-size: 12px;
		color: hsl(var(--muted-foreground));
		line-height: 1.4;
		display: -webkit-box;
		-webkit-line-clamp: 1;
		line-clamp: 1;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.listItemDate {
		font-size: 12px;
		color: hsl(var(--muted-foreground));
		white-space: nowrap;
		padding-top: 2px;
	}

	.listItemSkeleton {
		display: flex;
		justify-content: space-between;
		padding: 14px 20px;
		border-bottom: 1px solid hsl(var(--border) / 0.5);

		&:last-child {
			border-bottom: none;
		}
	}

	.skeletonLine {
		height: 16px;
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

	.noArticles {
		text-align: center;
		padding: 40px 0;
		color: hsl(var(--muted-foreground));
		font-size: 14px;
	}

	/* Community Hub */
	.communityGrid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(max(340px, calc((100% - 42px) / 4)), 1fr));
		gap: 14px;
		padding-inline: 50px;
		margin-top: 20px;
	}

	.communityEmpty {
		grid-column: 1 / -1;
		text-align: center;
		padding: 40px 0;
		color: hsl(var(--muted-foreground));
		font-size: 14px;
	}

	@media screen and (max-width: 900px) {
		.sectionHeader {
			padding-inline: 16px;
		}

		.carouselWrapper {
			padding-inline: 16px;
		}

		.viewAllLink {
			padding-inline: 16px;
		}

		.panelsGrid {
			grid-template-columns: 1fr;
			padding-inline: 16px;
		}

		.communityGrid {
			grid-template-columns: 1fr;
			padding-inline: 16px;
		}

		.promotionWrapper {
			margin-left: -50px;
			width: calc(100% + 104px);
		}

		.tabGroup {
			width: 100%;
			overflow-x: auto;
		}
	}
</style>
