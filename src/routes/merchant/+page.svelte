<script lang="ts">
	import Title from '$lib/components/Title.svelte';
	import * as Tabs from '$lib/components/ui/tabs/index.js';
	import OrdersTab from './OrdersTab.svelte';
	import ProductsTab from './ProductsTab.svelte';
</script>

<Title value="Merchant" />

<div class="wrapper">
	<Tabs.Root value="orders">
		<Tabs.List class="mb-4">
			<Tabs.Trigger value="orders">Orders</Tabs.Trigger>
			<Tabs.Trigger value="products">Products</Tabs.Trigger>
		</Tabs.List>

		<Tabs.Content value="orders">
			<OrdersTab />
		</Tabs.Content>

		<Tabs.Content value="products">
			<ProductsTab />
		</Tabs.Content>
	</Tabs.Root>
</div>

<style lang="scss">
	.wrapper {
		padding: 2rem;
		max-width: 1400px;
		margin: 0 auto;
	}

	@media (max-width: 768px) {
		.wrapper {
			padding: 1rem;
		}
	}
</style>
