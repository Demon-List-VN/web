<script lang="ts">
	import { _ } from 'svelte-i18n';
	import BuyerCard from './supporterCard.svelte';
	import BigTitle from '$lib/components/bigTitle.svelte';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import PlayerLink from '$lib/components/playerLink.svelte';
	import * as Tabs from '$lib/components/ui/tabs';
	import { goto } from '$app/navigation';

	export let data: any;

	function handleIntervalChange(value: string) {
		goto(`/supporter/top?interval=${value}`);
	}
</script>

<svelte:head>
	<title>{$_('supporter.top_supporters.page_title')} - {$_('head.site_name')}</title>
</svelte:head>

<div>
	<img
		class="bgGradient absolute z-0 h-[550px] w-full object-cover"
		src={`https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1964&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D`}
		alt="bg"
	/>
</div>

<div class='relative'>
	<BigTitle value={$_('supporter.top_supporters.page_title')} />
</div>

<div class="container relative mx-auto max-w-6xl px-4 py-8">
	<div class="space-y-4">
		{#if data.buyers && data.buyers.length > 0}
			<div class="grid gap-3 md:grid-cols-2">
				{#each data.buyers as buyer, index}
					<BuyerCard {buyer} rank={index + 1} />
				{/each}
			</div>
		{:else}
			<Card>
				<CardContent class="py-8 text-center">
					<p class="text-muted-foreground">{$_('supporter.top_supporters.no_buyers_found')}</p>
				</CardContent>
			</Card>
		{/if}
	</div>
</div>

<style>
	.bgGradient {
		filter: blur(175px);
		margin-top: -55px;
		mask-image: linear-gradient(rgba(0, 0, 0, 1) 0%, rgba(0, 0, 0, 0) 100%);
	}

	:global(.container) {
		animation: fadeIn 0.3s ease-in;
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
			transform: translateY(10px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
</style>
