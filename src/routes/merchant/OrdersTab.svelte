<script lang="ts">
	import { user } from '$lib/client';
	import { Input } from '$lib/components/ui/input';
	import { Button } from '$lib/components/ui/button';
	import * as Table from '$lib/components/ui/table/index.js';
	import * as Select from '$lib/components/ui/select/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import * as Popover from '$lib/components/ui/popover/index.js';
	import { Label } from '$lib/components/ui/label';
	import { toast } from 'svelte-sonner';
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import Download from 'lucide-svelte/icons/download';
	import ChevronDown from 'lucide-svelte/icons/chevron-down';
	import Check from 'lucide-svelte/icons/check';

	let allOrders: any[] = [];
	let products: any[] = [];
	let loading = false;

	// Filters — initialized from URL in onMount
	let selectedStates: Set<string> = new Set();
	let selectedMethods: Set<string> = new Set();
	let selectedProducts: Set<number> = new Set();
	let deliveredFilter = '';
	let searchQuery = '';
	let amountMin: number | null = null;
	let amountMax: number | null = null;

	function readFiltersFromURL() {
		const params = $page.url.searchParams;
		const s = params.get('states');
		selectedStates = s ? new Set(s.split(',')) : new Set();
		const m = params.get('methods');
		selectedMethods = m ? new Set(m.split(',')) : new Set();
		const p = params.get('products');
		selectedProducts = p ? new Set(p.split(',').map(Number)) : new Set();
		deliveredFilter = params.get('delivered') || '';
		searchQuery = params.get('search') || '';
		const min = params.get('amountMin');
		amountMin = min ? Number(min) : null;
		const max = params.get('amountMax');
		amountMax = max ? Number(max) : null;
	}

	function syncFiltersToURL() {
		const params = new URLSearchParams();
		if (selectedStates.size > 0) params.set('states', [...selectedStates].join(','));
		if (selectedMethods.size > 0) params.set('methods', [...selectedMethods].join(','));
		if (selectedProducts.size > 0) params.set('products', [...selectedProducts].join(','));
		if (deliveredFilter) params.set('delivered', deliveredFilter);
		if (searchQuery) params.set('search', searchQuery);
		if (amountMin !== null && amountMin > 0) params.set('amountMin', String(amountMin));
		if (amountMax !== null && amountMax > 0) params.set('amountMax', String(amountMax));
		const qs = params.toString();
		goto(`?${qs}`, { replaceState: true, keepFocus: true, noScroll: true });
	}

	// Dialogs
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

	function getOrderProductIds(order: any): number[] {
		const ids: number[] = [];
		if (order.productID) ids.push(order.productID);
		if (order.orderItems) {
			for (const item of order.orderItems) {
				if (item.productID) ids.push(item.productID);
			}
		}
		return ids;
	}

	function getOrderProductNames(order: any): string {
		if (order.products) return order.products.name;
		if (order.orderItems?.length > 0) {
			return order.orderItems
				.map((i: any) => i.products?.name)
				.filter(Boolean)
				.join(', ');
		}
		return '-';
	}

	$: filteredOrders = allOrders.filter((o) => {
		if (selectedStates.size > 0 && !selectedStates.has(o.state)) return false;
		if (selectedMethods.size > 0 && !selectedMethods.has(o.paymentMethod)) return false;
		if (selectedProducts.size > 0) {
			const pids = getOrderProductIds(o);
			if (!pids.some((id) => selectedProducts.has(id))) return false;
		}
		if (deliveredFilter === 'yes' && !o.delivered) return false;
		if (deliveredFilter === 'no' && o.delivered) return false;
		const total = o.amount + o.fee;
		if (amountMin !== null && amountMin > 0 && total < amountMin) return false;
		if (amountMax !== null && amountMax > 0 && total > amountMax) return false;
		return true;
	});

	$: if (initialized) {
		// Touch all filter vars to track them as dependencies
		selectedStates, selectedMethods, selectedProducts, deliveredFilter, searchQuery, amountMin, amountMax;
		syncFiltersToURL();
	}

	async function fetchOrders() {
		loading = true;
		try {
			const params = new URLSearchParams();
			if (searchQuery) params.set('search', searchQuery);

			const url = `${import.meta.env.VITE_API_URL}/merchant/orders/all?${params.toString()}`;
			const res = await fetch(url, {
				headers: { Authorization: 'Bearer ' + (await $user.token()) }
			});
			allOrders = await res.json();
		} catch {
			toast.error('Failed to fetch orders');
		}
		loading = false;
	}

	async function fetchProducts() {
		try {
			const res = await fetch(`${import.meta.env.VITE_API_URL}/merchant/products`, {
				headers: { Authorization: 'Bearer ' + (await $user.token()) }
			});
			products = await res.json();
		} catch {}
	}

	let initialized = false;

	onMount(() => {
		readFiltersFromURL();
		fetchOrders();
		fetchProducts();
		initialized = true;
	});

	function toggleProduct(id: number) {
		if (selectedProducts.has(id)) {
			selectedProducts.delete(id);
		} else {
			selectedProducts.add(id);
		}
		selectedProducts = selectedProducts;
	}

	function toggleState(s: string) {
		if (selectedStates.has(s)) {
			selectedStates.delete(s);
		} else {
			selectedStates.add(s);
		}
		selectedStates = selectedStates; // trigger reactivity
	}

	function toggleMethod(m: string) {
		if (selectedMethods.has(m)) {
			selectedMethods.delete(m);
		} else {
			selectedMethods.add(m);
		}
		selectedMethods = selectedMethods;
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
		if (filteredOrders.length === 0) {
			toast.error('No orders to export');
			return;
		}

		const headers = ['ID', 'State', 'Payment Method', 'Product', 'Recipient', 'Phone', 'Address', 'Amount', 'Fee', 'Total', 'Delivered', 'Date'];
		const rows = filteredOrders.map((o) => [
			o.id,
			o.state,
			o.paymentMethod,
			`"${getOrderProductNames(o).replace(/"/g, '""')}"`,
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
	<div class="filter-group">
		<Label class="filter-label">State</Label>
		<div class="chip-group">
			{#each states as s}
				<button
					class="chip"
					class:active={selectedStates.has(s)}
					on:click={() => toggleState(s)}
				>
					<span style={stateColor(s)}>{s}</span>
				</button>
			{/each}
		</div>
	</div>

	<div class="filter-group">
		<Label class="filter-label">Method</Label>
		<div class="chip-group">
			{#each methods as m}
				<button
					class="chip"
					class:active={selectedMethods.has(m)}
					on:click={() => toggleMethod(m)}
				>
					{m}
				</button>
			{/each}
		</div>
	</div>

	<div class="filter-group">
		<Label class="filter-label">Product</Label>
		<Popover.Root>
			<Popover.Trigger>
				<button class="multi-select-trigger">
					{#if selectedProducts.size === 0}
						All Products
					{:else}
						{selectedProducts.size} selected
					{/if}
					<ChevronDown class="h-4 w-4 opacity-50" />
				</button>
			</Popover.Trigger>
			<Popover.Content class="w-[220px] p-0" align="start">
				<div class="multi-select-list">
					{#each products as p}
						<button
							class="multi-select-item"
							on:click={() => toggleProduct(p.id)}
						>
							<span class="check-icon" class:visible={selectedProducts.has(p.id)}>
								<Check class="h-3.5 w-3.5" />
							</span>
							{p.name}
						</button>
					{/each}
				</div>
			</Popover.Content>
		</Popover.Root>
	</div>

	<div class="filter-group">
		<Label class="filter-label">Delivered</Label>
		<Select.Root
			onSelectedChange={(e) => {
				deliveredFilter = e?.value === 'all' ? '' : (String(e?.value) || '');
			}}
			selected={deliveredFilter ? { value: deliveredFilter, label: deliveredFilter === 'yes' ? 'Yes' : 'No' } : { value: 'all', label: 'All' }}
		>
			<Select.Trigger class="w-[120px]">
				<Select.Value placeholder="All" />
			</Select.Trigger>
			<Select.Content>
				<Select.Item value="all">All</Select.Item>
				<Select.Item value="yes">Yes</Select.Item>
				<Select.Item value="no">No</Select.Item>
			</Select.Content>
		</Select.Root>
	</div>

	<div class="filter-group">
		<Label class="filter-label">Amount (VND)</Label>
		<div class="amount-range">
			<Input type="number" inputmode="numeric" bind:value={amountMin} placeholder="Min" class="w-[100px]" />
			<span>-</span>
			<Input type="number" inputmode="numeric" bind:value={amountMax} placeholder="Max" class="w-[100px]" />
		</div>
	</div>

	<div class="filter-group">
		<Label class="filter-label">Search</Label>
		<form class="search-form" on:submit|preventDefault={fetchOrders}>
			<Input bind:value={searchQuery} placeholder="Name or ID..." class="w-[180px]" />
			<Button type="submit" variant="outline" size="sm">Search</Button>
		</form>
	</div>

	<div class="filter-group export-group">
		<Button variant="outline" on:click={exportCSV}>
			<Download class="mr-2 h-4 w-4" />
			Export CSV
		</Button>
	</div>
</div>

<Table.Root>
	<Table.Caption>Showing {filteredOrders.length} of {allOrders.length} orders</Table.Caption>
	<Table.Header>
		<Table.Row>
			<Table.Head class="w-[100px]">ID</Table.Head>
			<Table.Head class="w-[100px]">State</Table.Head>
			<Table.Head class="w-[130px]">Method</Table.Head>
			<Table.Head>Product</Table.Head>
			<Table.Head>Recipient</Table.Head>
			<Table.Head>Phone</Table.Head>
			<Table.Head>Latest Tracking</Table.Head>
			<Table.Head class="text-right">Amount</Table.Head>
			<Table.Head class="w-[80px]">Delivered</Table.Head>
			<Table.Head class="w-[140px]">Date</Table.Head>
			<Table.Head class="w-[200px]">Actions</Table.Head>
		</Table.Row>
	</Table.Header>
	<Table.Body>
		{#each filteredOrders as order}
			<Table.Row>
				<Table.Cell class="font-medium">
					<a href={`/orders/${order.id}`} class="link">{order.id}</a>
				</Table.Cell>
				<Table.Cell>
					<span style={stateColor(order.state)}>{order.state}</span>
				</Table.Cell>
				<Table.Cell>{order.paymentMethod}</Table.Cell>
				<Table.Cell>{getOrderProductNames(order)}</Table.Cell>
				<Table.Cell>{order.recipientName || '-'}</Table.Cell>
				<Table.Cell>{order.phone || '-'}</Table.Cell>
				<Table.Cell>
					{order.orderTracking?.[0]?.content || 'N/a'}
				</Table.Cell>
				<Table.Cell class="text-right">
					{vndFormat.format(order.amount + order.fee)}
				</Table.Cell>
				<Table.Cell>
					{#if order.delivered}
						<span style="color: #22c55e">Yes</span>
					{:else}
						<span style="color: #6b7280">No</span>
					{/if}
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
		gap: 1rem;
		align-items: flex-end;
		margin-bottom: 1.5rem;
	}

	.filter-group {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	:global(.filter-label) {
		font-size: 0.75rem;
		color: hsl(var(--muted-foreground));
	}

	.chip-group {
		display: flex;
		gap: 0.25rem;

	}

	.chip {
		padding: 0.25rem 0.625rem;
		border: 1px solid rgba(255, 255, 255, 0.15);
		border-radius: 9999px;
		background: transparent;
		cursor: pointer;
		font-size: 0.8rem;
		transition: all 0.15s;

		&:hover {
			background: rgba(255, 255, 255, 0.05);
		}

		&.active {
			background: rgba(255, 255, 255, 0.12);
			border-color: rgba(255, 255, 255, 0.4);
		}
	}

	.amount-range {
		display: flex;
		gap: 0.25rem;
		align-items: center;
	}

	.search-form {
		display: flex;
		gap: 0.5rem;
		align-items: center;
	}

	.export-group {
		justify-content: flex-end;
		margin-left: auto;
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

	.multi-select-trigger {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		height: 2.25rem;
		padding: 0 0.75rem;
		border: 1px solid rgba(255, 255, 255, 0.15);
		border-radius: 0.375rem;
		background: transparent;
		font-size: 0.875rem;
		cursor: pointer;
		white-space: nowrap;

		&:hover {
			background: rgba(255, 255, 255, 0.05);
		}
	}

	.multi-select-list {
		display: flex;
		flex-direction: column;
		padding: 0.25rem;
		max-height: 240px;
		overflow-y: auto;
	}

	.multi-select-item {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.375rem 0.5rem;
		border: none;
		background: transparent;
		cursor: pointer;
		font-size: 0.875rem;
		border-radius: 0.25rem;
		text-align: left;

		&:hover {
			background: rgba(255, 255, 255, 0.08);
		}
	}

	.check-icon {
		width: 0.875rem;
		opacity: 0;

		&.visible {
			opacity: 1;
		}
	}
</style>
