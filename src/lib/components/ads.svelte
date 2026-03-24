<script lang="ts">
	import { onMount } from 'svelte';
	import { user } from '$lib/client/user';
	import { isActive } from '$lib/client/isSupporterActive';

	export let dataAdFormat = 'auto';
	export let unit = 'auto';
	let adPushed = false;

	$: hidden = $user.checked ? $user.loggedIn && isActive($user.data.supporterUntil) : true;

	function pushAd() {
		if (hidden || adPushed) {
			return;
		}

		adPushed = true;

		try {
			// @ts-expect-error
			(window.adsbygoogle = window.adsbygoogle || []).push({});
		} catch (err) {
			console.error('AdSense error:', err);
		}
	}

	onMount(() => {
		user.subscribe(() => {
			pushAd();
		});
	});
</script>

{#if !hidden}
	<ins
		class="adsbygoogle"
		style="display:block"
		data-ad-client="ca-pub-4605218533506777"
		data-ad-slot="7284584064"
		data-ad-format="auto"
		data-full-width-responsive="true"
	></ins>
{/if}
