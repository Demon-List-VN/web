<script lang="ts">
	import { onMount } from 'svelte';
	import Medal from '../medal.svelte';

	export let userID: string;

	let medals: any[] = [];

	onMount(async () => {
		const items = await (await fetch(`${import.meta.env.VITE_API_URL}/players/${userID}/medals`)).json();
		medals = items.filter((item: any) => item.type === 'medal');
	});
</script>

<div class="flex flex-wrap justify-center">
	{#each medals as medal}
		<Medal {medal} />
	{/each}
</div>
