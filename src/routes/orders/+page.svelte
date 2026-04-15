<script lang="ts">
	import Title from '$lib/components/Title.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Input } from '$lib/components/ui/input';
	import * as Card from '$lib/components/ui/card';
	import * as Select from '$lib/components/ui/select';
	import { user } from '$lib/client';
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import PlayerHoverCard from '$lib/components/playerLink.svelte';
	import { _ } from 'svelte-i18n';
	import ChevronLeft from 'lucide-svelte/icons/chevron-left';
	import ChevronRight from 'lucide-svelte/icons/chevron-right';
	import RotateCcw from 'lucide-svelte/icons/rotate-ccw';
	import ShoppingBag from 'lucide-svelte/icons/shopping-bag';
	import { goto } from '$app/navigation';

	let orders: any[] = [];
	let loading = false;

	const PAGE_SIZE = 10;
	let currentPage = 0;

	let stateFilter = '';
	let deliveredFilter = '';
	let searchQuery = '';

	const dateFormat = new Intl.DateTimeFormat('vi-VN', {
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit'
	});

	const stateOptions = [
		{ value: '', label: 'Tất cả trạng thái' },
		{ value: 'PENDING', label: 'Chờ thanh toán' },
		{ value: 'PAID', label: 'Đã thanh toán' },
		{ value: 'CANCELLED', label: 'Đã huỷ' },
		{ value: 'EXPIRED', label: 'Hết hạn' }
	];

	const deliveredOptions = [
		{ value: '', label: 'Tất cả' },
		{ value: 'yes', label: 'Đã giao' },
		{ value: 'no', label: 'Chưa giao' }
	];

	$: filteredOrders = orders.filter((order) => {
		if (stateFilter && order.state !== stateFilter) return false;
		if (deliveredFilter === 'yes' && !order.delivered) return false;
		if (deliveredFilter === 'no' && order.delivered) return false;
		if (searchQuery) {
			const id = String(order.id);
			const product = getProductName(order).toLowerCase();
			if (!id.includes(searchQuery) && !product.includes(searchQuery.toLowerCase())) return false;
		}
		return true;
	});

	$: {
		stateFilter, deliveredFilter, searchQuery;
		currentPage = 0;
	}

	$: pagedOrders = filteredOrders.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);
	$: maxPage = Math.ceil(filteredOrders.length / PAGE_SIZE);
	$: showPagination = filteredOrders.length > PAGE_SIZE;

	function getProductName(order: any): string {
		if (order.productID) return order.products?.name ?? '';
		if (order.recordCards?.length > 0) return `Store Items (${order.recordCards.length} Thẻ Bản Ghi)`;
		return $_('orders.store_items');
	}

	function getStateBadgeVariant(state: string): 'default' | 'secondary' | 'destructive' | 'outline' {
		switch (state) {
			case 'PAID': return 'default';
			case 'PENDING': return 'outline';
			case 'CANCELLED': return 'destructive';
			case 'EXPIRED': return 'secondary';
			default: return 'outline';
		}
	}

	function getStateLabel(state: string): string {
		return stateOptions.find((o) => o.value === state)?.label ?? state;
	}

	async function getOrders() {
		loading = true;
		orders = await (
			await fetch(`${import.meta.env.VITE_API_URL}/orders`, {
				method: 'GET',
				headers: {
					Authorization: 'Bearer ' + (await $user.token()),
					'Content-Type': 'application/json'
				}
			})
		).json();
		loading = false;
	}

	async function restore(order: any) {
		toast.loading($_('toast.order_restore'));
		window.location.href = `${import.meta.env.VITE_API_URL}/payment/success?orderCode=${order.id}`;
	}

	function restorable(order: any) {
		if (!order.quantity) {
			return !(order.state == 'PENDING' && order.paymentMethod == 'Bank Transfer');
		}
		return order.state == 'CANCELLED' || order.state == 'EXPIRED' || order.delivered;
	}

	function resetFilters() {
		stateFilter = '';
		deliveredFilter = '';
		searchQuery = '';
	}

	onMount(() => {
		getOrders();
	});
</script>

<svelte:head>
	<title>Đơn hàng - Geometry Dash Việt Nam</title>
</svelte:head>

