<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { cart } from '$lib/client/cart';
	import { user } from '$lib/client/user';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import Label from '$lib/components/ui/label/label.svelte';
	import { Input } from '$lib/components/ui/input/index.js';
	import { toast } from 'svelte-sonner';
	import { _ } from 'svelte-i18n';

	export let items: any[];

	const PAPER_CARD_PRODUCT_ID = 8;
	const PLASTIC_CARD_PRODUCT_ID = 9;

	let paymentMethod = '';
	let recipientName = '';
	let address = '';
	let phone = '';
	let state = 0;
	let shippingFee = 0;
	let loading = false;

	function buildAllItems() {
		const productItems = $cart.items.filter((i) => i.type !== 'record-card');
		const cardItems = $cart.getRecordCards().map((rc) => ({
			productID: rc.material === 'paper' ? PAPER_CARD_PRODUCT_ID : PLASTIC_CARD_PRODUCT_ID,
			quantity: 1
		}));
		return [...productItems, ...cardItems];
	}

	async function attachRecordCards(token: string | undefined, orderID: number): Promise<boolean> {
		const recordCards = $cart.getRecordCards();
		if (recordCards.length === 0) return true;

		let allSucceeded = true;
		for (const rc of recordCards) {
			const res = await fetch(`${import.meta.env.VITE_API_URL}/orders/${orderID}/record-card`, {
				method: 'POST',
				headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
				body: JSON.stringify({
					levelID: rc.levelID,
					template: rc.template,
					material: rc.material
				})
			});

			if (!res.ok) {
				const err = await res.json().catch(() => ({ message: 'Unknown error' }));
				toast.error(`Lỗi tạo thẻ bản ghi "${rc.levelName}": ${err.message}`);
				allSucceeded = false;
				continue;
			}

			const { cardID } = await res.json();

			if (rc.imgUrl && cardID) {
				fetch(`${import.meta.env.VITE_API_URL}/card/record/${cardID}/img`, {
					method: 'PATCH',
					headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
					body: JSON.stringify({ imgURL: rc.imgUrl })
				}).catch(() => {});
			}

			if (rc.avatarUrl && cardID) {
				fetch(`${import.meta.env.VITE_API_URL}/card/record/${cardID}/avatar`, {
					method: 'PATCH',
					headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
					body: JSON.stringify({ avatarURL: rc.avatarUrl })
				}).catch(() => {});
			}
		}
		return allSucceeded;
	}

	async function bankTransfer() {
		if (loading) return;
		loading = true;
		try {
			toast.loading('You will be redirected to our payment portal');

			const token = await $user.token();
			const allItems = buildAllItems();

			if (allItems.length === 0) return;

			const res = await fetch(`${import.meta.env.VITE_API_URL}/payment/getPaymentLink`, {
				method: 'POST',
				headers: {
					Authorization: 'Bearer ' + token,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					items: allItems,
					address: address,
					phone: parseInt(phone),
					recipientName: recipientName
				})
			});

			if (!res.ok) {
				const err = await res.json().catch(() => ({ message: 'Unknown error' }));
				toast.error(err.message || $_('toast.order_place.error'));
				return;
			}

			const { checkoutUrl, orderID } = await res.json();

			await attachRecordCards(token, orderID);

			$cart.clear();
			window.location.href = checkoutUrl;
		} catch {
			toast.error($_('toast.order_place.error'));
		} finally {
			loading = false;
		}
	}

	async function COD() {
		if (loading) return;
		loading = true;
		try {
			const token = await $user.token();
			const allItems = buildAllItems();

			if (allItems.length === 0) return;

			const res = await fetch(`${import.meta.env.VITE_API_URL}/orders`, {
				method: 'POST',
				headers: {
					Authorization: 'Bearer ' + token,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					items: allItems,
					address: address,
					phone: parseInt(phone),
					recipientName: recipientName
				})
			});

			if (!res.ok) {
				const err = await res.json().catch(() => ({ message: 'Unknown error' }));
				toast.error(err.message || $_('toast.order_place.error'));
				return;
			}

			const { orderID } = await res.json();

			await attachRecordCards(token, orderID);

			$cart.clear();
			toast.success($_('toast.order_place.success'));
			window.location.href = `/orders/${orderID}`;
		} catch {
			toast.error($_('toast.order_place.error'));
		} finally {
			loading = false;
		}
	}
</script>

