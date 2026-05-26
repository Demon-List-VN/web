<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { user } from '$lib/client';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Card from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Separator } from '$lib/components/ui/separator';
	import { _ } from 'svelte-i18n';
	import { toast } from 'svelte-sonner';

	export let initialCode = '';

	let code = initialCode;
	let loading = false;
	let granted = false;
	let error = '';

	$: code = code.replace(/\D/g, '')
		.slice(0, 6);
	$: normalizedCode = code.trim();
	$: canGrant = normalizedCode.length === 6 && $user.checked && $user.loggedIn
		&& !loading;

	function getLocalePrefix() {
		const match = $page.url.pathname.match(/^\/(en|vi)(?=\/|$)/);

		return match?.[0] ?? '';
	}

	function getGrantErrorMessage(message: unknown) {
		if (typeof message !== 'string') {
			return $_('otp.error');
		}

		const normalized = message.toLowerCase();

		if (
			normalized.includes('otp does not exists')
			|| normalized.includes('json object requested')
			|| normalized.includes('no rows')
		) {
			return $_('otp.not_found');
		}

		return message;
	}

	async function grant() {
		if (normalizedCode.length !== 6) {
			error = $_('otp.invalid_code');
			toast.error(error);

			return;
		}

		if (!$user.loggedIn) {
			toast.error($_('otp.not_logged_in'));

			return;
		}

		loading = true;
		error = '';

		try {
			const res = await fetch(
				`${import.meta.env.VITE_API_URL}/auth/otp/${normalizedCode}`,
				{
					method: 'PATCH',
					headers: {
						Authorization: 'Bearer ' + (await $user.token())!
					}
				}
			);

			if (res.ok) {
				granted = true;
				toast.success($_('otp.success'));

				const targetPath =
					`${getLocalePrefix()}/auth/otp/${normalizedCode}`;

				if ($page.url.pathname !== targetPath) {
					await goto(targetPath, { replaceState: true });
				}
			} else {
				const data = await res.json()
					.catch(() => null);
				error = getGrantErrorMessage(data?.error);
				toast.error(error);
			}
		} catch (err) {
			error = $_('otp.error');
			toast.error(error);
		} finally {
			loading = false;
		}
	}
</script>

<div class="flex min-h-[70vh] items-center justify-center px-4">
  <Card.Root class="w-full max-w-md">
    {#if granted}
      <Card.Header class="items-center text-center">
        <div class="mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="text-green-500"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <Card.Title class="text-2xl text-green-500">{
          $_('otp.success')
        }</Card.Title>
        <Card.Description>{$_('otp.granted')}</Card.Description>
      </Card.Header>
    {:else}
      <Card.Header class="items-center text-center">
        <div class="mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="text-primary"
          >
            <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>
        <Card.Title class="text-2xl">{$_('otp.title')}</Card.Title>
        <Card.Description>{$_('otp.description')}</Card.Description>
      </Card.Header>

      <Card.Content class="flex flex-col items-center gap-4">
        <div class="w-full space-y-2">
          <label class="text-sm font-medium" for="otp-code">{
            $_('otp.code_label')
          }</label>
          <Input
            id="otp-code"
            class="h-12 text-center font-mono text-lg tracking-widest"
            inputmode="numeric"
            autocomplete="one-time-code"
            placeholder="000000"
            bind:value={code}
            on:keydown={(event) => {
                if (event.key === 'Enter') {
                    grant();
                }
            }}
          />
        </div>

        <Separator />

        {#if !$user.checked}
          <p class="py-2 text-sm text-muted-foreground">
            {$_('general.loading')}...
          </p>
        {:else if !$user.loggedIn}
          <p class="py-2 text-sm text-muted-foreground">
            {$_('otp.not_logged_in')}
          </p>
        {:else}
          {#if error}
            <p class="text-sm text-destructive">{error}</p>
          {/if}
          <Button on:click={grant} disabled={!canGrant} class="w-full">
            {#if loading}
              <svg
                class="mr-2 h-4 w-4 animate-spin"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  class="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  stroke-width="4"
                />
                <path
                  class="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              {$_('otp.granting')}
            {:else}
              {$_('otp.grant')}
            {/if}
          </Button>
        {/if}
      </Card.Content>
    {/if}
  </Card.Root>
</div>
