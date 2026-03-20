<script lang="ts">
	import { user } from '$lib/client';
	import { Input } from '$lib/components/ui/input';
	import { Button } from '$lib/components/ui/button';
	import * as Table from '$lib/components/ui/table/index.js';
	import * as Select from '$lib/components/ui/select/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { Label } from '$lib/components/ui/label';
	import { toast } from 'svelte-sonner';
	import { onMount } from 'svelte';
	import Download from 'lucide-svelte/icons/download';

	let orders: any[] = [];
	let loading = false;

	let stateFilter = '';
	let methodFilter = '';
	let searchQuery = '';

	let showStateDialog = false;
	let showTrackingDialog = false;
	let selectedOrder: any = null;
	let newState = '';
	let trackingContent = '';
	let trackingLink = '';

	const states = ['PENDING', 'PAID', 'CANCELLED', 'EXPIRED'];
	const methods = ['Bank Transfer', 'COD', 'Coupon'];

	const vndFormat = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' });
	const dateFormat = new Intl.DateTimeFormat('vi-VN', {
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit'
	});

	async function fetchOrders() {
		loading = true;
		try {
			const params = new URLSearchParams();
			if (stateFilter) params.set('state', stateFilter);
			if (methodFilter) params.set('paymentMethod', methodFilter);
			if (searchQuery) params.set('search', searchQuery);

			const url = `${import.meta.env.VITE_API_URL}/merchant/orders/all?${params.toString()}`;
			const res = await fetch(url, {
				headers: { Authorization: 'Bearer ' + (await $user.token()) }
			});
			orders = await res.json();
		} catch {
			toast.error('Failed to fetch orders');
		}
		loading = false;
	}

	onMount(fetchOrders);

	function applyFilters() {
		fetchOrders();
	}

	function openStateDialog(order: any) {
		selectedOrder = order;
		newState = order.state;
		showStateDialog = true;
	}

	function openTrackingDialog(order: any) {
		selectedOrder = order;
		trackingContent = '';
		trackingLink = '';
		showTrackingDialog = true;
	}

	async function updateState() {
		if (!selectedOrder || !newState) return;

		try {
			const res = await fetch(
				`${import.meta.env.VITE_API_URL}/merchant/order/${selectedOrder.id}/state`,
				{
					method: 'PATCH',
					headers: {
						'Content-Type': 'application/json',
						Authorization: 'Bearer ' + (await $user.token())
					},
					body: JSON.stringify({ state: newState })
				}
			);

			if (!res.ok) throw new Error();
			toast.success('Order state updated');
			showStateDialog = false;
			fetchOrders();
		} catch {
			toast.error('Failed to update order state');
		}
	}

	async function addTracking() {
		if (!selectedOrder || !trackingContent) return;

		try {
			const res = await fetch(
				`${import.meta.env.VITE_API_URL}/merchant/order/${selectedOrder.id}/tracking`,
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						Authorization: 'Bearer ' + (await $user.token())
					},
					body: JSON.stringify({
						content: trackingContent,
						link: trackingLink || undefined
					})
				}
			);

			if (!res.ok) throw new Error();
			toast.success('Tracking added');
			showTrackingDialog = false;
			fetchOrders();
		} catch {
			toast.error('Failed to add tracking');
		}
	}

	function exportCSV() {
		if (orders.length === 0) {
			toast.error('No orders to export');
			return;
		}

		const headers = ['ID', 'State', 'Payment Method', 'Recipient', 'Phone', 'Address', 'Amount', 'Fee', 'Total', 'Delivered', 'Date'];
		const rows = orders.map((o) => [
			o.id,
			o.state,
			o.paymentMethod,
			`"${(o.recipientName || '').replace(/"/g, '""')}"`,
			o.phone || '',
			`"${(o.address || '').replace(/"/g, '""')}"`,
			o.amount,
			o.fee,
			o.amount + o.fee,
			o.delivered ? 'Yes' : 'No',
			new Date(o.created_at).toISOString()
		]);

		const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
		const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `orders_${new Date().toISOString().slice(0, 10)}.csv`;
		a.click();
		URL.revokeObjectURL(url);
	}

	function stateColor(state: string) {
		switch (state) {
			case 'PAID': return 'color: #22c55e';
			case 'PENDING': return 'color: #eab308';
			case 'CANCELLED': return 'color: #ef4444';
			case 'EXPIRED': return 'color: #6b7280';
			default: return '';
		}
	}
</script>

