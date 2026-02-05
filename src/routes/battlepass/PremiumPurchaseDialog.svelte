<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { user } from '$lib/client';
	import { toast } from 'svelte-sonner';
	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import PlayerSelector from '$lib/components/playerSelector.svelte';
	import Crown from 'lucide-svelte/icons/crown';
	import Check from 'lucide-svelte/icons/check';
	import { PREMIUM_PRICE } from '$lib/battlepass/constants';

	export let open: boolean = false;
	export let seasonTitle: string = '';
	export let seasonId: any = undefined;

	let state = 0;
	let nextState = 0;
	let giftTo: any = undefined;
	let alreadyPremium = false;
	let progressLoaded = false;

	async function loadProgress() {
		if (progressLoaded) return;
		progressLoaded = true;
		alreadyPremium = false;
		if (!$user.loggedIn || !seasonId) return;

		try {
			const res = await fetch(`${import.meta.env.VITE_API_URL}/battlepass/progress`, {
				headers: { Authorization: `Bearer ${await $user.token()}` }
			});

			if (res.ok) {
				const p = await res.json();
				alreadyPremium = !!p.isPremium;
			}
		} catch (e) {
			// ignore
		}
	}

	$: if (open) {
		state = 0;
		nextState = 0;
		giftTo = undefined;
		loadProgress();
	}

	async function purchasePremium() {
		try {
				toast.loading($_('toast.payment.redirect'));

				try {
					const res = await fetch(
						`${import.meta.env.VITE_API_URL}/payment/getPaymentLink/6/1${giftTo ? `?giftTo=${giftTo.uid}` : ''}`,
						{
							method: 'POST',
							headers: {
								Authorization: `Bearer ${await $user.token()}`,
								'Content-Type': 'application/json'
							}
						}
					);

					if (res.ok) {
						const data = await res.json();
						window.location.href = data.checkoutUrl;
					} else {
						const error = await res.text();
						toast.error(error || 'Failed to create payment link');
					}
				} catch (e) {
					toast.error('Failed to initiate purchase');
				}
		} catch (e) {
			toast.error('Failed to initiate purchase');
		}
	}

	function formatCurrency(amount: number): string {
		return new Intl.NumberFormat('vi-VN', {
			style: 'currency',
			currency: 'VND'
		}).format(amount);
	}
</script>

<Dialog.Root bind:open={open}>
	<Dialog.Content class="max-w-md">
		{#if state == 0}
			<Dialog.Header>
				<Dialog.Title>{$_('payment.recipent.title')}</Dialog.Title>
			</Dialog.Header>

			<div class="flex flex-col gap-[5px]">
				<Button
					variant="outline"
					class={`h-[70px] justify-start ${nextState == 2 ? 'border-white' : ''} ${alreadyPremium ? 'opacity-50 cursor-not-allowed' : ''}`}
					on:click={() => {
						if (alreadyPremium) {
							toast.error('You already own Premium for this season');
							return;
						}
						nextState = 2;
					}} disabled={alreadyPremium}>
					{$_('payment.recipent.self')}
				</Button>
				<Button
					variant="outline"
					class={`h-[70px] justify-start ${nextState == 1 ? 'border-white' : ''}`}
					on:click={() => {
						nextState = 1;
					}}>
					{$_('payment.recipent.friend')}
				</Button>
			</div>

			<Dialog.Footer>
				<Button variant="outline" on:click={() => (open = false)}>{$_('general.cancel')}</Button>
				<Button disabled={nextState == 0} on:click={() => (state = nextState)}>{$_('general.next')}</Button>
			</Dialog.Footer>

		{:else if state == 1}
			<Dialog.Header>
				<Dialog.Title>{$_('payment.gift.title')}</Dialog.Title>
			</Dialog.Header>

			<div>
				<PlayerSelector bind:value={giftTo} />
			</div>

			<Dialog.Footer>
				<Button variant="outline" on:click={() => (state = 0)}>{$_('general.back')}</Button>
				<Button disabled={!giftTo} on:click={() => (state = 2)}>{$_('general.next')}</Button>
			</Dialog.Footer>

		{:else}
			<Dialog.Header>
				<Dialog.Title class="flex items-center gap-3">
					<div class="flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
						<Crown class="h-6 w-6 text-primary-foreground" />
					</div>
					<span>{$_('battlepass.upgrade_to_premium')}</span>
				</Dialog.Title>
			</Dialog.Header>

			<div class="mt-4 flex flex-col gap-4">
				<p class="text-sm text-muted-foreground">{$_('battlepass.premium_description')}</p>

				<div class="rounded-lg border-2 p-4">
					<div class="mb-3 flex items-center justify-between">
						<span class="font-medium">{seasonTitle} {$_('battlepass.premium_pass')}</span>
						<span class="text-xl font-bold text-primary">{formatCurrency(PREMIUM_PRICE)}</span>
					</div>
					<ul class="space-y-2 text-sm text-muted-foreground">
						<li class="flex items-center gap-2">
							<Check class="h-4 w-4 flex-shrink-0 text-green-400" />
							<span>{$_('battlepass.premium_benefits.instant_rewards')}</span>
						</li>
						<li class="flex items-center gap-2">
							<Check class="h-4 w-4 flex-shrink-0 text-green-400" />
							<span>{$_('battlepass.premium_benefits.exclusive_items')}</span>
						</li>
						<li class="flex items-center gap-2">
							<Check class="h-4 w-4 flex-shrink-0 text-green-400" />
							<span>{$_('battlepass.premium_benefits.double_rewards')}</span>
						</li>
					</ul>
				</div>

				<div class="flex text-sm">
					<p>{$_('payment.review.recipent')}</p>
					<p class="ml-auto"><b>
						{#if giftTo}
							<a href="/player/{giftTo.uid}" class="text-blue-500 hover:underline">{giftTo.name}</a>
						{:else}
							<a href="/player/{$user.data.uid}" class="text-blue-500 hover:underline">{$user.data.name}</a>
						{/if}
					</b></p>
				</div>

				<p class="text-xs italic text-muted-foreground">{$_('payment.review.caution')}</p>
			</div>

			<Dialog.Footer class="mt-4 gap-2 sm:gap-0">
				<Button variant="outline" on:click={() => (state = 0)}>{$_('general.cancel')}</Button>
				<Button on:click={purchasePremium}>{$_('payment.review.proceed')}</Button>
			</Dialog.Footer>
		{/if}
	</Dialog.Content>
</Dialog.Root>
