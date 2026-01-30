<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { Button } from '$lib/components/ui/button/index.js';
	import Ads from '$lib/components/ads.svelte';
	import WikiCard from '$lib/components/wikiCard.svelte';
	import FolderCard from '$lib/components/folderCard.svelte';
	import { page } from '$app/stores';

	export let data: any;
	export let locale: string;
	export let breadcrumbs: Array<{ title: string; link: string }>;
	export let folderTitle: string;

	$: folderItems = data.items ? data.items.filter((item: any) => item.type === 'folder') : [];
	$: fileItems = data.items ? data.items.filter((item: any) => item.type === 'file') : [];

	// Pagination
	let totalPages: number = 1;
	let currentPage: number = 1;
	let prevPage: number = 1;
	let nextPage: number = 1;
	let isFirstPage: boolean = true;
	let isLastPage: boolean = true;
	$: totalPages = Math.max(1, Math.ceil((data?.count || 0) / 12));
	$: {
		const raw = $page.url.searchParams.get('page');
		const parsed = parseInt(raw || '1', 10);
		// clamp to [1, totalPages]
		currentPage = isNaN(parsed) ? 1 : Math.min(Math.max(1, parsed), totalPages);
	}
	$: prevPage = Math.max(1, currentPage - 1);
	$: nextPage = Math.min(totalPages, currentPage + 1);
	$: isFirstPage = currentPage <= 1;
	$: isLastPage = currentPage >= totalPages;
</script>

<svelte:head>
	<title>{folderTitle} - Wiki - Demon List VN</title>
	<meta property="og:title" content={`${folderTitle} - Wiki - Demon List VN`} />
</svelte:head>

<Ads unit="leaderboard" />

<div class="folder-wrapper">
	<!-- Breadcrumbs -->
	<div class="breadcrumbs">
		{#each breadcrumbs as crumb, index}
			<a href={crumb.link}>
				<Button variant="link" class="p-0 font-light opacity-75">
					{crumb.title}
				</Button>
			</a>
			{#if index !== breadcrumbs.length - 1}
				<span class="opacity-50">{'>'}</span>
			{/if}
		{/each}
	</div>

	<!-- Subfolders -->
	{#if folderItems.length > 0}
		<section class="section">
			<h2 class="section-title">{$_('wiki.subfolders')}</h2>
			<div class="folders-grid">
				{#each folderItems as folder}
					<FolderCard {folder} {locale} />
				{/each}
			</div>
		</section>
	{/if}

	<!-- Files -->
	{#if fileItems.length > 0}
		<section class="section">
			<h2 class="section-title">{$_('wiki.articles')}</h2>
			<div class="files-grid">
				{#each fileItems as item}
					<WikiCard {item} {locale} />
				{/each}
			</div>
		</section>
	{/if}

	{#if folderItems.length === 0 && fileItems.length === 0}
		<p class="empty-message">{$_('wiki.empty_folder')}</p>
	{/if}
</div>

<div class="mx-auto w-fit">
	{#if !isFirstPage}
		<a href={`?page=${prevPage}`}>
			<Button variant="link">{$_('general.previous')}</Button>
		</a>
	{:else}
		<Button variant="link" disabled>{$_('general.previous')}</Button>
	{/if}

	{#each { length: totalPages } as _, index}
		<a href={`?page=${index + 1}`}>
			<Button
				variant="link"
				class="px-[10px]"
				aria-current={currentPage === index + 1 ? 'page' : undefined}
			>
				{index + 1}
			</Button>
		</a>
	{/each}

	{#if !isLastPage}
		<a href={`?page=${nextPage}`}>
			<Button variant="link">{$_('general.next')}</Button>
		</a>
	{:else}
		<Button variant="link" disabled>{$_('general.next')}</Button>
	{/if}
</div>

<style lang="scss">
	.folder-wrapper {
		padding-inline: 50px;
		max-width: 1500px;
		margin: 0 auto;
	}

	.breadcrumbs {
		display: flex;
		align-items: center;
		gap: 5px;
		margin-bottom: 30px;
		flex-wrap: wrap;
	}

	.section {
		margin-bottom: 40px;
	}

	.section-title {
		font-size: 1.25rem;
		font-weight: 600;
		margin-bottom: 20px;
	}

	.folders-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
		gap: 16px;
	}

	.files-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
		gap: 20px;
	}

	.empty-message {
		text-align: center;
		color: hsl(var(--foreground) / 0.6);
		padding: 40px;
	}

	@media screen and (max-width: 900px) {
		.folder-wrapper {
			padding-inline: 15px;
		}
	}
</style>
