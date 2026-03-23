<script lang="ts">
	import { user } from '$lib/client';
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import * as Dialog from '$lib/components/ui/dialog';
	import * as Table from '$lib/components/ui/table';
	import Button from '$lib/components/ui/button/button.svelte';
	import { Badge } from '$lib/components/ui/badge';
	import CardPreview from '../vending/CardPreview.svelte';
	import CardBack from '../vending/CardBack.svelte';
	import { Printer, Eye, Check } from 'lucide-svelte';

	let cards: any[] = [];
	let loading = true;
	let selectedCard: any | null = null;
	let viewDialogOpen = false;

	const TEMPLATE_NAMES: Record<number, string> = {
		1: 'Tối',
		2: 'Sáng',
		3: 'Vàng'
	};

	onMount(async () => {
		await loadCards();
	});

	async function loadCards() {
		loading = true;
		try {
			const res = await fetch(`${import.meta.env.VITE_API_URL}/merchant/record-cards`, {
				headers: { Authorization: `Bearer ${await $user.token()}` }
			});
			if (!res.ok) throw new Error();
			cards = await res.json();
		} catch {
			toast.error('Không thể tải danh sách thẻ bản ghi');
		} finally {
			loading = false;
		}
	}

	type TemplateId = 1 | 2 | 3;

	function openView(card: any) {
		selectedCard = card;
		viewDialogOpen = true;
	}

	$: selectedTemplate = (selectedCard?.template ?? 1) as TemplateId;

	async function markPrinted(card: any) {
		try {
			const res = await fetch(
				`${import.meta.env.VITE_API_URL}/merchant/record-cards/${card.id}/printed`,
				{
					method: 'PATCH',
					headers: { Authorization: `Bearer ${await $user.token()}` }
				}
			);
			if (!res.ok) throw new Error();
			cards = cards.map((c) => (c.id === card.id ? { ...c, printed: true } : c));
			toast.success('Đã cập nhật trạng thái in');
		} catch {
			toast.error('Không thể cập nhật trạng thái');
		}
	}

	function printCard(card: any) {
		selectedCard = card;
		// Let Svelte render then trigger print
		setTimeout(() => {
			document.body.classList.add('printing-record-card');
			window.print();
			window.addEventListener(
				'afterprint',
				() => {
					document.body.classList.remove('printing-record-card');
				},
				{ once: true }
			);
		}, 100);
	}

	$: bgImage = (card: any) => {
		if (card?.img) return card.img;
		if (card?.level?.videoID)
			return `https://img.youtube.com/vi/${card.level.videoID}/maxresdefault.jpg`;
		return '';
	};
</script>

