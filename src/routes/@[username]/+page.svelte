<script lang="ts">
	import type { PageData } from './$types';
	import PlayerMainPage from '../player/[uid]/mainPage.svelte';

	export let data: PageData;
</script>

{#key data}
  <PlayerMainPage {data} />
{/key}
