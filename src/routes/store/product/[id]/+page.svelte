<script lang="ts">
	import type { PageData } from './$types';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import Markdown from '$lib/components/markdown.svelte';
	import { toast } from 'svelte-sonner';
	import { cart } from '$lib/client/cart';

	export let data: PageData;

	let selectedImageIndex = 0;
	let quantity = data.stock > 0 ? 1 : 0;
	let isImageEnlarged = false;

	function selectImage(index: number) {
		selectedImageIndex = index;
	}

	function enlargeImage() {
		isImageEnlarged = true;
	}

	function closeEnlargedImage() {
		isImageEnlarged = false;
	}

	function addToCart() {
		$cart.addItem(data.id, quantity);
		toast.success(`Added ${quantity} ${data.name} to cart!`);
	}

	function getFirstLine(str: string) {
		return str.split('\n')[0];
	}
</script>

<svelte:head>
	<title>{data.name} - Geometry Dash VN</title>
	<meta property="og:title" content={`${data.name} - Geometry Dash VN`} />
	<meta property="og:description" content={getFirstLine(data.description)} />
	<meta
		property="og:image"
		content={`https://cdn.demonlistvn.com/products/${data.id}/0.webp`}
	/>
</svelte:head>

<div
	class="mb-[50px] ml-auto mr-auto mt-[30px] flex w-[1200px] max-w-full items-center pl-[15px] pr-[15px]"
>
	<a href="/store">
		<h2>Store</h2>
	</a>
	<a href="/store/cart" class="ml-auto">
		<Button>
			View my cart
			{#if $cart.items.length}
				({$cart.items.length})
			{/if}
		</Button>
	</a>
</div>
<div
	class="ml-auto mr-auto mt-[20px] flex w-[1200px] max-w-full flex-col items-center gap-[20px] pl-[15px] pr-[15px] md:mt-[50px] md:gap-[50px] lg:flex-row lg:items-start"
>
	<div class="flex w-fit flex-col gap-[10px]">
		<button
			class="aspect-square cursor-zoom-in overflow-hidden rounded-2xl transition-transform duration-200 hover:scale-[1.02] sm:w-[500px]"
			on:click={enlargeImage}
		>
			<img
				class="h-full w-full object-cover"
				src={`https://cdn.demonlistvn.com/products/${data.id}/${selectedImageIndex}.webp`}
				alt="product"
			/>
		</button>
		<div class="flex justify-center gap-[10px]">
			{#each { length: data.imgCount } as _, index}
				<button
					class="h-[75px] w-[75px] overflow-hidden rounded-lg border-2 transition-all duration-200
                    {selectedImageIndex === index
						? 'scale-105 border-blue-500'
						: 'border-gray-300 hover:border-gray-400'}"
					on:click={() => selectImage(index)}
				>
					<img
						class="h-full w-full object-cover"
						src={`https://cdn.demonlistvn.com/products/${data.id}/${index}.webp`}
						alt="product thumbnail {index + 1}"
					/>
				</button>
			{/each}
		</div>
	</div>
	<div class="flex flex-col items-center gap-[20px] lg:items-start">
		<div>
			<h2 class="text-center text-[30px] font-semibold lg:text-left">{data.name}</h2>
			<h3 class="text-center text-[21px] lg:text-left">
				{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(data.price)}
			</h3>
			{#if data.stock !== null}
				<p class="text-center lg:text-left">
					{#if data.stock === 0}
						Out of stock
					{:else}
						{data.stock} in stock
					{/if}
				</p>
			{/if}
		</div>
		<Markdown content={data.description} />
		{#if data.id == 1}
			<a href="/supporter">
				<Button class="h-[50px] w-[260px] text-[16px] font-semibold" size="lg">
					Go to Supporter Page
				</Button>
			</a>
		{:else}
			<div class="mt-auto flex flex-col gap-[15px]">
				<div class="flex items-center gap-[8px]">
					<Label for="quantity" class="text-[16px] font-medium">Quantity</Label>
					<div class="flex items-center gap-[10px]">
						<Button
							variant="outline"
							size="sm"
							on:click={() => quantity--}
							disabled={quantity <= 1}
							class="h-[40px] w-[40px] p-0"
						>
							-
						</Button>
						<Input
							id="quantity"
							type="number"
							bind:value={quantity}
							min="1"
							class="h-[40px] w-[80px] text-center disabled:opacity-100"
							disabled
						/>
						<Button
							variant="outline"
							size="sm"
							disabled={quantity == Math.min(data.stock, data.maxQuantity)}
							on:click={() => quantity++}
							class="h-[40px] w-[40px] p-0"
						>
							+
						</Button>
					</div>
				</div>
				<Button
					disabled={($cart.getItem(data.id) && $cart.getItem(data.id).productID != -1) ||
						data.stock == 0}
					on:click={addToCart}
					class="h-[50px] w-[260px] text-[16px] font-semibold"
					size="lg"
				>
					{#if $cart.getItem(data.id).productID != -1}
						Added {$cart.getItem(data.id).quantity} to cart
					{:else if data.stock == 0}
						Out of stock
					{:else}
						Add to Cart
					{/if}
				</Button>
			</div>
		{/if}
	</div>
</div>

{#if isImageEnlarged}
	<!-- svelte-ignore a11y-click-events-have-key-events -->
	<!-- svelte-ignore a11y-no-static-element-interactions -->
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80 p-4"
		on:click={closeEnlargedImage}
	>
		<div class="relative max-h-[90vh] max-w-[90vw]">
			<button
				class="absolute -right-4 -top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white text-black shadow-lg transition-colors hover:bg-gray-100"
				on:click={closeEnlargedImage}
				aria-label="Close enlarged image"
			>
				✕
			</button>
			<!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
			<img
				class="max-h-[700px] max-w-full rounded-lg object-contain"
				src={`https://cdn.demonlistvn.com/products/${data.id}/${selectedImageIndex}.webp`}
				alt=""
				on:click|stopPropagation
			/>
		</div>
	</div>
{/if}

<style lang="scss">
	h2 {
		font-weight: 600;
		font-size: 35px;
	}
</style>