<Dialog.Root>
	<Dialog.Trigger
		on:click={() => (state = 0)}
		class="ml-auto mr-auto w-fit"
		disabled={$cart.items.length == 0 || !($user.loggedIn && $user.data.discord)}
	>
		<Button
			class="w-[200px]"
			disabled={$cart.items.length == 0 || !($user.loggedIn && $user.data.discord)}>{$_('store.checkout.button')}</Button
		>
	</Dialog.Trigger>
	<Dialog.Content>
		{#if state == 0}
			<Dialog.Header>
				<Dialog.Title>{$_('store.checkout.payment_method.title')}</Dialog.Title>
			</Dialog.Header>
			<div class="flex flex-col gap-[5px]">
				<Button
					variant="outline"
					class={`h-[70px] justify-start ${paymentMethod == 'Bank Transfer' ? 'border-white' : ''}`}
					on:click={() => {
						paymentMethod = 'Bank Transfer';
						shippingFee = 25000;
					}}
				>
					{$_('store.checkout.payment_method.bank_transfer')}
				</Button>
				<Button
					variant="outline"
					class={`h-[70px] justify-start ${paymentMethod == 'COD' ? 'border-white' : ''}`}
					on:click={() => {
						paymentMethod = 'COD';
						shippingFee = 25000;
					}}
				>
					{$_('store.checkout.payment_method.cod')}
				</Button>
				<Dialog.Footer>
					<Button
						disabled={paymentMethod == ''}
						on:click={() => {
							state = 1;
						}}
					>
						Next
					</Button>
				</Dialog.Footer>
			</div>
		{:else if state == 1}
			<Dialog.Header>
				<Dialog.Title>{$_('store.checkout.shipping.title')}</Dialog.Title>
			</Dialog.Header>
			<div class="grid grid-cols-4 items-center gap-4">
				<Label class="text-right">{$_('store.checkout.shipping.address')}</Label>
				<Textarea
					class="col-span-3"
					placeholder={$_('store.checkout.shipping.address_placeholder')}
					bind:value={address}
				/>
			</div>
			<div class="grid grid-cols-4 items-center gap-4">
				<Label class="text-right">{$_('store.checkout.shipping.recipient_name')}</Label>
				<Input class="col-span-3" placeholder={$_('store.checkout.shipping.recipient_required')} bind:value={recipientName} />
			</div>
			<div class="grid grid-cols-4 items-center gap-4">
				<Label class="text-right">{$_('store.checkout.shipping.phone_number')}</Label>
				<div class="col-span-3 flex gap-[10px]">
					<Input class="w-[50px] disabled:opacity-100" value="+84" disabled />
					<Input bind:value={phone} type="tel" placeholder={$_('store.checkout.shipping.phone_placeholder')} />
				</div>
			</div>
			<Dialog.Footer>
				<Button
					disabled={!address || !recipientName || phone.length != 9}
					on:click={() => {
						state = 2;
					}}
				>
					Next
				</Button>
			</Dialog.Footer>
		{:else if state == 2}
			<Dialog.Header>
				<Dialog.Title>{$_('store.checkout.review.title')}</Dialog.Title>
			</Dialog.Header>
			<div class="flex flex-col gap-[10px]">
				<h3 class="font-bold">{$_('store.checkout.review.shipping_info')}</h3>
				<div class="flex text-sm">
					<p>{$_('store.checkout.review.recipient')}</p>
					<p class="ml-auto">
						<b>
							{recipientName}
						</b>
					</p>
				</div>
				<div class="flex text-sm">
					<p>{$_('store.checkout.review.shipping_address')}</p>
					<p class="ml-auto">
						{address}
					</p>
				</div>
				<div class="flex text-sm">
					<p>{$_('store.checkout.review.phone_number')}</p>
					<p class="ml-auto">
						+84 {phone.replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3')}
					</p>
				</div>
			</div>
			<hr />
			<div class="flex flex-col gap-[10px]">
				<h3 class="font-bold">{$_('store.checkout.review.items')}</h3>
				{#each items as item}
					<div class="flex text-sm">
						<p>{item.name} x{$cart.getItem(item.id).quantity}</p>
						<p class="ml-auto">
							<b>
								{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(
									$cart.getItem(item.id).quantity * item.price
								)}
							</b>
						</p>
					</div>
				{/each}
				{#each $cart.getRecordCards() as rc}
					<div class="flex text-sm">
						<p>Thẻ Bản Ghi — {rc.levelName || `Level #${rc.levelID}`} ({rc.material === 'paper' ? 'Giấy' : 'Nhựa'})</p>
						<p class="ml-auto">
							<b>
								{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(
									rc.material === 'paper' ? 29000 : 149000
								)}
							</b>
						</p>
					</div>
				{/each}
			</div>
			<hr />
			<div class="flex flex-col gap-[10px]">
				<div class="flex text-sm">
					<p>{$_('store.checkout.review.subtotal')}</p>
					<p class="ml-auto">
						<b>
							{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(
								items.reduce(
									(total, item) => total + $cart.getItem(item.id).quantity * item.price,
									0
								) +
								$cart.getRecordCards().reduce((total, rc) => total + (rc.material === 'paper' ? 29000 : 149000), 0)
							)}
						</b>
					</p>
				</div>
				<div class="flex text-sm">
					<p>{$_('store.checkout.review.shipping_fee')}</p>
					<p class="ml-auto">
						<b>
							{#if shippingFee == 0}
								{$_('store.checkout.review.free')}
							{:else}
								{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(
									shippingFee
								)}
							{/if}
						</b>
					</p>
				</div>
			</div>
			<div class="text-md flex font-bold">
				<p>{$_('store.checkout.review.total')}</p>
				<p class="ml-auto">
					<b>
						{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(
							items.reduce(
								(total, item) => total + $cart.getItem(item.id).quantity * item.price,
								0
							) +
							$cart.getRecordCards().reduce((total, rc) => total + (rc.material === 'paper' ? 29000 : 149000), 0) +
							shippingFee
						)}
					</b>
				</p>
			</div>
			<p class="text-sm italic text-gray-500">
				{#if paymentMethod == 'Bank Transfer'}
					{$_('store.checkout.review.bank_transfer_note')}
				{:else if paymentMethod == 'COD'}
					{$_('store.checkout.review.cod_note')}
				{/if}
			</p>
			<Dialog.Footer>
				{#if paymentMethod == 'Bank Transfer'}
					<Button disabled={loading} on:click={bankTransfer}>
						{loading ? 'Đang xử lý...' : $_('store.checkout.review.proceed_payment')}
					</Button>
				{:else if paymentMethod == 'COD'}
					<Button disabled={loading} on:click={COD}>
						{loading ? 'Đang xử lý...' : $_('store.checkout.review.place_order')}
					</Button>
				{/if}
			</Dialog.Footer>
		{/if}
	</Dialog.Content>
</Dialog.Root>
