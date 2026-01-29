<script lang="ts">
	import { onMount } from 'svelte';
	import { locale, t } from 'svelte-i18n';
	import * as Card from '$lib/components/ui/card/index.js';
	import Markdown from '$lib/components/markdown.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import Ads from '$lib/components/ads.svelte';
	import { fade } from 'svelte/transition';
	import { Skeleton } from '$lib/components/ui/skeleton/index.js';

	export let data: any;

	let content: string | null = null;

	$: metadata = $locale ? data.metadatas.filter((x: any) => x.locale == $locale)[0] : null;
	$: folders = getFolders(metadata) ?? [];

	function getFolders(metadata: any) {
		if (!metadata) {
			return [];
		}

		let parts: string[] = metadata.path.split('/');

		if (parts.at(-1)!.endsWith('.md')) {
			parts.pop();
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

	export async function getRawFileByRawUrl(url: string) {
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
		content = await getRawFileByRawUrl(metadata.rawUrl);
	});
</script>

<img
	in:fade={{ delay: 500, duration: 300 }}
	class="absolute z-0 mt-[-50px] h-[50vw] max-h-[450px] w-full object-cover"
	src={metadata.image}
	alt={metadata.title}
/>
<div class="head" />
<Card.Root class="relative z-10 mx-auto mt-[-200px] max-w-[1000px]">
	<div class="ml-[25px] mt-[10px] flex items-center gap-[5px]">
		{#each folders as folder, index}
			<a href={folder.link}>
				<Button variant="link" class="p-0 font-light opacity-75">
					{folder.title}
				</Button>
			</a>
			{#if index !== folders.length - 1}
				<span class="opacity-50">
					{'>'}
				</span>
			{/if}
		{/each}
	</div>
	<Ads />
	<Card.Header class="mt-[-12px]">
		<Card.Title class="text-3xl">{metadata.title}</Card.Title>
		<Card.Description>
			{$t('wiki.created_at')}
			{new Date(metadata.created_at).toLocaleString('vi-vn')}, {$t('wiki.last_updated')}
			{new Date(metadata.modifiedAt).toLocaleString('vi-vn')}
		</Card.Description>
	</Card.Header>
	{#if content}
		<Card.Content>
			<Markdown {content} />
		</Card.Content>
	{:else}
		<Skeleton class="ml-[20px] mb-[5px] h-[20px] w-[40%]" />
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
</style>
