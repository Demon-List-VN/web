<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { Button } from '$lib/components/ui/button/index.js';

	export let open = false;

	function checkAndClose() {
		const bait = document.createElement('div');
		bait.className = 'ads adsbygoogle';
		bait.style.cssText = 'position:absolute;top:-999px;left:-999px;width:1px;height:1px;';
		document.body.appendChild(bait);
		setTimeout(() => {
			const blocked = bait.offsetHeight === 0 || getComputedStyle(bait).display === 'none';
			document.body.removeChild(bait);
			if (!blocked) {
				open = false;
			}
		}, 200);
	}
</script>

{#if open}
	<!-- Backdrop -->
	<div
		class="fixed inset-0 z-[9998] bg-black/60 backdrop-blur-sm"
		role="presentation"
	></div>

	<!-- Modal -->
	<div
		class="fixed inset-0 z-[9999] flex items-center justify-center p-4"
		role="presentation"
	>
		<div
			class="relative w-full max-w-md rounded-2xl border border-border bg-background p-6 shadow-2xl"
			role="dialog"
			aria-modal="true"
		>
			<div class="space-y-4 text-center">
				<div class="text-5xl">🚫</div>
				<h2 class="text-xl font-bold">{$_('adblock.title')}</h2>
				<p class="text-muted-foreground">{$_('adblock.desc')}</p>
				<Button class="w-full" on:click={checkAndClose}>
					{$_('adblock.button')}
				</Button>
			</div>
		</div>
	</div>
{/if}
