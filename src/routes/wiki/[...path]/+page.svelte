<script lang="ts">
	import { onMount } from 'svelte';
	import { locale, _ } from 'svelte-i18n';
	import * as Card from '$lib/components/ui/card/index.js';
	import Markdown from '$lib/components/markdown.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import Ads from '$lib/components/ads.svelte';
	import { fade } from 'svelte/transition';
	import { Skeleton } from '$lib/components/ui/skeleton/index.js';
	import WikiCard from '$lib/components/wikiCard.svelte';
	import FolderCard from '$lib/components/folderCard.svelte';
	import BigTitle from '$lib/components/bigTitle.svelte';

	export let data: any;

	let content: string | null = null;

	$: isFolder = data.type === 'folder';
	$: metadata = !isFolder && data.metadata && $locale 
		? data.metadata[$locale] || Object.values(data.metadata)[0] 
		: null;
	$: breadcrumbs = getBreadcrumbs(data) ?? [];
	$: folderTitle = isFolder ? getFolderTitle(data.path) : '';

	// Separate items for folder view
	$: folderItems = isFolder && data.items 
		? data.items.filter((item: any) => item.type === 'folder') 
		: [];
	$: fileItems = isFolder && data.items 
		? data.items.filter((item: any) => item.type === 'file') 
		: [];

	function getBreadcrumbs(data: any) {
		let path = data.path;
		if (!path) return [];

		let parts: string[] = path.split('/');

		// Remove .md extension if it's a file
		if (parts.at(-1)?.endsWith('.md')) {
			parts[parts.length - 1] = parts[parts.length - 1].replace('.md', '');
		}

		let res = [
			{
				title: 'Wiki',
				link: '/wiki'
			}
		];

		for (let i = 0; i < parts.length; i++) {
			let part = parts[i];
			part = part.split('-').join(' ');
			part = part.charAt(0).toUpperCase() + part.slice(1);

			res.push({
				title: part,
				link: '/wiki/' + parts.slice(0, i + 1).join('/')
			});
		}

		return res;
	}

	function getFolderTitle(path: string) {
		const parts = path.split('/');
		const name = parts[parts.length - 1];
		return name.split('-').map((word: string) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
	}

	async function getRawFileByRawUrl(url: string) {
		const res = await fetch(url, {
			method: 'GET',
			headers: {
				'User-Agent': 'nampe286',
				Accept: 'application/vnd.github+json'
			}
		});

		if (!res.ok) {
			throw new Error(`Failed to get raw file: ${res.status}`);
		}

		const text = await res.text();
		return text.split('\n').slice(1).join('\n');
	}

	onMount(async () => {
		if (!isFolder && metadata?.rawUrl) {
			content = await getRawFileByRawUrl(metadata.rawUrl);
		}
	});
</script>

<svelte:head>
	{#if isFolder}
		<title>{folderTitle} - Wiki - Demon List VN</title>
		<meta property="og:title" content={`${folderTitle} - Wiki - Demon List VN`} />
	{:else if metadata}
		<title>{metadata.title} - Wiki - Demon List VN</title>
		<meta property="og:title" content={`${metadata.title} - Wiki - Demon List VN`} />
		<meta property="og:description" content={metadata.description} />
		{#if metadata.image}
			<meta property="og:image" content={metadata.image} />
		{/if}
	{/if}
</svelte:head>

{#if isFolder}
	<!-- Folder View -->
	<BigTitle value={folderTitle} description={$_('wiki.folder_description', { values: { count: data.count || 0 } })} />
	
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
						<FolderCard {folder} />
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
						<WikiCard {item} />
					{/each}
				</div>
			</section>
		{/if}

		{#if folderItems.length === 0 && fileItems.length === 0}
			<p class="empty-message">{$_('wiki.empty_folder')}</p>
		{/if}
	</div>
{:else if metadata}
	<!-- File View -->
	{#if metadata.image}
		<img
			in:fade={{ delay: 500, duration: 300 }}
			class="absolute z-0 mt-[-50px] h-[50vw] max-h-[450px] w-full object-cover"
			src={metadata.image}
			alt={metadata.title}
		/>
		<div class="head" />
	{:else}
		<div class="spacer" />
	{/if}
	<Card.Root class="relative z-10 mx-auto max-w-[1000px] {metadata.image ? 'mt-[-200px]' : ''}">
		<div class="ml-[25px] mt-[10px] flex items-center gap-[5px]">
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
		<Ads />
		<Card.Header class="mt-[-12px]">
			<Card.Title class="text-3xl">{metadata.title}</Card.Title>
			<Card.Description>
				{$_('wiki.created_at')}
				{new Date(metadata.created_at).toLocaleString($locale || 'vi-vn')}, {$_('wiki.last_updated')}
				{new Date(metadata.modifiedAt).toLocaleString($locale || 'vi-vn')}
			</Card.Description>
		</Card.Header>
		{#if content}
			<Card.Content>
				<Markdown {content} />
			</Card.Content>
		{:else}
			<Skeleton class="mb-[5px] ml-[20px] h-[20px] w-[40%]" />
			<Skeleton class="mx-auto mb-[5px] h-[300px] w-[calc(100%-40px)]" />
			<Skeleton class="mx-[20px] mb-[5px] h-[20px] w-[calc(100%-100px)]" />
			<Skeleton class="mx-[20px] mb-[5px] h-[20px] w-[calc(100%-60px)]" />
			<Skeleton class="mx-[20px] mb-[5px] h-[20px] w-[calc(100%-200px)]" />
		{/if}
	</Card.Root>
{/if}

<style lang="scss">
	.head {
		position: relative;
		background: linear-gradient(rgba(0, 0, 0, 0) 10%, hsl(var(--background)) 100%);
		height: 50vw;
		max-height: 450px;
		margin-top: -50px;
		z-index: 10;
		display: flex;
		flex-direction: column;
	}

	.spacer {
		height: 80px;
	}

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
