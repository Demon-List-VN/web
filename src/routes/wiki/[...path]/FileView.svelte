<script lang="ts">
	import { onMount } from 'svelte';
	import { _ } from 'svelte-i18n';
	import * as Card from '$lib/components/ui/card/index.js';
	import Markdown from '$lib/components/markdown.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import Ads from '$lib/components/ads.svelte';
	import { fade } from 'svelte/transition';
	import { Skeleton } from '$lib/components/ui/skeleton/index.js';

	export let metadata: any;
	export let breadcrumbs: Array<{ title: string; link: string }>;
	export let locale: string;

	let content: string | null = null;

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
		if (metadata?.rawUrl) {
			content = await getRawFileByRawUrl(metadata.rawUrl);
		}
	});
</script>

<svelte:head>
	<title>{metadata.title} - Wiki - Geometry Dash Việt Nam</title>
	<meta property="og:title" content={`${metadata.title} - Wiki - Geometry Dash Việt Nam`} />
	<meta property="og:description" content={metadata.description} />
	{#if metadata.image}
		<meta property="og:image" content={metadata.image} />
	{/if}
</svelte:head>

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
			{new Date(metadata.created_at).toLocaleString(locale || 'vi-vn')}, {$_('wiki.last_updated')}
			{new Date(metadata.modifiedAt).toLocaleString(locale || 'vi-vn')}
		</Card.Description>
	</Card.Header>
	{#if content !== null}
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
</style>
