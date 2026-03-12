<script lang="ts">
	import * as sdk from '$lib/client/sdk';
	import { user } from '$lib/client';
	import Title from '$lib/components/Title.svelte';
	import * as Table from '$lib/components/ui/table/index.js';
	import { onMount } from 'svelte';

	let data: any[] = [];

	onMount(async () => {
		data = await (
			await sdk.fetch(`/merchant/orders`, {
				method: 'GET',
				headers: {
					Authorization: 'Bearer ' + (await $user.token())
				}
			})
		).json();
	});
</script>

<Title value="Orders" />
<div class="wrapper">
	<Table.Root>
		<Table.Caption>Total: {data.length}</Table.Caption>
		<Table.Header>
			<Table.Row>
				<Table.Head class="w-[200px]">ID</Table.Head>
				<Table.Head class="w-[100px]">Status</Table.Head>
				<Table.Head class="w-[150px]">Method</Table.Head>
				<Table.Head class="w-[200px]">Recipient's name</Table.Head>
				<Table.Head>Latest Status</Table.Head>
				<Table.Head class="text-right">Amount</Table.Head>
			</Table.Row>
		</Table.Header>
		<Table.Body>
			{#each data as item}
				<Table.Row>
					<Table.Cell class="font-medium">
						<a href={`/orders/${item.id}`}>
							{item.id}
						</a>
					</Table.Cell>
					<Table.Cell>{item.state}</Table.Cell>
					<Table.Cell>{item.paymentMethod}</Table.Cell>
					<Table.Cell>{item.recipientName}</Table.Cell>
					<Table.Cell>{item.orderTracking[0] ? item.orderTracking[0].content : 'N/a'}</Table.Cell>
					<Table.Cell class="text-right">
						{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(
							item.amount + item.fee
						)}
					</Table.Cell>
				</Table.Row>
			{/each}
		</Table.Body>
	</Table.Root>
</div>

<style lang="scss">
	.wrapper {
		padding-inline: 50px;
	}

	@media screen and (max-width: 900px) {
		.wrapper {
			padding-inline: 10px;
		}
	}
</style>
