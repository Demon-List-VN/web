<script lang="ts">
	import { onMount } from 'svelte';

	export let userID: string;

	interface CardData {
		id: string;
		createdAt: string;
		supporterIncluded: number;
		owner: string;
		activationDate: string;
		name: string;
		img: string;
	}

	let cards: CardData[] = [];
	let loading = true;

	onMount(async () => {
		try {
			const response = await fetch(`${import.meta.env.VITE_API_URL}/players/${userID}/cards`);
			cards = await response.json();
		} catch (error) {
			console.error('Failed to fetch cards:', error);
		} finally {
			loading = false;
		}
	});
</script>

{#if loading}
	<div class="flex justify-center py-10">
		<p>Loading cards...</p>
	</div>
{:else if cards.length === 0}
	<div class="flex justify-center py-10">
		<p>No cards found</p>
	</div>
{:else}
	<div class="flex flex-wrap justify-center gap-4">
		{#each cards as card}
			<a href={`/card/${card.id}/scan`}>
				<div class="flex w-[400px] max-w-full flex-col gap-2">
					<div class="aspect-video w-full rounded-lg">
						<img
							class="relative z-10 w-full rounded-xl border border-opacity-50 shadow-md"
							src={card.img}
							alt={card.name}
						/>
					</div>
					<p class="text-center text-sm font-medium">{card.name}</p>
				</div>
			</a>
		{/each}
	</div>
{/if}

<style>
	/* Additional custom styles if needed */
</style>
