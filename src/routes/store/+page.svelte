<script lang="ts">
	import type { PageData } from './$types';
	import { cart } from '$lib/client/cart';
	import { Button } from '$lib/components/ui/button';
	import * as Carousel from '$lib/components/ui/carousel/index.js';
	import Autoplay from 'embla-carousel-autoplay';
	import { _ } from 'svelte-i18n';

	export let data: PageData;

	function getFirstLine(str: string) {
		return str.split('\n')[0];
	}
</script>

<svelte:head>
	<title>Cửa hàng - Geometry Dash VN</title>
</svelte:head>

<div
	class="mb-[50px] ml-auto mr-auto mt-[30px] flex w-[1200px] max-w-full items-center pl-[15px] pr-[15px]"
>
	<a href="/store">
		<h2>{$_('store.title')}</h2>
	</a>
	<a href="/store/cart" class="ml-auto">
		<Button>
			{$_('store.view_cart')}
			{#if $cart.items.length}
				({$cart.items.length})
			{/if}
		</Button>
	</a>
</div>

<div class="flex flex-col items-center gap-[10px] pl-[10px] pr-[10px]">
	<Carousel.Root
		class="w-[1200px] max-w-full"
		plugins={[
			Autoplay({
				delay: 5000
			})
		]}
	>
		<Carousel.Content>
			{#each data.featured as item}
				<Carousel.Item>
					<a href={item.redirect ? item.redirect : `/store/product/${item.id}`}>
						<div class="relative">
							<img
								class="ml-auto mr-auto aspect-[3/1] min-h-[250px] w-[1200px] max-w-full rounded-xl object-cover"
								src={`https://cdn.demonlistvn.com/products/${item.id}/banner.webp?v=1`}
								alt="product"
							/>
							<div
								class={`absolute bottom-[20px] left-0 right-0 flex flex-col items-center p-4`}
								style={`color: ${item.bannerTextColor ? item.bannerTextColor : 'white'}`}
							>
								<h2 class="text-shadow">{item.name}</h2>
								<p class="text-shadow">{getFirstLine(item.description)}</p>
							</div>
						</div>
					</a>
				</Carousel.Item>
			{/each}
		</Carousel.Content>
		<Carousel.Previous />
		<Carousel.Next />
	</Carousel.Root>
	<h3 class="mt-[5px] text-[25px] font-medium">{$_('store.all_products')}</h3>
	<div class="flex w-[1200px] max-w-full flex-wrap justify-center gap-[10px]">
		{#each data.data as item}
			<a href={item.redirect ? item.redirect : `/store/product/${item.id}`}>
				<div class="h-full rounded-xl p-[10px] hover:bg-[hsl(var(--muted))]">
					<img
						class=" h-[180px] w-[180px] rounded-xl object-cover"
						src={`https://cdn.demonlistvn.com/products/${item.id}/0.webp`}
						alt="product"
					/>
					<div class="w-[180px] p-[7.5px] pb-0">
						<h4 class="font-bold">{item.name}</h4>
						<h4>
							{new Intl.NumberFormat('vi-VN', {
								style: 'currency',
								currency: 'VND'
							}).format(item.price)}
						</h4>
					</div>
				</div>
			</a>
		{/each}
	</div>
</div>

<style lang="scss">
	h2 {
		font-weight: 600;
		font-size: 35px;
	}
</style>