{#if $user.loggedIn}
	<Title value={$_('orders.title')} />
	<div class="px-[10px] lg:px-[70px]">

		<!-- Filter bar -->
		<div class="mb-4 flex flex-wrap items-center gap-2">
			<Input
				class="h-9 w-[200px]"
				placeholder="Tìm theo mã / sản phẩm..."
				bind:value={searchQuery}
			/>

			<Select.Root
				selected={stateOptions.find((o) => o.value === stateFilter)}
				onSelectedChange={(v) => { stateFilter = v?.value ?? ''; }}
			>
				<Select.Trigger class="h-9 w-[180px]">
					<Select.Value placeholder="Trạng thái" />
				</Select.Trigger>
				<Select.Content>
					{#each stateOptions as opt}
						<Select.Item value={opt.value}>{opt.label}</Select.Item>
					{/each}
				</Select.Content>
			</Select.Root>

			<Select.Root
				selected={deliveredOptions.find((o) => o.value === deliveredFilter)}
				onSelectedChange={(v) => { deliveredFilter = v?.value ?? ''; }}
			>
				<Select.Trigger class="h-9 w-[140px]">
					<Select.Value placeholder="Giao hàng" />
				</Select.Trigger>
				<Select.Content>
					{#each deliveredOptions as opt}
						<Select.Item value={opt.value}>{opt.label}</Select.Item>
					{/each}
				</Select.Content>
			</Select.Root>

			{#if stateFilter || deliveredFilter || searchQuery}
				<Button variant="ghost" size="sm" on:click={resetFilters}>
					<RotateCcw class="mr-1 h-3.5 w-3.5" />
					Xoá bộ lọc
				</Button>
			{/if}

			<span class="ml-auto text-sm text-muted-foreground">
				{filteredOrders.length} đơn hàng
			</span>
		</div>

		<!-- Cards -->
		<div class="flex flex-col gap-3">
			{#if loading}
				<div class="py-10 text-center text-muted-foreground">Đang tải...</div>
			{:else if pagedOrders.length === 0}
				<div class="py-10 text-center">
					<div class="flex flex-col items-center gap-2 text-muted-foreground">
						<ShoppingBag class="h-8 w-8 opacity-40" />
						<span>Không có đơn hàng nào</span>
					</div>
				</div>
			{:else}
				{#each pagedOrders as order}
					<Card.Root class="overflow-hidden transition-shadow hover:shadow-md rounded-xl">
						<!-- Header -->
						<div class="flex flex-wrap items-center gap-2 bg-muted/40 px-5 py-3 border-b">
							<span class="font-mono text-xs text-muted-foreground">#{order.id}</span>
							<span class="text-muted-foreground/40 text-xs">·</span>
							<span class="text-xs text-muted-foreground whitespace-nowrap">
								{dateFormat.format(new Date(order.created_at))}
							</span>
							<div class="ml-auto flex flex-wrap gap-1">
								<Badge variant={getStateBadgeVariant(order.state)}>
									{getStateLabel(order.state)}
								</Badge>
								{#if order.delivered}
									<Badge variant="default" class="bg-green-600 hover:bg-green-600/80">Đã giao</Badge>
								{/if}
							</div>
						</div>

						<!-- Content -->
						<Card.Content class="px-5 py-4">
							<p class="font-medium text-base mb-2 truncate">{getProductName(order)}</p>
							<div class="flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
								<span><span class="text-foreground/60">Số lượng:</span> {order.quantity ?? '?'}</span>
								<span>
									<span class="text-foreground/60">Tổng tiền:</span>
									{new Intl.NumberFormat('vi-VN', {
										style: 'currency',
										currency: order.currency
									}).format(order.amount + order.fee)}
								</span>
								<span class="flex items-center gap-1">
									<span class="text-foreground/60">{$_('orders.recipient')}:</span>
									{#if order.giftTo}
										<PlayerHoverCard player={order.players} />
									{:else}
										<PlayerHoverCard player={$user.data} />
									{/if}
								</span>
							</div>
						</Card.Content>

						<!-- Footer -->
						<Card.Footer class="border-t px-5 py-3 flex justify-end gap-2">
							<Button
								variant="secondary"
								size="sm"
								on:click={() => restore(order)}
								disabled={restorable(order)}
							>{$_('orders.restore')}</Button>
							<Button variant="secondary" size="sm" on:click={() => goto(`/orders/${order.id}`)}>
								{$_('orders.detail')}
							</Button>
						</Card.Footer>
					</Card.Root>
				{/each}
			{/if}
		</div>

		<!-- Pagination -->
		{#if showPagination}
			<div class="mt-4 flex items-center justify-between">
				<span class="text-sm text-muted-foreground">
					{currentPage * PAGE_SIZE + 1}–{Math.min((currentPage + 1) * PAGE_SIZE, filteredOrders.length)} / {filteredOrders.length}
				</span>
				<div class="flex items-center gap-1">
					<Button
						variant="outline"
						size="sm"
						disabled={currentPage === 0}
						on:click={() => currentPage--}
					>
						<ChevronLeft class="h-4 w-4" />
					</Button>
					{#each Array.from({ length: maxPage }, (_, i) => i) as p}
						{#if maxPage <= 7 || p === 0 || p === maxPage - 1 || Math.abs(p - currentPage) <= 1}
							<Button
								variant={p === currentPage ? 'outline' : 'ghost'}
								size="sm"
								class="min-w-[32px]"
								on:click={() => currentPage = p}
							>{p + 1}</Button>
						{:else if Math.abs(p - currentPage) === 2}
							<span class="px-1 text-muted-foreground">…</span>
						{/if}
					{/each}
					<Button
						variant="outline"
						size="sm"
						disabled={currentPage >= maxPage - 1}
						on:click={() => currentPage++}
					>
						<ChevronRight class="h-4 w-4" />
					</Button>
				</div>
			</div>
		{/if}

	</div>
{/if}
