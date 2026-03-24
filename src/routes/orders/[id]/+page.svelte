<script lang="ts">
	import Title from '$lib/components/Title.svelte';
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Table from '$lib/components/ui/table/index.js';
	import Button from '$lib/components/ui/button/button.svelte';
	import PlayerHoverCard from '$lib/components/playerLink.svelte';
	import CardPreview from '../../vending/CardPreview.svelte';
	import CardBack from '../../vending/CardBack.svelte';
	import * as Dialog from '$lib/components/ui/dialog';
	import { user } from '$lib/client';
	import { toast } from 'svelte-sonner';
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import AddTrackingButton from './addTrackingButton.svelte';
	import { _ } from 'svelte-i18n';
	import { Printer, Eye, Check, RotateCw } from 'lucide-svelte';
	import * as Select from '$lib/components/ui/select';

	const CARD_SIZES = [
		{ id: 'CR80',  label: 'CR80 (85.6 × 54mm)', w: '85.6mm', h: '53.98mm' },
		{ id: '5x5',   label: '5 × 5cm',             w: '50mm',   h: '50mm'    },
		{ id: '3x8',   label: '3 × 8cm',             w: '80mm',   h: '30mm'    },
		{ id: '4x7',   label: '4 × 7cm',             w: '70mm',   h: '40mm'    },
		{ id: '5x8',   label: '5 × 8cm',             w: '80mm',   h: '50mm'    },
		{ id: '5.5x7', label: '5.5 × 7cm',           w: '70mm',   h: '55mm'    },
		{ id: '5.5x9', label: '5.5 × 9cm',           w: '90mm',   h: '55mm'    },
	] as const;
	type PrintSizeId = (typeof CARD_SIZES)[number]['id'];

	let data: any = null;
	let selectedCard: any | null = null;
	let viewDialogOpen = false;
	let selectedPrintSize: PrintSizeId = 'CR80';
	let printLandscape = true;

	$: selectedTemplate = (selectedCard?.template ?? 1) as 1 | 2 | 3;
	$: baseSize = CARD_SIZES.find((s) => s.id === selectedPrintSize) ?? CARD_SIZES[0];
	$: printWidth = printLandscape ? baseSize.w : baseSize.h;
	$: printHeight = printLandscape ? baseSize.h : baseSize.w;
	$: previewW = parseFloat(printWidth);
	$: previewH = parseFloat(printHeight);

	function bgImage(rc: any) {
		return rc?.img || `https://levelthumbs.prevter.me/thumbnail/${rc?.levelID}/high`;
	}

	function openView(rc: any) {
		selectedCard = rc;
		viewDialogOpen = true;
	}

	async function markPrinted(rc: any) {
		try {
			const res = await fetch(
				`${import.meta.env.VITE_API_URL}/merchant/record-cards/${rc.id}/printed`,
				{
					method: 'PATCH',
					headers: { Authorization: `Bearer ${await $user.token()}` }
				}
			);
			if (!res.ok) throw new Error();
			data.record_cards = data.record_cards.map((c: any) =>
				c.id === rc.id ? { ...c, printed: true } : c
			);
			toast.success('Đã cập nhật trạng thái in');
		} catch {
			toast.error('Không thể cập nhật trạng thái');
		}
	}

	function printCard(rc: any) {
		selectedCard = rc;
		setTimeout(() => {
			const el = document.getElementById('record-card-print-area');
			if (!el) return;
			const parent = el.parentNode;
			const next = el.nextSibling;

			document.body.appendChild(el);
			document.body.classList.add('printing-record-card');
			window.print();

			window.addEventListener(
				'afterprint',
				() => {
					document.body.classList.remove('printing-record-card');
					if (parent) parent.insertBefore(el, next);
				},
				{ once: true }
			);
		}, 100);
	}

	function cancellable() {
		if (data.state == 'CANCELLED' || data.paymentMethod == 'Bank Transfer') {
			return false;
		}

		for (const i of data.orderTracking) {
			if (i.delivering) {
				return false;
			}
		}

		return true;
	}

	function cancel() {
		if (!confirm($_('orders.cancel.confirm'))) {
			return;
		}

		toast.loading($_('orders.cancel.loading'));
		window.location.href = `${import.meta.env.VITE_API_URL}/payment/cancelled?orderCode=${data.id}`;
	}

	async function fetchData() {
		data = await (
			await fetch(`${import.meta.env.VITE_API_URL}/orders/${page.params.id}`, {
				method: 'GET',
				headers: {
					Authorization: 'Bearer ' + (await $user.token())
				}
			})
		).json();

		data.orderTracking.push({
			created_at: data.created_at,
			content: 'Order created'
		});
	}

	onMount(async () => {
		user.subscribe(async (currentUser) => {
			if (currentUser) {
				await fetchData();
			}
		});

		await fetchData();
	});
