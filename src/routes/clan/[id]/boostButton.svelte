<script lang="ts">
	import * as sdk from '$lib/client/sdk';
	import { buttonVariants } from '$lib/components/ui/button';
	import { user } from '$lib/client';
	import * as Dialog from '$lib/components/ui/dialog';
	import { toast } from 'svelte-sonner';
	import { Button } from '$lib/components/ui/button';
	import { Slider } from '$lib/components/ui/slider';
	import { _ } from 'svelte-i18n';

	export let data: any;
	export let disabled = false;

	let state = 0;
	let nextState = 0;
	let quantity = [1];
	let fetchState: number = 0;

	function reset() {
		state = 0;
		nextState = 0;
		quantity = [1];
		fetchState = 0;
	}

	async function purchase() {
		toast.loading($_('toast.payment.redirect'));

		const res: any = await (
			await fetch(
				sdk.url(
					`/payment/getPaymentLink/3/${quantity[0]}${data.id ? `?targetClanID=${data.id}` : ''}`
				),
				{
					method: 'POST',
					headers: {
						Authorization: 'Bearer ' + (await $user.token()),
						'Content-Type': 'application/json'
					}
				}
			)
		).json();

		window.location.href = res.checkoutUrl;
	}

	function formatPrice(x: number) {
		return x.toLocaleString('vi-VN');
	}
</script>

<Dialog.Root>
	<Dialog.Trigger disabled={!$user.loggedIn} on:click={reset} class="w-full">
		<Button
			variant="outline"
			class="w-full border-yellow-300  bg-yellow-500 text-white  hover:bg-yellow-600 hover:text-white dark:bg-yellow-700 hover:dark:bg-yellow-600"
			{disabled}
		>
			{$_('clan.boost.title')}
		</Button>
	</Dialog.Trigger>
	<Dialog.Content>
		{#if state == 0}
			<Dialog.Header>
				<Dialog.Title>{$_('clan.boost.quantity')}</Dialog.Title>
			</Dialog.Header>
			<div>
				<p>
					{formatPrice(5000 * quantity[0])}₫/{quantity[0]}
					{$_(quantity[0] <= 1 ? 'clan.boost.days' : 'clan.boost.days_plural')}
				</p>
				<Slider bind:value={quantity} max={30} step={1} />
			</div>
			<Dialog.Footer>
				<Button
					disabled={!quantity[0]}
					on:click={() => {
						state = 1;
					}}>Next</Button
				>
			</Dialog.Footer>
		{:else if state == 1}
			<Dialog.Header>
				<Dialog.Title>{$_('clan.boost.review')}</Dialog.Title>
			</Dialog.Header>
			<div class="flex text-sm">
				<p>
					Clan Boost ({quantity[0]}
					{$_(quantity[0] > 1 ? 'clan.boost.days_plural' : 'clan.boost.days')})
				</p>
				<p class="ml-auto"><b>{formatPrice(5000 * quantity[0])}₫</b></p>
			</div>
			<hr />
			<div class="flex text-sm">
				<p>{$_('clan.boost.recipent_clan')}</p>
				<p class="ml-auto">
					<b>
						[{data.tag}] {data.name}
					</b>
				</p>
			</div>
			<p class="text-sm italic text-gray-500">
				{$_('clan.boost.caution')}
			</p>
			<Dialog.Footer>
				<Button on:click={purchase}>{$_('clan.boost.proceed')}</Button>
			</Dialog.Footer>
		{/if}
	</Dialog.Content>
</Dialog.Root>
