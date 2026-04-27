<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { Button } from '$lib/components/ui/button';
	import { _ } from 'svelte-i18n';
	import { QrCode } from 'lucide-svelte';

	let showQR = false;
</script>

<Dialog.Root>
	<Dialog.Trigger>
		<Button>{$_('supporter.direct_donation')}</Button>
	</Dialog.Trigger>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>{$_('supporter.select_donate_method')}</Dialog.Title>
			<div class="flex items-center justify-center gap-[10px]">
				<Button
					variant="outline"
					class="flex h-[100px] w-[100px] flex-col"
					on:click={() => {
						showQR = true;
					}}
				>
					<QrCode size={50} />
					Bank QR
				</Button>
				<a href="https://ko-fi.com/geometrydashvn">
					<img
						class="mx-auto w-[200px]"
						src="https://cdn.prod.website-files.com/5c14e387dab576fe667689cf/670f5a02fcf48af59c591185_support_me_on_kofi_dark.png"
						alt="kofi"
					/>
				</a>
			</div>
			{#if showQR}
				<img src="https://cdn.gdvn.net/misc/bankqr.png" alt="qr" />
			{/if}
		</Dialog.Header>
	</Dialog.Content>
</Dialog.Root>
