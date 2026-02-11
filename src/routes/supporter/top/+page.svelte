<script lang="ts">
	import { _ } from 'svelte-i18n';
	import BuyerCard from './supporterCard.svelte';
	import BigTitle from '$lib/components/bigTitle.svelte';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import PlayerLink from '$lib/components/playerLink.svelte';
	import * as Tabs from '$lib/components/ui/tabs';
	import { goto } from '$app/navigation';
	import { fade } from 'svelte/transition';

	export let data: any;

	function handleIntervalChange(value: string) {
		goto(`/supporter/top?interval=${value}`);
	}

	function formatTotalAmount(buyers: any[]): string {
		const total = buyers.reduce((sum, buyer) => sum + buyer.totalAmount, 0);
		return new Intl.NumberFormat('vi-VN', {
			style: 'currency',
			currency: 'VND'
		}).format(total);
	}

	$: totalRevenue = formatTotalAmount(data.buyers);
	$: topBuyer = data.buyers[0];
	$: averageSpending =
		data.buyers.length > 0
			? new Intl.NumberFormat('vi-VN', {
					style: 'currency',
					currency: 'VND'
				}).format(
					data.buyers.reduce((sum: number, b: any) => sum + b.totalAmount, 0) / data.buyers.length
				)
			: '0 ₫';
</script>

<svelte:head>
	<title>{$_('supporter.top_supporters.page_title')} - Geometry Dash Việt Nam</title>
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
	<Tabs.Root value={data.interval} class="mb-6">
		<Tabs.List class="grid w-full grid-cols-3">
			<Tabs.Trigger value="30" on:click={() => handleIntervalChange('30')}
				>{$_('supporter.top_supporters.last_30_days')}</Tabs.Trigger
			>
			<Tabs.Trigger value="14" on:click={() => handleIntervalChange('14')}
				>{$_('supporter.top_supporters.last_14_days')}</Tabs.Trigger
			>
			<Tabs.Trigger value="7" on:click={() => handleIntervalChange('7')}
				>{$_('supporter.top_supporters.last_7_days')}</Tabs.Trigger
			>
		</Tabs.List>
	</Tabs.Root>

	<div class="mb-8 grid gap-4 md:grid-cols-3">
		<Card>
			<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
				<CardTitle class="text-sm font-medium"
					>{$_('supporter.top_supporters.total_revenue')}</CardTitle
				>
			</CardHeader>
			<CardContent>
				<div class="text-2xl font-bold text-green-600">{totalRevenue}</div>
				<p class="text-xs text-muted-foreground">
					{$_('supporter.top_supporters.from_all_supporters')}
				</p>
			</CardContent>
		</Card>

		<Card>
			<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
				<CardTitle class="text-sm font-medium"
					>{$_('supporter.top_supporters.top_supporter')}</CardTitle
				>
			</CardHeader>
			<CardContent>
				{#if topBuyer}
					<div class="mb-1">
						<PlayerLink player={topBuyer.player} />
					</div>
					<p class="text-xs text-muted-foreground">
						{new Intl.NumberFormat('vi-VN', {
							style: 'currency',
							currency: 'VND'
						}).format(topBuyer.totalAmount)}
					</p>
				{:else}
					<div class="text-2xl font-bold">N/A</div>
					<p class="text-xs text-muted-foreground">0 ₫</p>
				{/if}
			</CardContent>
		</Card>

		<Card>
			<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
				<CardTitle class="text-sm font-medium"
					>{$_('supporter.top_supporters.average_spending')}</CardTitle
				>
			</CardHeader>
			<CardContent>
				<div class="text-2xl font-bold">{averageSpending}</div>
				<p class="text-xs text-muted-foreground">
					{data.buyers.length}
					{$_('supporter.top_supporters.supporters')}
				</p>
			</CardContent>
		</Card>
	</div>

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
