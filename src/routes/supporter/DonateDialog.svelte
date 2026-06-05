<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { Button, buttonVariants } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import { _ } from 'svelte-i18n';
	import { HeartHandshake } from 'lucide-svelte';
	import { user } from '$lib/client';
	import { toast } from 'svelte-sonner';
	import { get } from 'svelte/store';

	const quickAmounts = [5000, 10000, 50000, 100000, 200000, 500000, 1000000];

	let open = false;
	let amount = 10000;
	let message = '';
	let loading = false;

	$: normalizedAmount = Math.max(5000, Math.round(Number(amount) || 0));
	$: canDonate = $user.loggedIn && normalizedAmount >= 5000 && !loading;

	function formatPrice(value: number) {
		return value.toLocaleString('vi-VN');
	}

	async function donate() {
		if (!$user.loggedIn) {
			toast.error(get(_)('supporter.donation.login_required'));

			return;
		}

		loading = true;
		toast.loading(get(_)('toast.payment.redirect'));

		try {
			const response = await fetch(
				`${import.meta.env.VITE_API_URL}/donations/checkout`,
				{
					method: 'POST',
					headers: {
						Authorization: 'Bearer ' + (await $user.token()),
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({
						amount: normalizedAmount,
						message
					})
				}
			);
			const data = await response.json();

			if (!response.ok || !data.checkoutUrl) {
				throw new Error(data.message || 'Failed to create donation');
			}

			window.location.href = data.checkoutUrl;
		} catch (error) {
			toast.error(
				error instanceof Error
					? error.message
					: get(_)('supporter.donation.error')
			);
		} finally {
			loading = false;
		}
	}
</script>

<Dialog.Root bind:open>
  <Dialog.Trigger
    class={buttonVariants({ variant: 'outline' })}
    disabled={!$user.loggedIn}
  >
    {$_('supporter.direct_donation')}
  </Dialog.Trigger>
  <Dialog.Content class="donationDialog">
    <Dialog.Header>
      <Dialog.Title class="flex items-center gap-2">
        <HeartHandshake size={20} />
        {$_('supporter.donation.title')}
      </Dialog.Title>
      <Dialog.Description>{$_('supporter.donation.description')}</Dialog.Description>
    </Dialog.Header>

    <div class="donationBody">
      <div class="fieldGroup">
        <Label for="donation-amount">{$_('supporter.donation.amount')}</Label>
        <div class="amountInput">
          <Input
            id="donation-amount"
            type="number"
            min="5000"
            step="5000"
            bind:value={amount}
          />
          <span>VND</span>
        </div>
        <div class="quickAmounts">
          {#each quickAmounts as quickAmount}
            <Button
              type="button"
              variant={amount === quickAmount ? 'default' : 'outline'}
              size="sm"
              on:click={() => {
                  amount = quickAmount;
              }}
            >
              {formatPrice(quickAmount)}₫
            </Button>
          {/each}
        </div>
      </div>

      <div class="fieldGroup">
        <Label for="donation-message">{$_('supporter.donation.message')}</Label>
        <Textarea
          id="donation-message"
          maxlength="160"
          rows={4}
          placeholder={$_('supporter.donation.message_placeholder')}
          bind:value={message}
        />
        <p class="hint">
          {$_('supporter.donation.message_hint', {
              values: { count: message.length }
          })}
        </p>
      </div>
    </div>

    <Dialog.Footer>
      <Button variant="outline" on:click={() => (open = false)}>
        {$_('general.cancel')}
      </Button>
      <Button disabled={!canDonate} on:click={donate}>
        {loading
          ? $_('supporter.donation.processing')
          : $_('supporter.donation.proceed')}
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>

<style lang="scss">
:global(.donationDialog) {
  max-width: 460px;
}

.donationBody {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.fieldGroup {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.amountInput {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;

  span {
    color: hsl(var(--muted-foreground));
    font-size: 0.875rem;
    font-weight: 700;
  }
}

.quickAmounts {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.hint {
  color: hsl(var(--muted-foreground));
  font-size: 0.75rem;
  text-align: right;
}
</style>
