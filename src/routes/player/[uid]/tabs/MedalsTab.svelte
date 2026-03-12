<script lang="ts">
	import * as sdk from '$lib/client/sdk';
	import { onMount } from 'svelte';
	import Medal from '../medal.svelte';

	export let userID: string;

	let medals: any[] = [];

	onMount(async () => {
		medals = await (await sdk.fetch(`/players/${userID}/medals`)).json();
	});
</script>

<div class="flex flex-wrap justify-center">
	{#each medals as medal}
		<Medal {medal} />
	{/each}
</div>
