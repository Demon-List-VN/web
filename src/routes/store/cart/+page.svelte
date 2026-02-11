<script lang="ts">
	import { cart } from '$lib/client/cart';
	import { user } from '$lib/client/user';
	import { onMount } from 'svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Table from '$lib/components/ui/table/index.js';
	import { Cross2 } from 'svelte-radix';
	import { toast } from 'svelte-sonner';
	import CheckoutButton from './checkoutButton.svelte';
	import * as Alert from '$lib/components/ui/alert/index.js';
	import { ExclamationTriangle } from 'svelte-radix';
	import { _ } from 'svelte-i18n';

	let data: any[] = [];

	async function fetchData() {
		if (!$cart.items.length) {
			return;
		}

		data = await (
			await fetch(
				`${import.meta.env.VITE_API_URL}/store/products?ids=${JSON.stringify($cart.queryArray())}`
			)
		).json();
	}

	onMount(async () => {
		await fetchData();
	});
</script>

<svelte:head>
	<title>Giỏ hàng - Geometry Dash Việt Nam</title>
</svelte:head>

<div
	class="mb-[50px] ml-auto mr-auto mt-[30px] flex w-[1200px] max-w-full items-center pl-[15px] pr-[15px]"
>
	<h2>{$_('store.cart.title')}</h2>
</div>
{#if $cart.items.length}
	<div
		class="mb-[50px] ml-auto mr-auto mt-[30px] flex w-[1200px] max-w-full flex-col justify-center gap-[15px] pl-[15px] pr-[15px]"
	>
		{#if $user.loggedIn && !$user.data.discord}
			<Alert.Root class="text-yellow-400">
				<Alert.Title class="flex items-center gap-[10px]">
					<ExclamationTriangle size={15} />
					{$_('store.cart.discord_required')}
				</Alert.Title>
			</Alert.Root>
		{:else if !$user.loggedIn}
			<Alert.Root class="text-yellow-400">
				<Alert.Title class="flex items-center gap-[10px]">
					<ExclamationTriangle size={15} />
					{$_('store.cart.login_required')}
				</Alert.Title>
			</Alert.Root>
		{/if}
		<Table.Root>
			<Table.Header>
				<Table.Row>
					<Table.Head class="w-[300px]">{$_('store.cart.product')}</Table.Head>
					<Table.Head class="w-[50px] text-center">{$_('store.cart.qty')}</Table.Head>
					<Table.Head class="w-[200px]">{$_('store.cart.amount')}</Table.Head>
					<Table.Head class="text-right">{$_('store.cart.action')}</Table.Head>
				</Table.Row>
			</Table.Header>
			<Table.Body>
				{#each data as product}
					<Table.Row>
						<Table.Cell class="w-[300px]">
							<a href={`/store/product/${product.id}`}> {product.name}</a>
						</Table.Cell>
						<Table.Cell class="w-[50px] text-center">
							{$cart.getItem(product.id)?.quantity}
						</Table.Cell>
						<Table.Cell class="w-[200px]">
							{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(
								product.price * $cart.getItem(product.id).quantity
							)}
						</Table.Cell>
						<Table.Cell class="text-right">
							<Button
								variant="destructive"
								size="icon"
								on:click={() => {
									$cart.removeItem(product.id);
									data = data.filter((item) => item.id !== product.id);
									toast.success($_('store.cart.remove_success', { values: { product: product.name } }));
								}}
							>
								<Cross2 size={16} />
							</Button>
						</Table.Cell>
					</Table.Row>
				{/each}
			</Table.Body>
		</Table.Root>
		<div class="flex justify-end">
			<p class="text-right text-lg">
				{$_('store.cart.total')}<br />
				<span class="text-2xl font-semibold">
					{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(
						data.reduce((total, product) => {
							return total + product.price * $cart.getItem(product.id).quantity;
						}, 0)
					)}
				</span>
			</p>
		</div>
		<CheckoutButton bind:items={data} />
	</div>
{:else}
	<p class="text-center opacity-50">{$_('store.cart.empty')}</p>
{/if}

<style lang="scss">
	h2 {
		font-weight: 600;
		font-size: 35px;
	}
</style>
