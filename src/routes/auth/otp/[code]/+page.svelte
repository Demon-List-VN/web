<script lang="ts">
	import { toast } from 'svelte-sonner';
	import { user } from '$lib/client';
	import { page } from '$app/stores';
	import { _ } from 'svelte-i18n';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Separator } from '$lib/components/ui/separator';

	let loading = false;
	let granted = false;
	let error = '';

	async function grant() {
		if (!$user.loggedIn) {
			toast.error($_('otp.not_logged_in'));
			return;
		}

		loading = true;
		error = '';

		try {
			const res = await fetch(
				`${import.meta.env.VITE_API_URL}/auth/otp/${$page.params.code}`,
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
			} else {
				const data = await res.json().catch(() => null);
				error = data?.error || $_('otp.error');
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

<svelte:head>
	<title>{$_('otp.title')}</title>
</svelte:head>

<div class="flex min-h-[70vh] items-center justify-center px-4">
	<Card.Root class="w-full max-w-md">
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
			<div class="flex items-center gap-2">
				<span class="text-sm text-muted-foreground">{$_('otp.code_label')}</span>
				<Badge variant="outline" class="font-mono text-lg tracking-widest px-4 py-1">
					{$page.params.code}
				</Badge>
			</div>

			<Separator />

			{#if granted}
				<div class="flex flex-col items-center gap-2 py-2">
					<div class="flex h-10 w-10 items-center justify-center rounded-full bg-green-500/10">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="20"
							height="20"
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
					<p class="font-medium text-green-500">{$_('otp.granted')}</p>
				</div>
			{:else if !$user.checked}
				<p class="text-sm text-muted-foreground py-2">{$_('general.loading')}...</p>
			{:else if !$user.loggedIn}
				<p class="text-sm text-muted-foreground py-2">{$_('otp.not_logged_in')}</p>
			{:else}
				{#if error}
					<p class="text-sm text-destructive">{error}</p>
				{/if}
				<Button on:click={grant} disabled={loading} class="w-full">
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
	</Card.Root>
</div>