<!-- Print area (hidden except during print) -->
<div id="record-card-print-area" style="display:none;">
	{#if selectedCard}
		<div class="print-card-front">
			<CardPreview
				playerUID={selectedCard.players?.uid ?? ''}
				playerName={selectedCard.players?.name ?? ''}
				levelName={selectedCard.level?.name ?? ''}
				bgImage={bgImage(selectedCard)}
				template={selectedTemplate}
				size="full"
			/>
		</div>
		<div class="print-card-back" style="page-break-before: always;">
			<CardBack cardID={selectedCard.id} />
		</div>
	{/if}
</div>

<div class="tab-wrap">
	<div class="tab-header">
		<h3>Thẻ Bản Ghi</h3>
		<Button variant="outline" on:click={loadCards} size="sm">Làm mới</Button>
	</div>

	{#if loading}
		<div class="loading-state">Đang tải...</div>
	{:else if cards.length === 0}
		<div class="empty-state">Chưa có đơn hàng thẻ bản ghi nào.</div>
	{:else}
		<div class="table-wrap">
			<Table.Root>
				<Table.Header>
					<Table.Row>
						<Table.Head>Người chơi</Table.Head>
						<Table.Head>Level</Table.Head>
						<Table.Head>Chất liệu</Table.Head>
						<Table.Head>Mẫu</Table.Head>
						<Table.Head>Order ID</Table.Head>
						<Table.Head>Trạng thái</Table.Head>
						<Table.Head>Thao tác</Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#each cards as card}
						<Table.Row>
							<Table.Cell class="font-medium">{card.players?.name ?? '—'}</Table.Cell>
							<Table.Cell>{card.level?.name ?? '—'}</Table.Cell>
							<Table.Cell>
								{#if card.material === 'paper'}
									<Badge variant="secondary">Giấy</Badge>
								{:else}
									<Badge>Nhựa</Badge>
								{/if}
							</Table.Cell>
							<Table.Cell>{TEMPLATE_NAMES[card.template] ?? card.template}</Table.Cell>
							<Table.Cell class="text-xs opacity-60">{card.orderID ?? '—'}</Table.Cell>
							<Table.Cell>
								{#if card.printed}
									<span class="printed-badge">✓ Đã in</span>
								{:else}
									<span class="pending-badge">Chưa in</span>
								{/if}
							</Table.Cell>
							<Table.Cell>
								<div class="action-buttons">
									<Button variant="outline" size="sm" on:click={() => openView(card)}>
										<Eye size={14} />
										Xem
									</Button>
									<Button variant="outline" size="sm" on:click={() => printCard(card)}>
										<Printer size={14} />
										In PDF
									</Button>
									{#if !card.printed}
										<Button variant="ghost" size="sm" on:click={() => markPrinted(card)}>
											<Check size={14} />
											Đã in
										</Button>
									{/if}
								</div>
							</Table.Cell>
						</Table.Row>
					{/each}
				</Table.Body>
			</Table.Root>
		</div>
	{/if}
</div>

<!-- View dialog -->
<Dialog.Root bind:open={viewDialogOpen}>
	<Dialog.Content class="max-w-[700px]">
		<Dialog.Header>
			<Dialog.Title>Xem Thẻ Bản Ghi</Dialog.Title>
			<Dialog.Description>
				{selectedCard?.players?.name ?? ''} — {selectedCard?.level?.name ?? ''}
			</Dialog.Description>
		</Dialog.Header>

		{#if selectedCard}
			<div class="dialog-card-wrap">
				<div class="dialog-card-side">
					<p class="card-side-label">Mặt trước</p>
					<CardPreview
						playerUID={selectedCard.players?.uid ?? ''}
						playerName={selectedCard.players?.name ?? ''}
						levelName={selectedCard.level?.name ?? ''}
						bgImage={bgImage(selectedCard)}
						template={selectedTemplate}
						size="full"
					/>
				</div>
				<div class="dialog-card-side">
					<p class="card-side-label">Mặt sau</p>
					<CardBack cardID={selectedCard.id} />
				</div>
			</div>
		{/if}

		<Dialog.Footer>
			<Button variant="outline" on:click={() => printCard(selectedCard)}>
				<Printer size={14} />
				In PDF
			</Button>
			<Button on:click={() => (viewDialogOpen = false)}>Đóng</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<style lang="scss">
	.tab-wrap {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.tab-header {
		display: flex;
		align-items: center;
		justify-content: space-between;

		h3 {
			font-size: 16px;
			font-weight: 700;
			margin: 0;
		}
	}

	.loading-state,
	.empty-state {
		text-align: center;
		padding: 40px;
		opacity: 0.5;
		font-size: 14px;
	}

	.table-wrap {
		overflow-x: auto;
	}

	.action-buttons {
		display: flex;
		gap: 6px;
		flex-wrap: nowrap;
	}

	.printed-badge {
		font-size: 12px;
		color: #22c55e;
		font-weight: 600;
	}

	.pending-badge {
		font-size: 12px;
		opacity: 0.55;
	}

	.dialog-card-wrap {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 20px;
		margin-top: 8px;
	}

	.dialog-card-side {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.card-side-label {
		font-size: 12px;
		font-weight: 600;
		opacity: 0.6;
		margin: 0;
		text-align: center;
	}

	/* Print area styles */
	:global(#record-card-print-area) {
		display: none;
	}

	.print-card-front,
	.print-card-back {
		width: 85.6mm;
		height: 53.98mm;
	}

	@media screen and (max-width: 768px) {
		.dialog-card-wrap {
			grid-template-columns: 1fr;
		}
	}
</style>
