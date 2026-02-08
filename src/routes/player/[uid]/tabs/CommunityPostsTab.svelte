<script lang="ts">
	import { onMount } from 'svelte';
	import { _ } from 'svelte-i18n';
	import { user } from '$lib/client';
	import CommunityPostCard from '$lib/components/communityPostCard.svelte';
	import { Button } from '$lib/components/ui/button';
	import { ArrowLeft, ArrowRight } from 'lucide-svelte';

	export let userID: string;

	let posts: any[] | null = null;
	let total = 0;
	let currentPage = 0;
	const PAGE_SIZE = 10;

	async function fetchPosts() {
		posts = null;
		const params = new URLSearchParams({
			limit: String(PAGE_SIZE),
			offset: String(currentPage * PAGE_SIZE)
		});

		const token = await $user.token();
		const headers: Record<string, string> = {};
		if (token) headers['Authorization'] = `Bearer ${token}`;

		try {
			const res = await fetch(
				`${import.meta.env.VITE_API_URL}/players/${userID}/community-posts?${params}`,
				{ headers }
			);
			const json = await res.json();
			posts = json.data;
			total = json.total;
		} catch {
			posts = [];
			total = 0;
		}
	}

	onMount(() => {
		fetchPosts();
	});

	$: totalPages = Math.ceil(total / PAGE_SIZE);
</script>

{#if posts === null}
	<div class="flex justify-center py-10">
		<p>{$_('general.loading')}</p>
	</div>
{:else if posts.length === 0}
	<div class="flex flex-col items-center justify-center py-12 text-center">
		<p class="text-muted-foreground">{$_('player.no_community_posts')}</p>
	</div>
{:else}
	<div class="flex flex-col gap-3">
		{#each posts as post (post.id)}
			<CommunityPostCard {post} compact />
		{/each}
	</div>

	{#if totalPages > 1}
		<div class="mt-4 flex items-center justify-center gap-4">
			<Button
				variant="outline"
				size="sm"
				disabled={currentPage === 0}
				on:click={() => {
					currentPage--;
					fetchPosts();
				}}
			>
				<ArrowLeft class="mr-1 h-4 w-4" />
				{$_('general.previous')}
			</Button>
			<span class="text-muted-foreground text-sm">
				{currentPage + 1} / {totalPages}
			</span>
			<Button
				variant="outline"
				size="sm"
				disabled={currentPage >= totalPages - 1}
				on:click={() => {
					currentPage++;
					fetchPosts();
				}}
			>
				{$_('general.next')}
				<ArrowRight class="ml-1 h-4 w-4" />
			</Button>
		</div>
	{/if}
{/if}