<div class="filters">
	<Select.Root
		onSelectedChange={(e) => {
			stateFilter = e?.value === 'all' ? '' : (e?.value || '');
			applyFilters();
		}}
	>
		<Select.Trigger class="w-[160px]">
			<Select.Value placeholder="All States" />
		</Select.Trigger>
		<Select.Content>
			<Select.Item value="all">All States</Select.Item>
			{#each states as s}
				<Select.Item value={s}>{s}</Select.Item>
			{/each}
		</Select.Content>
	</Select.Root>

	<Select.Root
		onSelectedChange={(e) => {
			methodFilter = e?.value === 'all' ? '' : (e?.value || '');
			applyFilters();
		}}
	>
		<Select.Trigger class="w-[180px]">
			<Select.Value placeholder="All Methods" />
		</Select.Trigger>
		<Select.Content>
			<Select.Item value="all">All Methods</Select.Item>
			{#each methods as m}
				<Select.Item value={m}>{m}</Select.Item>
			{/each}
		</Select.Content>
	</Select.Root>

	<form class="search-form" on:submit|preventDefault={applyFilters}>
		<Input bind:value={searchQuery} placeholder="Search by name or ID..." class="w-[220px]" />
		<Button type="submit" variant="outline" size="sm">Search</Button>
	</form>

	<Button variant="outline" on:click={exportCSV}>
		<Download class="mr-2 h-4 w-4" />
		Export CSV
	</Button>
</div>

<Table.Root>
	<Table.Caption>Total: {orders.length} orders</Table.Caption>
	<Table.Header>
		<Table.Row>
			<Table.Head class="w-[100px]">ID</Table.Head>
			<Table.Head class="w-[100px]">State</Table.Head>
			<Table.Head class="w-[130px]">Method</Table.Head>
			<Table.Head>Recipient</Table.Head>
			<Table.Head>Phone</Table.Head>
			<Table.Head>Latest Tracking</Table.Head>
			<Table.Head class="text-right">Amount</Table.Head>
			<Table.Head class="w-[140px]">Date</Table.Head>
			<Table.Head class="w-[200px]">Actions</Table.Head>
		</Table.Row>
	</Table.Header>
	<Table.Body>
		{#each orders as order}
			<Table.Row>
				<Table.Cell class="font-medium">
					<a href={`/orders/${order.id}`} class="link">{order.id}</a>
				</Table.Cell>
				<Table.Cell>
					<span style={stateColor(order.state)}>{order.state}</span>
				</Table.Cell>
				<Table.Cell>{order.paymentMethod}</Table.Cell>
				<Table.Cell>{order.recipientName || '-'}</Table.Cell>
				<Table.Cell>{order.phone || '-'}</Table.Cell>
				<Table.Cell>
					{order.orderTracking?.[0]?.content || 'N/a'}
				</Table.Cell>
				<Table.Cell class="text-right">
					{vndFormat.format(order.amount + order.fee)}
				</Table.Cell>
				<Table.Cell>
					{dateFormat.format(new Date(order.created_at))}
				</Table.Cell>
				<Table.Cell>
					<div class="action-buttons">
						<Button size="sm" variant="outline" on:click={() => openStateDialog(order)}>
							State
						</Button>
						<Button size="sm" variant="outline" on:click={() => openTrackingDialog(order)}>
							Track
						</Button>
					</div>
				</Table.Cell>
			</Table.Row>
		{/each}
	</Table.Body>
</Table.Root>

{#if loading}
	<p class="text-center text-muted-foreground mt-4">Loading...</p>
{/if}

<!-- Update State Dialog -->
<Dialog.Root bind:open={showStateDialog}>
	<Dialog.Content class="max-w-sm">
		<Dialog.Header>
			<Dialog.Title>Update Order State</Dialog.Title>
		</Dialog.Header>
		<div class="dialog-body">
			<Label>Order #{selectedOrder?.id}</Label>
			<Select.Root
				onSelectedChange={(e) => { newState = e?.value || ''; }}
				selected={{ value: newState, label: newState }}
			>
				<Select.Trigger class="w-full">
					<Select.Value placeholder="Select state" />
				</Select.Trigger>
				<Select.Content>
					{#each states as s}
						<Select.Item value={s}>{s}</Select.Item>
					{/each}
				</Select.Content>
			</Select.Root>
		</div>
		<Dialog.Footer>
			<Button variant="outline" on:click={() => (showStateDialog = false)}>Cancel</Button>
			<Button on:click={updateState}>Update</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<!-- Add Tracking Dialog -->
<Dialog.Root bind:open={showTrackingDialog}>
	<Dialog.Content class="max-w-sm">
		<Dialog.Header>
			<Dialog.Title>Add Tracking</Dialog.Title>
		</Dialog.Header>
		<div class="dialog-body">
			<Label>Order #{selectedOrder?.id}</Label>
			<div class="field">
				<Label>Content</Label>
				<Input bind:value={trackingContent} placeholder="Tracking update..." />
			</div>
			<div class="field">
				<Label>Link (optional)</Label>
				<Input bind:value={trackingLink} placeholder="https://..." />
			</div>
		</div>
		<Dialog.Footer>
			<Button variant="outline" on:click={() => (showTrackingDialog = false)}>Cancel</Button>
			<Button on:click={addTracking} disabled={!trackingContent}>Add</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<style lang="scss">
	.filters {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
		align-items: center;
		margin-bottom: 1.5rem;
	}

	.search-form {
		display: flex;
		gap: 0.5rem;
		align-items: center;
	}

	.link {
		color: #7cb4f8;
	}

	.action-buttons {
		display: flex;
		gap: 0.25rem;
	}

	.dialog-body {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		padding: 1rem 0;
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}
</style>
