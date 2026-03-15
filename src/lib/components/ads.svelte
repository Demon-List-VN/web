<script lang="ts">
	import { onMount } from 'svelte';

	export let dataAdFormat = 'auto';
	export let unit = 'auto';
	let adPushed = false;
	$: hidden = false;

	onMount(() => {
		if (!hidden && !adPushed) {
			adPushed = true;
			try {
				// @ts-expect-error
				(window.adsbygoogle = window.adsbygoogle || []).push({});
			} catch (err) {
				console.error('AdSense error:', err);
			}
		}
	});
</script>

{#if !hidden}
	{#if unit == 'auto'}
		<div class="text-center">
			<ins
				class="adsbygoogle ad"
				style="display:block"
				data-ad-client="ca-pub-4605218533506777"
				data-ad-slot="7284584064"
				data-ad-format={dataAdFormat}
				data-full-width-responsive="true"
			></ins>
		</div>
	{:else if unit == 'leaderboard'}
		<div class="text-center">
			<ins
				class="adsbygoogle ad"
				style="display:inline-block;width:728px;height:90px"
				data-ad-client="ca-pub-4605218533506777"
				data-ad-slot="1609368557"
			></ins>
		</div>
	{/if}
{/if}

<style>
	.ad {
		margin-inline: auto;
		margin-top: 20px;
		margin-bottom: 20px;
		width: 320px;
		max-width: 100%;
	}

	@media (min-width: 500px) {
		.ad {
			width: 468px;
		}
	}

	@media (min-width: 800px) {
		.ad {
			width: 728px;
		}
	}
</style>
