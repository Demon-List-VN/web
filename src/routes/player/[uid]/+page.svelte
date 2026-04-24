<script lang="ts">
	import type { PageData } from './$types';
	import PlayerMainPage from './mainPage.svelte';

	export let data: PageData;
</script>


{#key data.player.uid}
	<PlayerMainPage {data} />
{/key}