</script>

<!-- Print area (hidden except during print) -->
<div id="record-card-print-area">
	{#if selectedCard && data}
		<div class="print-card-front" style="width:{printWidth}; height:{printHeight};">
			<CardPreview
				data={{
					playerUID: data.userID,
					playerName: data.players?.name ?? 'Player',
					clanTag: data.players?.clans?.tag ?? null,
					clanTagBg: data.players?.clans?.tagBgColor ?? null,
					clanTagText: data.players?.clans?.tagTextColor ?? null,
					levelName: selectedCard.levels?.name || `Level #${selectedCard.levelID}`,
					creator: selectedCard.levels?.creator || '',
					progress: selectedCard.records?.progress ?? null,
					bgImage: bgImage(selectedCard),
					avatarImage: selectedCard.avatar || `https://cdn.gdvn.net/avatars/${data.userID}.jpg`,
					template: selectedCard.template
				}}
				size="full"
				fillContainer={true}
			/>
		</div>
		<div class="print-card-back" style="width:{printWidth}; height:{printHeight}; page-break-before: always;">
			<CardBack cardID={selectedCard.id} fillContainer={true} />
		</div>
	{/if}
</div>

<svelte:head>
	<title>Chi tiết đơn hàng - Geometry Dash Việt Nam</title>
</svelte:head>

<Title value={$_('order_detail.title')} />

{#if data}
	<div
		class="mb-[50px] ml-auto mr-auto mt-[30px] flex w-[800px] max-w-full flex-col gap-[10px] pl-[15px] pr-[15px]"
	>
		<Card.Root class="w-full">
			<Card.Header>
				<Card.Title>{$_('order_detail.detail')}</Card.Title>
			</Card.Header>
			<Card.Content>
				{#if $user.loggedIn && $user.data.isAdmin}
					<a href={`/player/${data.userID}`}>{$_('order_detail.player')}</a>
				{/if}
				<p>{$_('order_detail.order_id')}: {data.id}</p>
				<p>{$_('order_detail.payment_status')}: <b>{data.state}</b></p>
				<p>{$_('order_detail.payment_method')}: {data.paymentMethod}</p>
				{#if !data.productID}
					<div class="flex gap-[10px]">
						<p>{$_('order_detail.shipping_info')}:</p>
						<div>
							<p>{data.recipientName}</p>
							<p>{data.address}</p>
							<p>+84 {data.phone}</p>
						</div>
					</div>
				{:else}
					<div class="flex gap-[5px]">
						{$_('order_detail.recipient')}:
						{#if data.giftTo}
							<PlayerHoverCard player={data.players} />
						{:else}
							<PlayerHoverCard player={$user.data} />
						{/if}
					</div>
				{/if}
			</Card.Content>
		</Card.Root>
		<Card.Root class="w-full">
			<Card.Header>
				<Card.Title>{$_('order_detail.items')}</Card.Title>
			</Card.Header>
			<Card.Content>
				<Table.Root>
					<Table.Body>
						{#each data.orderItems as item}
							<Table.Row>
								<div class="border-box flex gap-[10px] p-[10px]">
									<a href={`/store/product/${item.productID}`}>
										<img
											class="h-[65px] w-[65px] rounded-lg object-cover"
											src={`https://cdn.gdvn.net/products/${item.productID}/0.webp`}
											alt="product"
										/>
									</a>
									<div>
										<a href={`/store/product/${item.productID}`}>
											<h3 class="text-lg font-semibold">
												{item.products.name}
											</h3>
										</a>
										<p>
											{$_('order_detail.qty')}: {item.quantity}
										</p>
									</div>
									<div class="ml-auto flex items-center">
										{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(
											item.quantity * item.products.price
										)}
									</div>
								</div>
							</Table.Row>
						{/each}
						{#if data.record_cards}
							{#each data.record_cards as rc}
								<Table.Row>
									<div class="border-box flex gap-[10px] p-[10px]">
										<div class="w-[200px]">
											<CardPreview
												data={{
													playerUID: data.userID,
													playerName: data.players?.name ?? 'Player',
													clanTag: data.players?.clans?.tag ?? null,
													clanTagBg: data.players?.clans?.tagBgColor ?? null,
													clanTagText: data.players?.clans?.tagTextColor ?? null,
													levelName: rc.levels?.name || `Level #${rc.levelID}`,
													creator: rc.levels?.creator || '',
													progress: rc.records?.progress ?? null,
													bgImage: rc.img || `https://levelthumbs.prevter.me/thumbnail/${rc.levelID}/high`,
													avatarImage: rc.avatar || `https://cdn.gdvn.net/avatars/${data.userID}.jpg`,
													template: rc.template
												}}
												size="mini"
											/>
										</div>
										<div>
											<h3 class="text-lg font-semibold">
												Thẻ Bản Ghi
											</h3>
											<p>
												Chất liệu: {rc.material === 'paper' ? 'Giấy' : 'Nhựa'}
											</p>
											<p>
												{$_('order_detail.qty')}: 1
											</p>
										</div>
										<div class="ml-auto flex items-center">
											{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(
												rc.material === 'paper' ? 29000 : 149000
											)}
										</div>
									</div>
									{#if $user.loggedIn && $user.data.isManager}
										<div class="flex flex-wrap items-center gap-2 px-[10px] pb-[10px]">
											{#if rc.printed}
												<span class="text-xs font-semibold text-green-500">✓ Đã in</span>
											{:else}
												<span class="text-xs opacity-55">Chưa in</span>
											{/if}
											<Button variant="outline" size="sm" on:click={() => openView(rc)}>
												<Eye size={14} />
												Xem
											</Button>
											{#if !rc.printed}
												<Button variant="ghost" size="sm" on:click={() => markPrinted(rc)}>
													<Check size={14} />
													Đã in
												</Button>
											{/if}
										</div>
									{/if}
								</Table.Row>
							{/each}
						{/if}
					</Table.Body>
				</Table.Root>
				<div class="mt-[15px]">
					<div class="flex">
						<p>{$_('order_detail.subtotal')}</p>
						<p class="ml-auto">
							<b>
								{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(
									data.amount
								)}
							</b>
						</p>
					</div>
					{#if !data.productID}
						<div class="flex">
							<p>{$_('order_detail.shipping_fee')}</p>
							<p class="ml-auto">
								<b>
									{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(
										data.fee
									)}
								</b>
							</p>
						</div>
					{/if}
					<div class="mt-[10px] flex">
						<p class="text-lg">
							<b>{$_('order_detail.total')}</b>
						</p>
						<p class="ml-auto text-lg">
							<b>
								{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(
									data.amount + data.fee
								)}
							</b>
						</p>
					</div>
				</div>
			</Card.Content>
		</Card.Root>
		{#if !data.productID}
			<Card.Root class="w-full">
				<Card.Header>
					<Card.Title>{$_('order_detail.tracking')}</Card.Title>
				</Card.Header>
				<Card.Content>
					{#if $user.loggedIn && $user.data.isAdmin}
						<div class="mb-[10px]">
							<AddTrackingButton order={data} />
						</div>
					{/if}
					{#if data.orderTracking && data.orderTracking.length > 0}
						{#each data.orderTracking as item, i}
							<div class="relative flex">
								<div class="mr-4 flex flex-col items-center">
									<div class="h-4 w-4 rounded-full bg-gray-400 dark:bg-gray-600"></div>
									{#if i !== data.orderTracking.length - 1}
										<div class=" absolute my-1 h-full w-[2px] bg-gray-400 dark:bg-gray-600"></div>
									{/if}
								</div>
								<div class="flex-1 pb-4">
									<p class="text-sm text-muted-foreground">
										{new Date(item.created_at).toLocaleDateString('vi-VN')} -
										{new Date(item.created_at).toLocaleTimeString('vi-VN')}
									</p>
									{#if item.link}
										<a href={item.link}>
											<p>{item.content}</p>
										</a>
									{:else}
										<p>{item.content}</p>
									{/if}
								</div>
							</div>
						{/each}
					{:else}
						<p class="italic text-muted-foreground">{$_('order_detail.no_tracking')}</p>
					{/if}
				</Card.Content>
			</Card.Root>
		{/if}
		<Button class="ml-auto w-fit" variant="destructive" disabled={!cancellable()} on:click={cancel}>
			{$_('order_detail.cancel_order')}
		</Button>
		<div class="mt-[25px] text-sm text-gray-400">
			<p>{$_('order_detail.note.title')}</p>
			<ul>
				<li>{$_('order_detail.note.delivery')}</li>
				<li>{$_('order_detail.note.prepaid')}</li>
				<li>{$_('order_detail.note.contact')}</li>
			</ul>
		</div>
	</div>
{/if}

<!-- Manager: View card dialog -->
<Dialog.Root bind:open={viewDialogOpen}>
	<Dialog.Content class="max-w-[700px]">
		<Dialog.Header>
			<Dialog.Title>Xem Thẻ Bản Ghi</Dialog.Title>
			<Dialog.Description>
				{data?.players?.name ?? ''} — {selectedCard?.levels?.name ?? ''}
			</Dialog.Description>
		</Dialog.Header>

		{#if selectedCard && data}
			<div class="mt-2 overflow-x-auto">
				<div style="display:flex; gap:24px; width:max-content; min-width:100%; justify-content:center; margin:auto;">
					<div class="flex flex-col items-center gap-1.5">
						<p class="text-center text-xs font-semibold opacity-60">Mặt trước</p>
						<div
							style="height:180px; aspect-ratio:{previewW}/{previewH}; overflow:hidden; border:1px solid hsl(var(--border)); border-radius:6px;"
						>
							<CardPreview
								data={{
									playerUID: data.userID,
									playerName: data.players?.name ?? 'Player',
									clanTag: data.players?.clans?.tag ?? null,
									clanTagBg: data.players?.clans?.tagBgColor ?? null,
									clanTagText: data.players?.clans?.tagTextColor ?? null,
									levelName: selectedCard.levels?.name || `Level #${selectedCard.levelID}`,
									creator: selectedCard.levels?.creator || '',
									progress: selectedCard.records?.progress ?? null,
									bgImage: bgImage(selectedCard),
									avatarImage:
										selectedCard.avatar || `https://cdn.gdvn.net/avatars/${data.userID}.jpg`,
									template: selectedCard.template
								}}
								size="full"
								fillContainer={true}
							/>
						</div>
					</div>
					<div class="flex flex-col items-center gap-1.5">
						<p class="text-center text-xs font-semibold opacity-60">Mặt sau</p>
						<div
							style="height:180px; aspect-ratio:{previewW}/{previewH}; overflow:hidden; border:1px solid hsl(var(--border)); border-radius:6px;"
						>
							<CardBack cardID={selectedCard.id} fillContainer={true} />
						</div>
					</div>
				</div>
			</div>
		{/if}

		<Dialog.Footer>
			<div class="mr-auto flex items-center gap-2">
				<span class="text-sm text-muted-foreground">Kích thước:</span>
				<Select.Root
					selected={{ value: selectedPrintSize, label: CARD_SIZES.find((s) => s.id === selectedPrintSize)?.label }}
					onSelectedChange={(v) => { if (v) selectedPrintSize = v.value; }}
				>
					<Select.Trigger class="w-[160px]">
						<Select.Value />
					</Select.Trigger>
					<Select.Content>
						{#each CARD_SIZES as size}
							<Select.Item value={size.id}>{size.label}</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>
				<Button
					variant="outline"
					size="icon"
					title={printLandscape ? 'Landscape' : 'Portrait'}
					on:click={() => (printLandscape = !printLandscape)}
				>
					<RotateCw size={14} class={printLandscape ? '' : 'rotate-90'} />
				</Button>
			</div>
			<Button variant="outline" on:click={() => printCard(selectedCard)}>
				<Printer size={14} />
				In PDF
			</Button>
			<Button on:click={() => (viewDialogOpen = false)}>Đóng</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<style>
	:global(#record-card-print-area) {
		position: fixed;
		left: -9999px;
		opacity: 0;
		pointer-events: none;
	}

	@media print {
		:global(#record-card-print-area .card-wrap),
		:global(#record-card-print-area .card-back) {
			border-radius: 0 !important;
		}
	}


</style>
